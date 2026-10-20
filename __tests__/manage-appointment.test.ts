import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// after() needs a request scope: callbacks are queued (like after the response) and run on flushAfter()
const afterTasks: (() => Promise<unknown>)[] = []
vi.mock('next/server', () => ({
  after: (task: () => Promise<unknown>) => {
    afterTasks.push(task)
  },
}))
const flushAfter = async () => {
  await Promise.all(afterTasks.splice(0).map((task) => task()))
}
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/email', () => ({
  sendAppointmentCancellationEmails: vi.fn().mockResolvedValue({ success: true }),
  sendAppointmentRescheduleEmails: vi.fn().mockResolvedValue({ success: true }),
  sendManageLinkEmail: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/availability', () => ({ computeAvailableSlots: vi.fn() }))
vi.mock('@/lib/google-calendar', () => ({
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
  updateCalendarEvent: vi.fn().mockResolvedValue(undefined),
}))

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/utils/supabase/server'
import { computeAvailableSlots } from '@/lib/availability'
import {
  sendAppointmentCancellationEmails,
  sendAppointmentRescheduleEmails,
  sendManageLinkEmail,
} from '@/lib/email'
import { buildManageToken } from '@/lib/manage-token'
import {
  getAppointmentByToken,
  cancelAppointmentByToken,
  rescheduleAppointmentByToken,
  resendManageLink,
} from '@/app/actions/manage-appointment'

type Result = { data: unknown; error: unknown }

interface TableCfg {
  select?: Result
  update?: Result
  /** result of select(..., { count: 'exact', head: true }) */
  count?: number
}

function createFakeDb(tables: Record<string, TableCfg>) {
  const builders = new Map<string, ReturnType<typeof build>>()

  function build(cfg: TableCfg) {
    let op: 'select' | 'update' = 'select'
    let wantsCount = false
    const q = {
      select: vi.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
        wantsCount = !!opts?.count
        return q
      }),
      gte: vi.fn(() => q),
      insert: vi.fn(() => q),
      update: vi.fn((_values?: Record<string, unknown>) => {
        op = 'update'
        return q
      }),
      eq: vi.fn(() => q),
      in: vi.fn(() => q),
      or: vi.fn(() => q),
      maybeSingle: vi.fn(() => Promise.resolve(cfg.select ?? { data: null, error: null })),
      then: (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(
          wantsCount
            ? { data: null, error: null, count: cfg.count ?? 0 }
            : op === 'update'
            ? cfg.update ?? { data: [], error: null }
            : cfg.select ?? { data: null, error: null }
        ).then(resolve, reject),
    }
    return q
  }

  const client = {
    from: vi.fn((table: string) => {
      if (!builders.has(table)) builders.set(table, build(tables[table] ?? {}))
      return builders.get(table)!
    }),
  }
  return { client, table: (name: string) => client.from(name) }
}

const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'
process.env.MANAGE_LINK_SECRET = 'test-secret-test-secret-test-secret-0123456789'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const TOKEN = buildManageToken(APPOINTMENT_ID, 1)
const HOUR = 60 * 60 * 1000

function appointmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID,
    status: 'confirmed',
    start_time: new Date(Date.now() + 72 * HOUR).toISOString(),
    end_time: new Date(Date.now() + 73 * HOUR).toISOString(),
    client_name: 'Ana',
    client_email: 'ana@example.com',
    business_id: 'biz-1',
    service_id: 'svc-1',
    team_member_id: 'tm-1',
    addons: [{ duration_minutes: 15 }],
    payment_status: 'paid',
    payment_amount: 5000,
    google_event_id: null,
    reschedule_count: 0,
    rescheduled_from: null,
    manage_token_version: 1,
    service: { name: 'Corte', price: 10000, duration_minutes: 45 },
    ...overrides,
  }
}

const business = { name: 'Salon', slug: 'salon', settings: { cancellationHours: 24, rescheduleHours: 24 } }

function setup(tables: Partial<Record<'appointments' | 'businesses' | 'google_integrations' | 'manage_link_resends', TableCfg>>) {
  const db = createFakeDb({
    businesses: { select: { data: business, error: null } },
    ...tables,
  })
  vi.mocked(createServiceClient).mockReturnValue(db.client as unknown as ReturnType<typeof createServiceClient>)
  return db
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('token validation', () => {
  it('rejects a malformed token without touching the database', async () => {
    const db = setup({})
    const result = await getAppointmentByToken('not-a-token')
    expect(result).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    expect(db.client.from).not.toHaveBeenCalled()
  })

  it('returns a generic error (no data) when no appointment matches the token', async () => {
    setup({ appointments: { select: { data: null, error: null } } })
    const result = await getAppointmentByToken(TOKEN)
    expect(result).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    expect(JSON.stringify(result)).not.toContain('Ana')
  })

  it('rejects a token minted for another appointment (valid MAC, wrong id)', async () => {
    // Row returned for the id in the token, but token MAC belongs to another id
    const foreign = buildManageToken(OTHER_ID, 1)
    setup({ appointments: { select: { data: appointmentRow({ id: OTHER_ID, manage_token_version: 2 }), error: null } } })
    expect(await getAppointmentByToken(foreign)).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    // MAC of appointment A grafted onto appointment B's id
    const grafted = `${OTHER_ID}.${TOKEN.split('.')[1]}`
    setup({ appointments: { select: { data: appointmentRow({ id: OTHER_ID }), error: null } } })
    expect(await getAppointmentByToken(grafted)).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
  })

  it('rejects a token of another version, and bumping the version invalidates the link', async () => {
    setup({ appointments: { select: { data: appointmentRow({ manage_token_version: 1 }), error: null } } })
    expect((await getAppointmentByToken(TOKEN)).success).toBe(true)

    setup({ appointments: { select: { data: appointmentRow({ manage_token_version: 2 }), error: null } } })
    expect(await getAppointmentByToken(TOKEN)).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    expect((await getAppointmentByToken(buildManageToken(APPOINTMENT_ID, 2))).success).toBe(true)
  })

  it('rejects an altered token and never cancels with it', async () => {
    const [id, mac] = TOKEN.split('.')
    const tampered = `${id}.${mac.slice(0, -1)}${mac.endsWith('A') ? 'B' : 'A'}`
    const db = setup({ appointments: { select: { data: appointmentRow(), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } } })
    expect(await cancelAppointmentByToken({ token: tampered })).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    expect(db.table('appointments').update).not.toHaveBeenCalled()
  })

  it('looks the appointment up by the id embedded in the token', async () => {
    const db = setup({ appointments: { select: { data: appointmentRow(), error: null } } })
    await getAppointmentByToken(TOKEN)
    expect(db.table('appointments').eq).toHaveBeenCalledWith('id', APPOINTMENT_ID)
  })

  it('returns only the whitelisted view fields', async () => {
    setup({ appointments: { select: { data: appointmentRow(), error: null } } })
    const result = await getAppointmentByToken(TOKEN)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).not.toHaveProperty('client_email')
    expect(result.data).not.toHaveProperty('manage_token_version')
    expect(result.data).toMatchObject({ canCancel: true, canReschedule: true, businessSlug: 'salon' })
  })
})

describe('cancelAppointmentByToken', () => {
  it('cancels, records cancelled_at/cancelled_by and notifies with payment info', async () => {
    const db = setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } },
    })
    const result = await cancelAppointmentByToken({ token: TOKEN, reason: 'No puedo ir' })

    expect(result.success).toBe(true)
    expect(db.table('appointments').update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled', cancelled_by: 'client', cancelled_at: expect.any(String) })
    )
    expect(sendAppointmentCancellationEmails).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'paid', paymentAmount: 5000, reason: 'No puedo ir' })
    )
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('sends NO email and does NOT revalidate when the UPDATE affected no row', async () => {
    setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [], error: null } },
    })
    const result = await cancelAppointmentByToken({ token: TOKEN })

    expect(result).toMatchObject({ success: false })
    expect(sendAppointmentCancellationEmails).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    ['cancelled', 72],
    ['completed', 72],
    ['confirmed', -5], // past
    ['confirmed', 3], // inside the 24h window
  ])('rejects status=%s with start in %sh and never updates', async (status, hoursAhead) => {
    const db = setup({
      appointments: {
        select: { data: appointmentRow({ status, start_time: new Date(Date.now() + hoursAhead * HOUR).toISOString() }), error: null },
      },
    })
    const result = await cancelAppointmentByToken({ token: TOKEN })
    expect(result).toMatchObject({ success: false, code: 'NOT_ALLOWED' })
    expect(db.table('appointments').update).not.toHaveBeenCalled()
    expect(sendAppointmentCancellationEmails).not.toHaveBeenCalled()
  })

  it('does not leak raw DB errors', async () => {
    setup({
      appointments: {
        select: { data: appointmentRow(), error: null },
        update: { data: null, error: { code: '42501', message: 'permission denied for table appointments' } },
      },
    })
    const result = await cancelAppointmentByToken({ token: TOKEN })
    expect(JSON.stringify(result)).not.toContain('permission denied')
  })
})

describe('rescheduleAppointmentByToken', () => {
  const input = { token: TOKEN, date: '2030-01-15', time: '10:00' }

  it('uses the AR time, service+addons duration and the same availability logic', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    const db = setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } },
    })
    const result = await rescheduleAppointmentByToken(input)

    // 10:00 ART = 13:00 UTC; duration 45 + 15 addon = 60
    expect(result).toEqual({
      success: true,
      data: { startTime: '2030-01-15T13:00:00.000Z', endTime: '2030-01-15T14:00:00.000Z' },
    })
    expect(computeAvailableSlots).toHaveBeenCalledWith(
      expect.anything(), 'svc-1', '2030-01-15',
      expect.objectContaining({ teamMemberId: 'tm-1', excludeAppointmentId: APPOINTMENT_ID, durationMinutes: 60 })
    )
    expect(db.table('appointments').update).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '2030-01-15T13:00:00.000Z', end_time: '2030-01-15T14:00:00.000Z', reschedule_count: 1 })
    )
    expect(sendAppointmentRescheduleEmails).toHaveBeenCalledWith(expect.objectContaining({ manageToken: TOKEN }))
  })

  it.each([
    ['slot not offered (past / outside hours / other appointment)', []],
    ['slot blocked', [{ time: '10:00', available: false }]],
  ])('rejects when %s', async (_label, slots) => {
    vi.mocked(computeAvailableSlots).mockResolvedValue(slots)
    const db = setup({ appointments: { select: { data: appointmentRow(), error: null } } })
    const result = await rescheduleAppointmentByToken(input)
    expect(result).toMatchObject({ success: false, code: 'SLOT_UNAVAILABLE' })
    expect(db.table('appointments').update).not.toHaveBeenCalled()
    expect(sendAppointmentRescheduleEmails).not.toHaveBeenCalled()
  })

  it('rejects inside the reschedule window of the ORIGINAL time', async () => {
    const db = setup({
      appointments: { select: { data: appointmentRow({ start_time: new Date(Date.now() + 2 * HOUR).toISOString() }), error: null } },
    })
    const result = await rescheduleAppointmentByToken(input)
    expect(result).toMatchObject({ success: false, code: 'NOT_ALLOWED' })
    expect(computeAvailableSlots).not.toHaveBeenCalled()
    expect(db.table('appointments').update).not.toHaveBeenCalled()
  })

  it('treats rescheduleHours=0 as valid (not coerced to 24)', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    setup({
      appointments: {
        select: { data: appointmentRow({ start_time: new Date(Date.now() + 2 * HOUR).toISOString() }), error: null },
        update: { data: [{ id: APPOINTMENT_ID }], error: null },
      },
      businesses: { select: { data: { ...business, settings: { rescheduleHours: 0 } }, error: null } },
    })
    const result = await rescheduleAppointmentByToken(input)
    expect(result.success).toBe(true)
  })

  it('sends no email when the UPDATE affected no row', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [], error: null } },
    })
    const result = await rescheduleAppointmentByToken(input)
    expect(result).toMatchObject({ success: false })
    expect(sendAppointmentRescheduleEmails).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('validates date/time format', async () => {
    const db = setup({})
    const result = await rescheduleAppointmentByToken({ token: TOKEN, date: '15/01/2030', time: '10:00' })
    expect(result).toMatchObject({ success: false, code: 'VALIDATION_ERROR' })
    expect(db.client.from).not.toHaveBeenCalled()
  })
})

describe('resendManageLink', () => {
  const identical = { success: true, data: undefined }

  it('emails the CURRENT link (same version, no rotation) only to the registered client_email', async () => {
    const db = setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } },
    })
    const result = await resendManageLink({ appointmentId: APPOINTMENT_ID })

    expect(result).toEqual(identical)
    await flushAfter()
    expect(sendManageLinkEmail).toHaveBeenCalledTimes(1)
    expect(db.table('manage_link_resends').insert).toHaveBeenCalledWith({ appointment_id: APPOINTMENT_ID })
    const call = vi.mocked(sendManageLinkEmail).mock.calls[0][0]
    expect(call.clientEmail).toBe('ana@example.com')
    expect(call.manageToken).toBe(TOKEN)
    const stored = db.table('appointments').update.mock.calls[0][0] as Record<string, unknown>
    expect(stored).not.toHaveProperty('manage_token_version')
    expect(stored).toHaveProperty('manage_link_sent_at')
  })

  it('returns the identical response when the appointment does not exist', async () => {
    setup({ appointments: { select: { data: null, error: null } } })
    const result = await resendManageLink({ appointmentId: APPOINTMENT_ID })
    expect(result).toEqual(identical)
    await flushAfter()
    expect(sendManageLinkEmail).not.toHaveBeenCalled()
  })

  it('returns the identical response and sends nothing when rate limited', async () => {
    setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [], error: null } },
    })
    const result = await resendManageLink({ appointmentId: APPOINTMENT_ID })
    expect(result).toEqual(identical)
    await flushAfter()
    expect(sendManageLinkEmail).not.toHaveBeenCalled()
  })

  it('sends nothing for cancelled or past appointments', async () => {
    setup({ appointments: { select: { data: appointmentRow({ status: 'cancelled' }), error: null } } })
    expect(await resendManageLink({ appointmentId: APPOINTMENT_ID })).toEqual(identical)
    await flushAfter()
    expect(sendManageLinkEmail).not.toHaveBeenCalled()
  })

  it('responds immediately without touching the DB; ALL the work runs when after() is flushed', async () => {
    const db = setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } },
    })
    afterTasks.length = 0
    const result = await resendManageLink({ appointmentId: APPOINTMENT_ID })

    expect(result).toEqual(identical)
    expect(afterTasks).toHaveLength(1)
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(db.client.from).not.toHaveBeenCalled()
    expect(sendManageLinkEmail).not.toHaveBeenCalled()

    await flushAfter()
    expect(db.client.from).toHaveBeenCalled()
    expect(db.table('appointments').update).toHaveBeenCalled()
    expect(sendManageLinkEmail).toHaveBeenCalledTimes(1)
  })

  it('same immediate response and one deferred task whether or not the appointment exists', async () => {
    setup({ appointments: { select: { data: null, error: null } } })
    afterTasks.length = 0
    expect(await resendManageLink({ appointmentId: APPOINTMENT_ID })).toEqual(identical)
    expect(afterTasks).toHaveLength(1)
    await flushAfter()
    expect(sendManageLinkEmail).not.toHaveBeenCalled()
  })

  it('enforces a global hourly cap (identical response, no email, per-appointment cooldown untouched)', async () => {
    const db = setup({
      appointments: {
        select: { data: appointmentRow(), error: null },
        update: { data: [{ id: APPOINTMENT_ID }], error: null },
      },
      manage_link_resends: { count: 100 },
    })
    afterTasks.length = 0
    const result = await resendManageLink({ appointmentId: APPOINTMENT_ID })
    expect(result).toEqual(identical)
    await flushAfter()
    expect(sendManageLinkEmail).not.toHaveBeenCalled()
    expect(db.table('appointments').update).not.toHaveBeenCalled()
  })

  it('still sends when the global count is just under the cap', async () => {
    setup({
      appointments: {
        select: { data: appointmentRow(), error: null },
        update: { data: [{ id: APPOINTMENT_ID }], error: null },
      },
      manage_link_resends: { count: 99 },
    })
    await resendManageLink({ appointmentId: APPOINTMENT_ID })
    await flushAfter()
    expect(sendManageLinkEmail).toHaveBeenCalledTimes(1)
  })
})

describe('appointments without a team member (F3)', () => {
  it('reschedule checks overlap against ALL business appointments when team_member_id is null', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    setup({
      appointments: { select: { data: appointmentRow({ team_member_id: null }), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } },
    })
    await rescheduleAppointmentByToken({ token: TOKEN, date: '2030-01-15', time: '10:00' })
    expect(computeAvailableSlots).toHaveBeenCalledWith(
      expect.anything(), 'svc-1', '2030-01-15',
      expect.objectContaining({ blockOnAnyAppointment: true, excludeAppointmentId: APPOINTMENT_ID })
    )
  })

  it('does not widen the check when the appointment has a team member', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    setup({
      appointments: { select: { data: appointmentRow(), error: null }, update: { data: [{ id: APPOINTMENT_ID }], error: null } },
    })
    await rescheduleAppointmentByToken({ token: TOKEN, date: '2030-01-15', time: '10:00' })
    expect(computeAvailableSlots).toHaveBeenCalledWith(
      expect.anything(), 'svc-1', '2030-01-15',
      expect.objectContaining({ blockOnAnyAppointment: false })
    )
  })
})
