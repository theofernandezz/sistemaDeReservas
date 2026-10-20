import { describe, it, expect } from 'vitest'
import { checkCanCancel, checkCanReschedule } from '@/lib/appointment-rules'

const now = new Date('2030-01-10T12:00:00Z')
const inHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000).toISOString()

describe('appointment rules - why an action is blocked (drives the message the client reads)', () => {
  it.each([
    ['cancelled', 72, 'ALREADY_CANCELLED', 'El turno ya fue cancelado'],
    ['completed', 72, 'COMPLETED', 'El turno ya fue completado'],
    ['confirmed', -5, 'PAST', 'El turno ya pasó'],
    ['confirmed', 3, 'WITHIN_WINDOW', 'Solo se puede'],
  ])('status=%s starting in %sh -> %s', (status, hours, reason, message) => {
    for (const check of [checkCanCancel, checkCanReschedule]) {
      const result = check({ status, startTime: inHours(hours), now, windowHours: 24 })
      expect(result).toMatchObject({ ok: false, reason })
      if (!result.ok) expect(result.message).toContain(message)
    }
  })

  it('a past appointment is PAST (not just "inside the window") even with a 0h window', () => {
    expect(checkCanCancel({ status: 'confirmed', startTime: inHours(-1), now, windowHours: 0 })).toMatchObject({
      ok: false,
      reason: 'PAST',
    })
  })

  it('the window message names the hours configured by the owner', () => {
    const result = checkCanReschedule({ status: 'confirmed', startTime: inHours(3), now, windowHours: 12 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('12 horas')
  })

  it('allows pending and confirmed with 0h window right up to the start', () => {
    for (const status of ['pending', 'confirmed']) {
      expect(checkCanReschedule({ status, startTime: inHours(0.01), now, windowHours: 0 }).ok).toBe(true)
    }
  })
})
