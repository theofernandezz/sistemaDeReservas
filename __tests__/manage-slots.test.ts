import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/availability', () => ({ computeAvailableSlots: vi.fn() }))

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { computeAvailableSlots } from '@/lib/availability'
import { buildManageToken } from '@/lib/manage-token'
import { getRescheduleSlotsByToken } from '@/app/actions/manage-slots'

type Result = { data: unknown; error: unknown }

function createFakeDb(appointmentsResult: Result) {
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    maybeSingle: vi.fn(() => Promise.resolve(appointmentsResult)),
  }
  return { client: { from: vi.fn(() => q) }, q }
}

process.env.MANAGE_LINK_SECRET = 'test-secret-test-secret-test-secret-0123456789'
const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const TOKEN = buildManageToken(APPOINTMENT_ID, 1)

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID,
    status: 'confirmed',
    service_id: 'svc-1',
    team_member_id: 'tm-1',
    addons: [{ duration_minutes: 15 }],
    manage_token_version: 1,
    service: { duration_minutes: 45 },
    ...overrides,
  }
}

function setup(data: unknown) {
  const db = createFakeDb({ data, error: null })
  vi.mocked(createServiceClient).mockReturnValue(db.client as unknown as ReturnType<typeof createServiceClient>)
  return db
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getRescheduleSlotsByToken', () => {
  it('rejects a malformed or empty token without touching the database', async () => {
    const db = setup(row())

    for (const token of ['', 'not-a-token', APPOINTMENT_ID]) {
      expect(await getRescheduleSlotsByToken({ token, date: '2030-01-15' })).toMatchObject({
        success: false,
        code: 'INVALID_TOKEN',
      })
    }
    expect(db.client.from).not.toHaveBeenCalled()
    expect(computeAvailableSlots).not.toHaveBeenCalled()
  })

  it('rejects a token of another appointment, another version or altered, returning no data', async () => {
    const [id, mac] = TOKEN.split('.')
    const tampered = `${id}.${mac.slice(0, -1)}${mac.endsWith('A') ? 'B' : 'A'}`
    const grafted = `${OTHER_ID}.${mac}`
    const cases: [string, string, Record<string, unknown>][] = [
      ['another appointment (MAC grafted)', grafted, { id: OTHER_ID }],
      ['another version', TOKEN, { manage_token_version: 2 }],
      ['altered MAC', tampered, {}],
    ]

    for (const [, token, overrides] of cases) {
      setup(row(overrides))
      const result = await getRescheduleSlotsByToken({ token, date: '2030-01-15' })
      expect(result).toMatchObject({ success: false, code: 'INVALID_TOKEN' })
      expect(JSON.stringify(result)).not.toContain('tm-1')
    }
    expect(computeAvailableSlots).not.toHaveBeenCalled()
  })

  it('rejects when no appointment matches or it is cancelled/completed', async () => {
    setup(null)
    expect(await getRescheduleSlotsByToken({ token: TOKEN, date: '2030-01-15' })).toMatchObject({ code: 'INVALID_TOKEN' })

    for (const status of ['cancelled', 'completed']) {
      setup(row({ status }))
      expect(await getRescheduleSlotsByToken({ token: TOKEN, date: '2030-01-15' })).toMatchObject({ code: 'INVALID_TOKEN' })
    }
    expect(computeAvailableSlots).not.toHaveBeenCalled()
  })

  it("computes slots for the appointment's own professional, excluding itself, with service + addons duration", async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([
      { time: '09:00', available: true },
      { time: '09:30', available: false },
      { time: '10:00', available: true },
    ])
    const db = setup(row())

    const result = await getRescheduleSlotsByToken({ token: TOKEN, date: '2030-01-15' })

    expect(result).toEqual({ success: true, data: ['09:00', '10:00'] })
    expect(db.q.eq).toHaveBeenCalledWith('id', APPOINTMENT_ID)
    expect(computeAvailableSlots).toHaveBeenCalledWith(
      expect.anything(),
      'svc-1',
      '2030-01-15',
      { teamMemberId: 'tm-1', excludeAppointmentId: APPOINTMENT_ID, blockOnAnyAppointment: false, durationMinutes: 60 }
    )
    expect(createClient).not.toHaveBeenCalled()
  })

  it('falls back to "any professional" when the appointment has no team member', async () => {
    vi.mocked(computeAvailableSlots).mockResolvedValue([])
    setup(row({ team_member_id: null }))

    await getRescheduleSlotsByToken({ token: TOKEN, date: '2030-01-15' })

    expect(computeAvailableSlots).toHaveBeenCalledWith(
      expect.anything(), 'svc-1', '2030-01-15', expect.objectContaining({ teamMemberId: undefined, blockOnAnyAppointment: true })
    )
  })

  it('validates the date format and returns a generic error when availability throws', async () => {
    const db = setup(row())
    expect(await getRescheduleSlotsByToken({ token: TOKEN, date: '15/01/2030' })).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
    })
    expect(db.client.from).not.toHaveBeenCalled()

    vi.mocked(computeAvailableSlots).mockRejectedValue(new Error('relation "secret_table" does not exist'))
    const failed = await getRescheduleSlotsByToken({ token: TOKEN, date: '2030-01-15' })
    expect(failed).toMatchObject({ success: false, code: 'FAILED' })
    expect(JSON.stringify(failed)).not.toContain('secret_table')
  })
})
