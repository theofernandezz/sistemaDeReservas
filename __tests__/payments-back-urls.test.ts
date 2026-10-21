import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/mercadopago', () => ({
  createPaymentPreference: vi.fn().mockResolvedValue({ id: 'pref-1', init_point: 'https://mp.test/pay' }),
}))

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { createPaymentPreference } from '@/lib/mercadopago'
import { buildManageToken, verifyManageToken } from '@/lib/manage-token'
import { createBookingPaymentPreference } from '@/app/actions/payments'

const APPOINTMENT_ID = '66666666-6666-4666-8666-666666666666'
const MANAGE_SECRET = 'test-secret-test-secret-test-secret-0123456789'

function fakeClient(singles: Record<string, unknown>) {
  const make = (name: string) => {
    const q = {
      select: vi.fn(() => q),
      update: vi.fn(() => q),
      eq: vi.fn(() => q),
      single: vi.fn(() => Promise.resolve({ data: singles[name] ?? null, error: null })),
      then: (resolve: (v: { data: null; error: null }) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve),
    }
    return q
  }
  return { from: vi.fn((name: string) => make(name)) }
}

function setup(version: number | undefined) {
  const appointment = {
    id: APPOINTMENT_ID,
    ...(version === undefined ? {} : { manage_token_version: version }),
    service: { name: 'Corte', price: 10000, business_id: 'biz-1' },
  }
  anonClient = fakeClient({ businesses: { deposit_percentage: 30, name: 'Salon', slug: 'salon' } })
  serviceClient = fakeClient({ appointments: appointment, mp_integrations: { access_token: 'mp-token' } })
  vi.mocked(createClient).mockResolvedValue(anonClient as never)
  vi.mocked(createServiceClient).mockReturnValue(serviceClient as never)
}

let anonClient: ReturnType<typeof fakeClient>
let serviceClient: ReturnType<typeof fakeClient>

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  process.env.MANAGE_LINK_SECRET = MANAGE_SECRET
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
})

describe('createBookingPaymentPreference - MP back_urls', () => {
  it('carry a signed manage token for the appointment (id + current version), not the bare id', async () => {
    setup(5)

    const result = await createBookingPaymentPreference(buildManageToken(APPOINTMENT_ID, 5), 'deposit')

    expect(result.success).toBe(true)
    const backUrls = vi.mocked(createPaymentPreference).mock.calls[0][3]
    const token = buildManageToken(APPOINTMENT_ID, 5)
    expect(backUrls.success).toBe(`https://app.test/salon/booking/success?token=${token}`)
    expect(backUrls.failure).toBe(`https://app.test/salon/booking/success?token=${token}&status=failure`)
    expect(backUrls.pending).toBe(`https://app.test/salon/booking/success?token=${token}&status=pending`)
    expect(verifyManageToken(token, APPOINTMENT_ID, 5)).toBe(true)
    for (const url of Object.values(backUrls)) {
      expect(url).not.toContain(`id=${APPOINTMENT_ID}`)
      expect(url).not.toMatch(/[?&]appointment=/)
    }
  })

  it('falls back to version 1 for rows without manage_token_version', async () => {
    setup(undefined)

    await createBookingPaymentPreference(buildManageToken(APPOINTMENT_ID, 1), 'deposit')

    const backUrls = vi.mocked(createPaymentPreference).mock.calls[0][3]
    expect(backUrls.success).toContain(`token=${buildManageToken(APPOINTMENT_ID, 1)}`)
  })

  it('fails (never creates a preference with an invalid link) when MANAGE_LINK_SECRET is missing', async () => {
    const token = buildManageToken(APPOINTMENT_ID, 1)
    delete process.env.MANAGE_LINK_SECRET
    setup(1)

    const result = await createBookingPaymentPreference(token, 'deposit')

    expect(result.success).toBe(false)
    expect(createPaymentPreference).not.toHaveBeenCalled()
  })

  describe('authorization: the token is the credential', () => {
    const OTHER_ID = '77777777-7777-4777-8777-777777777777'

    it.each([
      ['a bare appointment id', APPOINTMENT_ID],
      ['garbage', 'nope'],
      ['an empty string', ''],
    ])('rejects %s without touching the DB or MP', async (_label, value) => {
      setup(1)
      const result = await createBookingPaymentPreference(value, 'deposit')
      expect(result.success).toBe(false)
      expect(createClient).not.toHaveBeenCalled()
      expect(createPaymentPreference).not.toHaveBeenCalled()
    })

    it('rejects a token of an outdated version', async () => {
      setup(2)
      const result = await createBookingPaymentPreference(buildManageToken(APPOINTMENT_ID, 1), 'deposit')
      expect(result.success).toBe(false)
      expect(createPaymentPreference).not.toHaveBeenCalled()
    })

    it('rejects a token whose MAC belongs to another appointment', async () => {
      setup(1)
      const grafted = `${APPOINTMENT_ID}.${buildManageToken(OTHER_ID, 1).split('.')[1]}`
      const result = await createBookingPaymentPreference(grafted, 'deposit')
      expect(result.success).toBe(false)
      expect(createPaymentPreference).not.toHaveBeenCalled()
    })

    it('never echoes a token for an id it was not given a valid token for', async () => {
      setup(1)
      const result = await createBookingPaymentPreference(APPOINTMENT_ID, 'deposit')
      expect(JSON.stringify(result)).not.toContain(buildManageToken(APPOINTMENT_ID, 1))
    })
  })

  it('reads and updates appointments with the service client, never the anon/session one (RLS closed by 025)', async () => {
    setup(1)

    const result = await createBookingPaymentPreference(buildManageToken(APPOINTMENT_ID, 1), 'deposit')

    expect(result.success).toBe(true)
    expect(anonClient.from.mock.calls.map((c) => c[0])).not.toContain('appointments')
    expect(serviceClient.from.mock.calls.filter((c) => c[0] === 'appointments').length).toBe(2) // read + update
  })
})
