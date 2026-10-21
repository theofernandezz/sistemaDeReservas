import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
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

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { computeAvailableSlots } from '@/lib/availability'
import { sendAppointmentCancellationEmails, sendAppointmentRescheduleEmails } from '@/lib/email'
import { buildManageToken } from '@/lib/manage-token'
import {
  getAppointmentByToken,
  cancelAppointmentByToken,
  rescheduleAppointmentByToken,
} from '@/app/actions/manage-appointment'

type Result = { data: unknown; error: unknown }
interface TableCfg {
  select?: Result
  update?: Result
}

function createFakeDb(tables: Record<string, TableCfg>) {
  const builders = new Map<string, ReturnType<typeof build>>()

  function build(cfg: TableCfg) {
    let op: 'select' | 'update' = 'select'
    const q = {
      select: vi.fn(() => q),
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
          op === 'update' ? cfg.update ?? { data: [], error: null } : cfg.select ?? { data: null, error: null }
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

process.env.MANAGE_LINK_SECRET = 'test-secret-test-secret-test-secret-0123456789'
const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'
const TOKEN = buildManageToken(APPOINTMENT_ID, 1)
const HOUR = 60 * 60 * 1000
const business = { name: 'Salon', slug: 'salon', settings: { cancellationHours: 24, rescheduleHours: 24 } }

function appointmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID,
    status: 'confirmed',
    start_time: new Date(Date.now() + 72 * HOUR).toISOString(),
    end_time: new Date(Date.now() + 73 * HOUR).toISOString(),
    client_name: 'Ana Privada',
    client_email: 'ana@example.com',
    business_id: 'biz-1',
    service_id: 'svc-1',
    team_member_id: 'tm-1',
    addons: [],
    payment_status: null,
    payment_amount: null,
    google_event_id: null,
    reschedule_count: 0,
    rescheduled_from: null,
    manage_token_version: 1,
    service: { name: 'Corte', price: 10000, duration_minutes: 60 },
    ...overrides,
  }
}

function setup(tables: Partial<Record<'appointments' | 'businesses', TableCfg>>) {
  const db = createFakeDb({ businesses: { select: { data: business, error: null } }, ...tables })
  vi.mocked(createServiceClient).mockReturnValue(db.client as unknown as ReturnType<typeof createServiceClient>)
  return db
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('invalid or absent token', () => {
  const missing = [undefined, null, '', '   ', 'abc', APPOINTMENT_ID] as unknown as string[]

  it.each(missing)('view/cancel/reschedule reject token=%j with a generic error, no data and no DB access', async (token) => {
    const db = setup({ appointments: { select: { data: appointmentRow(), error: null } } })

    const results = [
      await getAppointmentByToken(token),
      await cancelAppointmentByToken({ token }),
      await rescheduleAppointmentByToken({ token, date: '2030-01-15', time: '10:00' }),
    ]

    for (const result of results) {
      expect(result).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
      expect(JSON.stringify(result)).not.toContain('Ana Privada')
    }
    expect(db.client.from).not.toHaveBeenCalled()
  })

  it('answers identically for a token whose appointment does not exist and for one with a wrong MAC', async () => {
    setup({ appointments: { select: { data: null, error: null } } })
    const notFound = await getAppointmentByToken(TOKEN)

    setup({ appointments: { select: { data: appointmentRow({ manage_token_version: 9 }), error: null } } })
    const wrongMac = await getAppointmentByToken(TOKEN)

    expect(wrongMac).toEqual(notFound)
  })

  it('reschedule with a token of an old version never checks availability, updates or mails', async () => {
    const db = setup({
      appointments: {
        select: { data: appointmentRow({ manage_token_version: 2 }), error: null },
        update: { data: [{ id: APPOINTMENT_ID }], error: null },
      },
    })

    const result = await rescheduleAppointmentByToken({ token: TOKEN, date: '2030-01-15', time: '10:00' })

    expect(result).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    expect(computeAvailableSlots).not.toHaveBeenCalled()
    expect(db.table('appointments').update).not.toHaveBeenCalled()
    expect(sendAppointmentRescheduleEmails).not.toHaveBeenCalled()
  })

  it('cancel with a token of an old version never updates or mails', async () => {
    const db = setup({
      appointments: {
        select: { data: appointmentRow({ manage_token_version: 2 }), error: null },
        update: { data: [{ id: APPOINTMENT_ID }], error: null },
      },
    })

    const result = await cancelAppointmentByToken({ token: TOKEN })

    expect(result).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
    expect(db.table('appointments').update).not.toHaveBeenCalled()
    expect(sendAppointmentCancellationEmails).not.toHaveBeenCalled()
  })
})

describe('valid token works without a client session (anon)', () => {
  it('view, cancel and reschedule only use the service client, never the session client', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    setup({
      appointments: {
        select: { data: appointmentRow(), error: null },
        update: { data: [{ id: APPOINTMENT_ID }], error: null },
      },
    })

    const view = await getAppointmentByToken(TOKEN)
    const reschedule = await rescheduleAppointmentByToken({ token: TOKEN, date: '2030-01-15', time: '10:00' })
    const cancel = await cancelAppointmentByToken({ token: TOKEN })

    expect(view.success).toBe(true)
    expect(reschedule.success).toBe(true)
    expect(cancel.success).toBe(true)
    expect(createServiceClient).toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })
})

describe('reschedule rules on the original appointment', () => {
  it.each([
    ['cancelled', 72],
    ['completed', 72],
    ['confirmed', -5], // original time already passed
  ])('rejects status=%s starting in %sh without checking slots or updating', async (status, hoursAhead) => {
    const db = setup({
      appointments: {
        select: {
          data: appointmentRow({ status, start_time: new Date(Date.now() + hoursAhead * HOUR).toISOString() }),
          error: null,
        },
      },
    })

    const result = await rescheduleAppointmentByToken({ token: TOKEN, date: '2030-01-15', time: '10:00' })

    expect(result).toMatchObject({ success: false, code: 'NOT_ALLOWED' })
    expect(computeAvailableSlots).not.toHaveBeenCalled()
    expect(db.table('appointments').update).not.toHaveBeenCalled()
  })

  it('does not leak raw DB errors on update failure', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([{ time: '10:00', available: true }])
    setup({
      appointments: {
        select: { data: appointmentRow(), error: null },
        update: { data: null, error: { code: '42501', message: 'permission denied for table appointments' } },
      },
    })

    const result = await rescheduleAppointmentByToken({ token: TOKEN, date: '2030-01-15', time: '10:00' })

    expect(result).toMatchObject({ success: false })
    expect(JSON.stringify(result)).not.toContain('permission denied')
    expect(sendAppointmentRescheduleEmails).not.toHaveBeenCalled()
  })
})
