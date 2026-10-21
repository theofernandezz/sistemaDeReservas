import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeAvailableSlots } from '@/lib/availability'

type Row = Record<string, unknown>

interface Fixture {
  appointments?: Row[]
  blocked?: Row[]
  settings?: Record<string, unknown>
  /** key = JS getDay() of the requested date */
  schedule?: Record<string, { isOpen: boolean; startTime: string; endTime: string; breaks: { name: string; start: string; end: string }[] }>
}

// "Now" = Monday 2030-01-14 12:00 ART (15:00 UTC). Requested days: Mon 14 (today) and Tue 15.
const NOW = new Date('2030-01-14T15:00:00Z')
const TODAY = '2030-01-14'
const TOMORROW = '2030-01-15'
const OPEN_ALL_DAY = { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [] }
const NEUTRAL_SCHEDULE = Object.fromEntries(['0', '1', '2', '3', '4', '5', '6'].map((day) => [day, OPEN_ALL_DAY]))

const appt = (id: string, startUtc: string, endUtc: string, teamMemberId: string | null, status = 'confirmed'): Row => ({
  id,
  status,
  start_time: startUtc,
  end_time: endUtc,
  team_member_id: teamMemberId,
})

function fakeSupabase(fixture: Fixture) {
  const neqCalls: [string, unknown][] = []

  function table(name: string) {
    let rows: Row[] = []
    if (name === 'appointments') rows = fixture.appointments ?? []
    if (name === 'blocked_slots') rows = fixture.blocked ?? []
    const q = {
      select: () => q,
      gte: () => q,
      lte: () => q,
      eq: () => q,
      neq: (column: string, value: unknown) => {
        neqCalls.push([column, value])
        rows = rows.filter((row) => row[column] !== value)
        return q
      },
      single: () => {
        if (name === 'services') return Promise.resolve({ data: { duration_minutes: 60, business_id: 'biz-1' }, error: null })
        if (name === 'businesses') return Promise.resolve({ data: { settings: fixture.settings ?? {} }, error: null })
        if (name === 'team_members') {
          return Promise.resolve({
            data: { id: 'tm-1', slot_interval: 30, buffer_time: 0, weekly_schedule: fixture.schedule ?? NEUTRAL_SCHEDULE },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: Row[]; error: null }) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    }
    return q
  }

  const rpc = (fn: string) => {
    if (fn !== 'get_busy_slots') return Promise.resolve({ data: null, error: { code: 'PGRST202' } })
    const data = (fixture.appointments ?? [])
      .filter((row) => row.status !== 'cancelled')
      .map((row) => ({ start_time: row.start_time, end_time: row.end_time, team_member_id: row.team_member_id }))
    return Promise.resolve({ data, error: null })
  }

  return { client: { from: (name: string) => table(name), rpc } as unknown as SupabaseClient, neqCalls }
}

async function slotMap(fixture: Fixture, date: string, options: Parameters<typeof computeAvailableSlots>[3] = {}) {
  const { client, neqCalls } = fakeSupabase(fixture)
  const slots = await computeAvailableSlots(client, 'svc-1', date, { teamMemberId: 'tm-1', durationMinutes: 60, ...options })
  return { slots: Object.fromEntries(slots.map((slot) => [slot.time, slot.available])), neqCalls }
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('computeAvailableSlots (real availability logic used by reschedule)', () => {
  it('marks times already in the past (or inside minAdvanceHours) as unavailable', async () => {
    const { slots } = await slotMap({ settings: { minAdvanceHours: 2 } }, TODAY)

    expect(slots['09:00']).toBe(false) // already happened
    expect(slots['13:00']).toBe(false) // inside the 2h minimum notice
    expect(slots['17:00']).toBe(true)
  })

  it('returns nothing for a past day and for days beyond maxAdvanceDays', async () => {
    expect((await slotMap({}, '2030-01-13')).slots).toEqual({})
    expect((await slotMap({ settings: { maxAdvanceDays: 1 } }, '2030-01-20')).slots).toEqual({})
    // sanity: same fixture does offer slots inside the allowed range
    expect(Object.keys((await slotMap({ settings: { maxAdvanceDays: 1 } }, TOMORROW)).slots).length).toBeGreaterThan(0)
  })

  it('does not offer times before opening, after closing, or on a closed day', async () => {
    const hours = await slotMap({ schedule: { '2': { isOpen: true, startTime: '10:00', endTime: '13:00', breaks: [] } } }, TOMORROW)
    expect(hours.slots).not.toHaveProperty('09:30')
    expect(hours.slots).not.toHaveProperty('13:30')
    expect(hours.slots['10:00']).toBe(true)

    const closed = await slotMap({ schedule: { '2': { isOpen: false, startTime: '10:00', endTime: '13:00', breaks: [] } } }, TOMORROW)
    expect(closed.slots).toEqual({})
  })

  it('blocks slots that overlap a break', async () => {
    const { slots } = await slotMap(
      { schedule: { '2': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] } } },
      TOMORROW
    )
    expect(slots['12:30']).toBe(false) // 12:30-13:30 overlaps the break
    expect(slots['13:00']).toBe(false)
    expect(slots['14:00']).toBe(true)
  })

  it('blocks slots overlapping a blocked_slot', async () => {
    const { slots } = await slotMap(
      { blocked: [{ start_time: '2030-01-15T13:00:00.000Z', end_time: '2030-01-15T14:00:00.000Z', reason: 'Feriado' }] }, // 10:00-11:00 ART
      TOMORROW
    )
    expect(slots['09:30']).toBe(false)
    expect(slots['10:00']).toBe(false)
    expect(slots['11:00']).toBe(true)
  })

  it('blocks slots overlapping another appointment of the SAME professional but not of a different one', async () => {
    const sameMember = appt('a-1', '2030-01-15T13:00:00.000Z', '2030-01-15T14:00:00.000Z', 'tm-1') // 10:00-11:00 ART
    const otherMember = appt('a-2', '2030-01-15T16:00:00.000Z', '2030-01-15T17:00:00.000Z', 'tm-2') // 13:00-14:00 ART

    const { slots } = await slotMap({ appointments: [sameMember, otherMember] }, TOMORROW)

    expect(slots['10:00']).toBe(false)
    expect(slots['10:30']).toBe(false)
    expect(slots['13:00']).toBe(true)
  })

  it('ignores cancelled appointments', async () => {
    const cancelled = appt('a-1', '2030-01-15T13:00:00.000Z', '2030-01-15T14:00:00.000Z', 'tm-1', 'cancelled')
    const { slots } = await slotMap({ appointments: [cancelled] }, TOMORROW)
    expect(slots['10:00']).toBe(true)
  })

  it('frees the appointment being rescheduled when excludeAppointmentId is given', async () => {
    const own = appt('a-own', '2030-01-15T13:00:00.000Z', '2030-01-15T14:00:00.000Z', 'tm-1')

    const blockedByItself = await slotMap({ appointments: [own] }, TOMORROW)
    const excluded = await slotMap({ appointments: [own] }, TOMORROW, { excludeAppointmentId: 'a-own' })

    expect(blockedByItself.slots['10:00']).toBe(false)
    expect(excluded.slots['10:00']).toBe(true)
    expect(excluded.neqCalls).toContainEqual(['id', 'a-own'])
  })

  it('uses the duration override (service + addons) to detect overlaps', async () => {
    const later = appt('a-1', '2030-01-15T14:00:00.000Z', '2030-01-15T15:00:00.000Z', 'tm-1') // 11:00-12:00 ART

    const base = await slotMap({ appointments: [later] }, TOMORROW, { durationMinutes: 60 })
    const longer = await slotMap({ appointments: [later] }, TOMORROW, { durationMinutes: 90 })

    expect(base.slots['10:00']).toBe(true) // 10:00-11:00 fits before 11:00
    expect(longer.slots['10:00']).toBe(false) // 10:00-11:30 collides
  })
})

describe('slot must end within opening hours (C1)', () => {
  const tenToOne = { schedule: { '2': { isOpen: true, startTime: '10:00', endTime: '13:00', breaks: [] } } }

  it('hours 10-13 with a 60 min service: 12:00 is the last valid start; 12:30 and 13:00 are not offered', async () => {
    const { slots } = await slotMap(tenToOne, TOMORROW)
    expect(slots['12:00']).toBe(true)
    expect(slots['12:30']).not.toBe(true)
    expect(slots['13:00']).not.toBe(true)
    expect(Object.keys(slots).at(-1)).toBe('12:00')
  })

  it('uses the effective duration (service + addons): 90 min -> last start 11:30', async () => {
    const { slots } = await slotMap(tenToOne, TOMORROW, { durationMinutes: 90 })
    expect(slots['11:30']).toBe(true)
    expect(slots['12:00']).not.toBe(true)
  })
})

describe('blockOnAnyAppointment (appointment without team member, F3)', () => {
  const other = appt('a-9', '2030-01-15T13:00:00.000Z', '2030-01-15T14:00:00.000Z', 'tm-2') // 10:00-11:00 ART, other member

  it('an appointment of another professional blocks the slot when blockOnAnyAppointment is set', async () => {
    const blocking = await slotMap({ appointments: [other] }, TOMORROW, { blockOnAnyAppointment: true })
    expect(blocking.slots['10:00']).toBe(false)
    const normal = await slotMap({ appointments: [other] }, TOMORROW)
    expect(normal.slots['10:00']).toBe(true)
  })
})
