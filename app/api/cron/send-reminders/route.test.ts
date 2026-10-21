import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

process.env.CRON_SECRET = 'cron-secret'
const MANAGE_SECRET = 'test-secret-test-secret-test-secret-0123456789'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/email', () => ({
  sendAppointmentReminder: vi.fn().mockResolvedValue({ success: true }),
}))

import { createServiceClient } from '@/utils/supabase/server'
import { sendAppointmentReminder } from '@/lib/email'
import { buildManageToken, verifyManageToken } from '@/lib/manage-token'

const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'

function reminderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID,
    start_time: '2030-01-15T13:00:00.000Z',
    end_time: '2030-01-15T14:00:00.000Z',
    client_name: 'Ana',
    client_email: 'ana@example.com',
    client_phone: null,
    email_reminder_sent: false,
    business_id: 'biz-1',
    manage_token_version: 3,
    service: { id: 'svc-1', name: 'Corte', price: 100 },
    ...overrides,
  }
}

function setup(rows: unknown[]) {
  const q = {
    select: vi.fn((_columns?: string) => q),
    gte: vi.fn(() => q),
    lt: vi.fn(() => q),
    eq: vi.fn(() => q),
    not: vi.fn(() => q),
    update: vi.fn(() => q),
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve, reject),
  }
  vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn(() => q) } as unknown as ReturnType<typeof createServiceClient>)
  return q
}

async function callCron() {
  const { GET } = await import('@/app/api/cron/send-reminders/route')
  return GET(
    new NextRequest('http://localhost/api/cron/send-reminders', {
      headers: { authorization: 'Bearer cron-secret' },
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.MANAGE_LINK_SECRET = MANAGE_SECRET
})

describe('send-reminders cron', () => {
  it('reads manage_token_version and gives the reminder a token valid for that id + version', async () => {
    const q = setup([reminderRow()])

    const response = await callCron()

    expect(response.status).toBe(200)
    expect(q.select.mock.calls[0][0]).toContain('manage_token_version')
    expect(sendAppointmentReminder).toHaveBeenCalledTimes(1)
    const [data, businessId] = vi.mocked(sendAppointmentReminder).mock.calls[0]
    expect(businessId).toBe('biz-1')
    expect(data.manageToken).toBe(buildManageToken(APPOINTMENT_ID, 3))
    expect(verifyManageToken(data.manageToken!, APPOINTMENT_ID, 3)).toBe(true)
    expect(verifyManageToken(data.manageToken!, APPOINTMENT_ID, 1)).toBe(false)
  })

  it('never emits a link when MANAGE_LINK_SECRET is missing (still sends the reminder)', async () => {
    delete process.env.MANAGE_LINK_SECRET
    setup([reminderRow()])

    const response = await callCron()

    expect(response.status).toBe(200)
    expect(sendAppointmentReminder).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendAppointmentReminder).mock.calls[0][0].manageToken).toBeUndefined()
  })
})
