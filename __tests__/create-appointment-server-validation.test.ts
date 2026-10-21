// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({ getCurrentBusiness: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendNewAppointmentNotification: vi.fn().mockResolvedValue({ success: true }),
  sendClientConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendManualTransferPendingEmail: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/google-calendar', () => ({ createCalendarEvent: vi.fn() }))
vi.mock('@/lib/mercadopago', () => ({
  createPaymentPreference: vi.fn().mockResolvedValue({ id: 'pref-1', init_point: 'https://mp.test/pay' }),
}))

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { createPaymentPreference } from '@/lib/mercadopago'
import { buildManageToken } from '@/lib/manage-token'
import { createAppointment } from '@/app/actions'
import { createBookingPaymentPreference, createPendingBookingPreference } from '@/app/actions/payments'

const SERVICE_ID = '44444444-4444-4444-8444-444444444444'
const MEMBER_ID = '99999999-9999-4999-8999-999999999999'
const MEMBER_2_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ADDON_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const APPOINTMENT_ID = '66666666-6666-4666-8666-666666666666'
const OWNER_ID = 'owner-1'
const MANAGE_SECRET = 'test-secret-test-secret-test-secret-0123456789'

const ADDON = { id: ADDON_ID, name: 'Extra', price: 2000, duration_minutes: 30 }
const SERVICE_PRICE = 10000
const SERVICE_MINUTES = 60

const TRANSFER_SETTINGS = {
  paymentFlowMode: 'manual_transfer',
  manualTransfer: { enabled: true, alias: 'a.b.c', cvu: '0000000000000000000000', accountHolder: 'Ana' },
}

interface BusyRow {
  start_time: string
  end_time: string
  team_member_id: string | null
}

interface World {
  user: { id: string } | null
  settings: Record<string, unknown>
  hasMP: boolean
  schedule: { startTime: string; endTime: string }
  busy: BusyRow[]
  memberIds: string[]
  appointmentOverrides: Record<string, unknown>
  blocked: { start_time: string; end_time: string; reason?: string }[]
  addons: typeof ADDON[]
  inserts: Record<string, Record<string, unknown>[]>
  eqCalls: Record<string, [string, unknown][]>
}

function newWorld(overrides: Partial<World> = {}): World {
  return {
    user: null,
    settings: {},
    hasMP: false,
    schedule: { startTime: '00:00', endTime: '24:00' },
    busy: [],
    memberIds: [MEMBER_ID],
    appointmentOverrides: {},
    blocked: [],
    addons: [ADDON],
    inserts: {},
    eqCalls: {},
    ...overrides,
  }
}

/** Fake DB that drives the REAL computeAvailableSlots: filters are recorded, rows are canned per table. */
function installWorld(world: World): void {
  const weekly = Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((day) => [String(day), { isOpen: true, ...world.schedule, breaks: [] }])
  )
  const members = world.memberIds.map((id) => ({ id, slot_interval: 30, buffer_time: 0, weekly_schedule: weekly }))
  const businessRow = {
    owner_id: OWNER_ID,
    settings: world.settings,
    deposit_percentage: 30,
    name: 'Salon',
    slug: 'salon',
  }

  function table(name: string) {
    let inserted = false
    let eqId: unknown = null
    const q = {
      select: () => q,
      update: () => q,
      neq: () => q,
      order: () => q,
      or: () => q,
      in: () => q,
      gte: () => q,
      lte: () => q,
      eq: (column: string, value: unknown) => {
        ;(world.eqCalls[name] ??= []).push([column, value])
        if (column === 'id') eqId = value
        return q
      },
      insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        inserted = true
        ;(world.inserts[name] ??= []).push(...(Array.isArray(rows) ? rows : [rows]))
        return q
      },
      single: () => {
        const data: Record<string, unknown> | null = (() => {
          switch (name) {
            case 'services':
              return {
                id: SERVICE_ID,
                business_id: 'biz-1',
                name: 'Corte',
                price: SERVICE_PRICE,
                duration_minutes: SERVICE_MINUTES,
                businesses: { deposit_percentage: 30, name: 'Salon', slug: 'salon' },
              }
            case 'businesses':
              return businessRow
            case 'mp_integrations':
              return world.hasMP ? { id: 'mp-1', access_token: 'mp-token' } : null
            case 'team_members':
              return members.find((m) => m.id === eqId) ?? members[0]
            case 'appointments':
              return inserted
                ? { id: APPOINTMENT_ID, manage_token_version: 1 }
                : {
                    id: APPOINTMENT_ID,
                    manage_token_version: 1,
                    addons: [ADDON],
                    service: { name: 'Corte', price: SERVICE_PRICE, business_id: 'biz-1' },
                    ...world.appointmentOverrides,
                  }
            default:
              return null
          }
        })()
        return Promise.resolve({ data, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null }) => unknown, reject: (e: unknown) => unknown) => {
        const data: unknown = (() => {
          switch (name) {
            case 'blocked_slots':
              return world.blocked
            case 'team_members':
              return members
            case 'service_addons':
              return world.addons
            case 'appointments':
              return []
            default:
              return null
          }
        })()
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      },
    }
    return q
  }

  const db = {
    from: (name: string) => table(name),
    rpc: async () => ({ data: world.busy, error: null }),
  }
  vi.mocked(createClient).mockResolvedValue({
    ...db,
    auth: { getUser: async () => ({ data: { user: world.user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
}

/** 10:00 Argentina time, 3 days from now (13:00 UTC). */
function startAt(hourART = 10, minute = 0, daysAhead = 3): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, hourART + 3, minute))
}

const input = (overrides: Record<string, unknown> = {}) => ({
  service_id: SERVICE_ID,
  start_time: startAt().toISOString(),
  client_name: 'Ana',
  client_phone: '1122334455',
  client_email: 'ana@example.com',
  team_member_id: MEMBER_ID,
  ...overrides,
})

function onlyInsert(world: World, tableName: string): Record<string, unknown> {
  const rows = world.inserts[tableName] ?? []
  expect(rows).toHaveLength(1)
  return rows[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  process.env.MANAGE_LINK_SECRET = MANAGE_SECRET
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
})

describe('createAppointment - status and payment_status are decided by the server', () => {
  const spoofed = { status: 'confirmed', payment_status: 'paid' }

  it('anon on a business without payments: ignores the spoofed values (confirmed, no payment)', async () => {
    const world = newWorld()
    installWorld(world)

    const result = await createAppointment(input({ status: 'cancelled', payment_status: 'paid' }) as never)

    expect(result.success).toBe(true)
    const row = onlyInsert(world, 'appointments')
    expect(row.status).toBe('confirmed')
    expect(row.payment_status).toBeNull()
  })

  it('anon on a manual-transfer business: confirmed + payment pending even if the client sends confirmed/paid', async () => {
    const world = newWorld({ settings: TRANSFER_SETTINGS })
    installWorld(world)

    const result = await createAppointment(input(spoofed) as never)

    expect(result.success).toBe(true)
    const row = onlyInsert(world, 'appointments')
    expect(row.status).toBe('confirmed')
    expect(row.payment_status).toBe('pending')
    expect(row.proof_expires_at).toEqual(expect.any(String))
  })

  it('anon on an MP business: pending (awaiting payment), never paid', async () => {
    const world = newWorld({ hasMP: true })
    installWorld(world)

    const result = await createAppointment(input(spoofed) as never)

    expect(result.success).toBe(true)
    const row = onlyInsert(world, 'appointments')
    expect(row.status).toBe('pending')
    expect(row.payment_status).toBeNull()
  })

  it('an authenticated user who is NOT the business owner gets no override either', async () => {
    const world = newWorld({ user: { id: 'someone-else' }, settings: TRANSFER_SETTINGS })
    installWorld(world)

    await createAppointment(input(spoofed) as never)

    const row = onlyInsert(world, 'appointments')
    expect(row.status).toBe('confirmed')
    expect(row.payment_status).toBe('pending')
  })

  it('the authenticated owner can create a manual confirmed appointment', async () => {
    const world = newWorld({ user: { id: OWNER_ID }, settings: TRANSFER_SETTINGS })
    installWorld(world)

    const result = await createAppointment(input({ status: 'confirmed' }) as never)

    expect(result.success).toBe(true)
    const row = onlyInsert(world, 'appointments')
    expect(row.status).toBe('confirmed')
    expect(row.payment_status).toBeNull()
  })
})

describe('createAppointment - end_time is computed from the DB', () => {
  it('end = start + service + add-ons; a client end_time and addon prices change nothing', async () => {
    const world = newWorld()
    installWorld(world)
    const start = startAt()

    const result = await createAppointment(
      input({
        end_time: new Date(start.getTime() + 5 * 60_000).toISOString(),
        addon_ids: [ADDON_ID],
        addons: [{ id: ADDON_ID, name: 'x', price: 0, duration_minutes: 0 }],
      }) as never
    )

    expect(result.success).toBe(true)
    const row = onlyInsert(world, 'appointments')
    expect(row.end_time).toBe(new Date(start.getTime() + (SERVICE_MINUTES + ADDON.duration_minutes) * 60_000).toISOString())
    expect(row.addons).toEqual([ADDON])
  })

  it('without add-ons, end = start + service duration', async () => {
    const world = newWorld()
    installWorld(world)
    const start = startAt()

    await createAppointment(input() as never)

    expect(onlyInsert(world, 'appointments').end_time).toBe(new Date(start.getTime() + SERVICE_MINUTES * 60_000).toISOString())
  })
})

describe('createAppointment - slot rules are enforced on the server', () => {
  async function expectRejected(world: World, overrides: Record<string, unknown> = {}) {
    installWorld(world)
    const result = await createAppointment(input(overrides) as never)
    expect(result.success).toBe(false)
    expect(world.inserts.appointments ?? []).toHaveLength(0)
  }

  it('rejects a start outside business hours', async () => {
    await expectRejected(newWorld({ schedule: { startTime: '12:00', endTime: '20:00' } }))
  })

  it('rejects a slot that ends after closing (service + add-on)', async () => {
    // 17:30 + 60 + 30 min = 19:00 > 18:00
    await expectRejected(newWorld({ schedule: { startTime: '09:00', endTime: '18:00' } }), {
      start_time: startAt(17, 30).toISOString(),
      addon_ids: [ADDON_ID],
    })
  })

  it('rejects a blocked slot', async () => {
    const start = startAt()
    await expectRejected(
      newWorld({ blocked: [{ start_time: start.toISOString(), end_time: new Date(start.getTime() + 3_600_000).toISOString() }] })
    )
  })

  it('rejects an overlapping appointment', async () => {
    const start = startAt()
    await expectRejected(
      newWorld({ busy: [{ start_time: start.toISOString(), end_time: new Date(start.getTime() + 3_600_000).toISOString(), team_member_id: MEMBER_ID }] })
    )
  })

  it('rejects a start before minAdvanceHours', async () => {
    await expectRejected(newWorld({ settings: { minAdvanceHours: 100 } }))
  })

  it('rejects a start after maxAdvanceDays', async () => {
    await expectRejected(newWorld({ settings: { maxAdvanceDays: 2 } }))
  })

  it('accepts the same slot when nothing is in the way (control)', async () => {
    const world = newWorld({ settings: { minAdvanceHours: 1, maxAdvanceDays: 10 } })
    installWorld(world)
    expect((await createAppointment(input() as never)).success).toBe(true)
  })
})

describe('createAppointment - "any professional"', () => {
  const noMember = () => input({ team_member_id: null })
  const busyFor = (memberId: string): BusyRow => {
    const start = startAt()
    return { start_time: start.toISOString(), end_time: new Date(start.getTime() + 3_600_000).toISOString(), team_member_id: memberId }
  }

  it('accepts the slot when only member 2 is free and assigns member 2', async () => {
    const world = newWorld({ memberIds: [MEMBER_ID, MEMBER_2_ID], busy: [busyFor(MEMBER_ID)] })
    installWorld(world)

    const result = await createAppointment(noMember() as never)

    expect(result.success).toBe(true)
    expect(onlyInsert(world, 'appointments').team_member_id).toBe(MEMBER_2_ID)
  })

  it('picks the lowest member id when several are free (deterministic)', async () => {
    const world = newWorld({ memberIds: [MEMBER_2_ID, MEMBER_ID] })
    installWorld(world)

    await createAppointment(noMember() as never)

    expect(onlyInsert(world, 'appointments').team_member_id).toBe(MEMBER_ID)
  })

  it('rejects when every member is busy', async () => {
    const world = newWorld({ memberIds: [MEMBER_ID, MEMBER_2_ID], busy: [busyFor(MEMBER_ID), busyFor(MEMBER_2_ID)] })
    installWorld(world)

    const result = await createAppointment(noMember() as never)

    expect(result.success).toBe(false)
    expect(world.inserts.appointments ?? []).toHaveLength(0)
  })
})

describe('add-ons are validated against the DB', () => {
  it('a missing / inactive / foreign add-on (not returned for this business + active) is a validation error', async () => {
    const world = newWorld({ addons: [] })
    installWorld(world)

    const result = await createAppointment(input({ addon_ids: [ADDON_ID] }) as never)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/extras/i)
    expect(world.inserts.appointments ?? []).toHaveLength(0)
  })

  it('looks add-ons up scoped to the service business and active only', async () => {
    const world = newWorld()
    installWorld(world)

    await createAppointment(input({ addon_ids: [ADDON_ID] }) as never)

    expect(world.eqCalls.service_addons).toEqual(
      expect.arrayContaining([
        ['business_id', 'biz-1'],
        ['is_active', true],
      ])
    )
  })

  it('rejects a non-uuid add-on id before touching the DB', async () => {
    const world = newWorld()
    installWorld(world)

    const result = await createAppointment(input({ addon_ids: ['nope'] }) as never)

    expect(result.success).toBe(false)
    expect(createServiceClient).not.toHaveBeenCalled()
  })
})

describe('createBookingPaymentPreference - amount is computed on the server', () => {
  const token = () => buildManageToken(APPOINTMENT_ID, 1)
  const unitPrice = () => vi.mocked(createPaymentPreference).mock.calls[0][1][0].unit_price

  it("'deposit' charges deposit_percentage of service + stored add-ons", async () => {
    installWorld(newWorld({ hasMP: true }))

    const result = await createBookingPaymentPreference(token(), 'deposit')

    expect(result.success).toBe(true)
    expect(unitPrice()).toBe(Math.round((SERVICE_PRICE + ADDON.price) * 0.3))
  })

  it("'full' charges the whole total", async () => {
    installWorld(newWorld({ hasMP: true }))

    await createBookingPaymentPreference(token(), 'full')

    expect(unitPrice()).toBe(SERVICE_PRICE + ADDON.price)
  })

  it('rejects an unknown option and has no client amount parameter', async () => {
    installWorld(newWorld({ hasMP: true }))

    const result = await createBookingPaymentPreference(token(), 'free' as never)

    expect(result.success).toBe(false)
    expect(createPaymentPreference).not.toHaveBeenCalled()
    expect(createBookingPaymentPreference.length).toBe(2)
  })
})

describe('createBookingPaymentPreference - appointment state guard', () => {
  it.each([
    ['cancelled', { status: 'cancelled' }],
    ['already paid', { payment_status: 'paid' }],
    ['proof under review', { payment_status: 'pending_confirmation' }],
  ])('rejects a %s appointment without charging or writing', async (_label, overrides) => {
    const world = newWorld({ hasMP: true, appointmentOverrides: overrides })
    installWorld(world)

    const result = await createBookingPaymentPreference(buildManageToken(APPOINTMENT_ID, 1), 'full')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/pago/i)
    expect(createPaymentPreference).not.toHaveBeenCalled()
    expect(world.inserts).toEqual({})
  })
})

describe('createPendingBookingPreference - add-ons and money come from the DB', () => {
  const pending = (overrides: Record<string, unknown> = {}) => ({
    serviceId: SERVICE_ID,
    startTime: startAt().toISOString(),
    clientName: 'Ana',
    clientPhone: '1122334455',
    clientEmail: 'ana@example.com',
    addonIds: [ADDON_ID],
    teamMemberId: MEMBER_ID,
    paymentMethod: 'deposit' as const,
    ...overrides,
  })

  it('ignores client add-on prices/durations/amount/end time', async () => {
    const world = newWorld({ hasMP: true })
    installWorld(world)
    const start = startAt()

    const result = await createPendingBookingPreference(
      pending({
        addons: [{ id: ADDON_ID, name: 'x', price: 1, duration_minutes: 0 }],
        paymentAmount: 1,
        endTime: new Date(start.getTime() + 60_000).toISOString(),
      }) as never
    )

    expect(result.success).toBe(true)
    const row = onlyInsert(world, 'pending_bookings')
    expect(row.addons).toEqual([ADDON])
    expect(row.payment_amount).toBe(Math.round((SERVICE_PRICE + ADDON.price) * 0.3))
    expect(row.end_time).toBe(new Date(start.getTime() + (SERVICE_MINUTES + ADDON.duration_minutes) * 60_000).toISOString())
    expect(vi.mocked(createPaymentPreference).mock.calls[0][1][0].unit_price).toBe(row.payment_amount)
  })

  it("'full' charges the whole total and a non-existent add-on is rejected", async () => {
    const full = newWorld({ hasMP: true })
    installWorld(full)
    await createPendingBookingPreference(pending({ paymentMethod: 'full' }))
    expect(onlyInsert(full, 'pending_bookings').payment_amount).toBe(SERVICE_PRICE + ADDON.price)

    const missing = newWorld({ hasMP: true, addons: [] })
    installWorld(missing)
    const result = await createPendingBookingPreference(pending())
    expect(result.success).toBe(false)
    expect(missing.inserts.pending_bookings ?? []).toHaveLength(0)
  })

  it('applies the slot rules too (blocked slot is rejected before any insert)', async () => {
    const start = startAt()
    const world = newWorld({
      hasMP: true,
      blocked: [{ start_time: start.toISOString(), end_time: new Date(start.getTime() + 3_600_000).toISOString() }],
    })
    installWorld(world)

    const result = await createPendingBookingPreference(pending())

    expect(result.success).toBe(false)
    expect(world.inserts.pending_bookings ?? []).toHaveLength(0)
  })
})
