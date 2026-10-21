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
// Slot validation has its own tests (create-appointment-server-validation.test.ts): every slot is open here
vi.mock('@/lib/availability', () => ({
  computeAvailableSlots: vi.fn(async () =>
    Array.from({ length: 24 * 60 }, (_, i) => ({
      time: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
      available: true,
    }))
  ),
}))

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { sendClientConfirmation, sendManualTransferPendingEmail, sendNewAppointmentNotification } from '@/lib/email'
import { buildManageToken, verifyManageToken } from '@/lib/manage-token'
import { createAppointment } from '@/app/actions'

const SERVICE_ID = '44444444-4444-4444-8444-444444444444'
const CREATED_ID = '55555555-5555-4555-8555-555555555555'
const MANAGE_SECRET = 'test-secret-test-secret-test-secret-0123456789'

type Result = { data: unknown; error: unknown }

const TRANSFER_SETTINGS = {
  paymentFlowMode: 'manual_transfer',
  manualTransfer: { enabled: true, alias: 'a.b.c', cvu: '0000000000000000000000', accountHolder: 'Ana' },
}

function setupDb(createdVersion: number | undefined, businessSettings: Record<string, unknown> = {}) {
  const inserted: Record<string, unknown>[] = []
  const createdRow = {
    id: CREATED_ID,
    ...(createdVersion === undefined ? {} : { manage_token_version: createdVersion }),
  }

  function table(name: string) {
    let op: 'select' | 'insert' = 'select'
    const q = {
      select: vi.fn(() => q),
      insert: vi.fn((rows: Record<string, unknown>[]) => {
        op = 'insert'
        inserted.push(...rows)
        return q
      }),
      update: vi.fn(() => q),
      eq: vi.fn(() => q),
      neq: vi.fn(() => q),
      or: vi.fn(() => q),
      single: vi.fn((): Promise<Result> => {
        if (name === 'services') {
          return Promise.resolve({
            data: { id: SERVICE_ID, business_id: 'biz-1', name: 'Corte', price: 100, duration_minutes: 60 },
            error: null,
          })
        }
        if (name === 'businesses') return Promise.resolve({ data: { settings: businessSettings }, error: null })
        if (name === 'appointments' && op === 'insert') return Promise.resolve({ data: createdRow, error: null })
        return Promise.resolve({ data: null, error: null })
      }),
      // overlap check: no existing appointments
      then: (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject),
    }
    return q
  }

  vi.mocked(createClient).mockResolvedValue({
    from: (name: string) => table(name),
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as unknown as Awaited<
    ReturnType<typeof createClient>
  >)
  vi.mocked(createServiceClient).mockReturnValue({ from: (name: string) => table(name) } as unknown as ReturnType<
    typeof createServiceClient
  >)
  return { inserted }
}

const futureStart = () => new Date(Date.now() + 72 * 60 * 60 * 1000)
const input = (overrides: Record<string, unknown> = {}) => ({
  service_id: SERVICE_ID,
  start_time: futureStart().toISOString(),
  end_time: new Date(futureStart().getTime() + 60 * 60 * 1000).toISOString(),
  team_member_id: '99999999-9999-4999-8999-999999999999',
  client_name: 'Ana',
  client_phone: '1122334455',
  client_email: 'ana@example.com',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  process.env.MANAGE_LINK_SECRET = MANAGE_SECRET
})

describe('createAppointment - client manage link', () => {
  it('returns a token valid for the created id + version and puts it in the client confirmation', async () => {
    setupDb(2)

    const result = await createAppointment(input())

    expect(result.success).toBe(true)
    if (!result.success || !result.data) throw new Error('expected success')
    expect(result.data.manage_token).toBe(buildManageToken(CREATED_ID, 2))
    expect(verifyManageToken(result.data.manage_token!, CREATED_ID, 2)).toBe(true)
    expect(verifyManageToken(result.data.manage_token!, CREATED_ID, 1)).toBe(false)
    expect(sendClientConfirmation).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendClientConfirmation).mock.calls[0][0].manageToken).toBe(result.data.manage_token)
  })

  it('uses the same token in the manual-transfer pending email', async () => {
    setupDb(1, TRANSFER_SETTINGS)

    const result = await createAppointment(input())

    expect(result.success).toBe(true)
    expect(sendClientConfirmation).not.toHaveBeenCalled()
    expect(sendManualTransferPendingEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendManualTransferPendingEmail).mock.calls[0][0].manageToken).toBe(buildManageToken(CREATED_ID, 1))
  })

  it('does not store any token in the INSERT', async () => {
    const { inserted } = setupDb(1)

    await createAppointment(input())

    expect(inserted).toHaveLength(1)
    expect(Object.keys(inserted[0]).filter((key) => /token|mac|secret/i.test(key))).toEqual([])
    expect(sendNewAppointmentNotification).toHaveBeenCalledTimes(1)
  })

  it('never returns or mails a link when MANAGE_LINK_SECRET is missing, but the booking still succeeds', async () => {
    delete process.env.MANAGE_LINK_SECRET
    setupDb(1)

    const result = await createAppointment(input())

    expect(result.success).toBe(true)
    if (!result.success || !result.data) throw new Error('expected success')
    expect(result.data.manage_token).toBeNull()
    expect(vi.mocked(sendClientConfirmation).mock.calls[0][0].manageToken).toBeUndefined()
  })

  it('defaults to version 1 when the row has no manage_token_version (pre-migration rows)', async () => {
    setupDb(undefined)

    const result = await createAppointment(input())

    if (!result.success || !result.data) throw new Error('expected success')
    expect(result.data.manage_token).toBe(buildManageToken(CREATED_ID, 1))
  })
})
