import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkCanCancel, checkCanReschedule, hasPaymentToResolve, resolveManageSettings } from '@/lib/appointment-rules'
import { buildManageToken, manageTokenSchema, tryBuildManageToken, verifyManageToken } from '@/lib/manage-token'

const now = new Date('2030-01-10T12:00:00Z')
const inHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000).toISOString()

describe('appointment rules', () => {
  it('blocks cancel inside the window, allows exactly on the boundary', () => {
    expect(checkCanCancel({ status: 'confirmed', startTime: inHours(23), now, windowHours: 24 }).ok).toBe(false)
    expect(checkCanCancel({ status: 'confirmed', startTime: inHours(24), now, windowHours: 24 }).ok).toBe(true)
  })

  it.each(['cancelled', 'completed', 'no_show'])('blocks status %s', (status) => {
    expect(checkCanCancel({ status, startTime: inHours(100), now, windowHours: 24 }).ok).toBe(false)
    expect(checkCanReschedule({ status, startTime: inHours(100), now, windowHours: 24 }).ok).toBe(false)
  })

  it('blocks past appointments even with a 0h window', () => {
    expect(checkCanCancel({ status: 'confirmed', startTime: inHours(-1), now, windowHours: 0 }).ok).toBe(false)
    expect(checkCanReschedule({ status: 'confirmed', startTime: inHours(-1), now, windowHours: 0 }).ok).toBe(false)
  })

  it('keeps rescheduleHours=0 (?? not ||)', () => {
    expect(resolveManageSettings({ rescheduleHours: 0 }).rescheduleHours).toBe(0)
    expect(resolveManageSettings({}).rescheduleHours).toBe(24)
    expect(resolveManageSettings(null).cancellationHours).toBe(24)
  })

  it('flags payment/deposit to resolve manually', () => {
    expect(hasPaymentToResolve({ paymentStatus: 'paid', paymentAmount: 100 })).toBe(true)
    expect(hasPaymentToResolve({ paymentStatus: 'pending_confirmation', paymentAmount: null })).toBe(true)
    expect(hasPaymentToResolve({ paymentStatus: 'pending', paymentAmount: null })).toBe(false)
    expect(hasPaymentToResolve({ paymentStatus: null, paymentAmount: null })).toBe(false)
    expect(hasPaymentToResolve({ paymentStatus: 'refunded', paymentAmount: 100 })).toBe(false)
  })
})

describe('manage token', () => {
  const ID = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    process.env.MANAGE_LINK_SECRET = 'test-secret-test-secret-test-secret-0123456789'
  })

  it('is deterministic, well-formed and verifies in constant-time path', () => {
    const token = buildManageToken(ID, 1)
    expect(manageTokenSchema.safeParse(token).success).toBe(true)
    expect(buildManageToken(ID, 1)).toBe(token)
    expect(buildManageToken(ID, 2)).not.toBe(token)
    expect(verifyManageToken(token, ID, 1)).toBe(true)
  })

  it('rejects other version, other id, other secret and garbage', () => {
    const token = buildManageToken(ID, 1)
    expect(verifyManageToken(token, ID, 2)).toBe(false)
    expect(verifyManageToken(token, '22222222-2222-4222-8222-222222222222', 1)).toBe(false)
    expect(verifyManageToken('x', ID, 1)).toBe(false)
    process.env.MANAGE_LINK_SECRET = 'another-secret-another-secret-0123456789'
    expect(verifyManageToken(token, ID, 1)).toBe(false)
  })

  it('rejects a bare UUID used as token', () => {
    expect(manageTokenSchema.safeParse(ID).success).toBe(false)
  })

  it('fails loudly (never builds a link) without a valid secret', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.MANAGE_LINK_SECRET
    expect(() => buildManageToken(ID, 1)).toThrow()
    expect(tryBuildManageToken(ID, 1)).toBeNull()
    expect(spy).toHaveBeenCalled()
    process.env.MANAGE_LINK_SECRET = 'short'
    expect(tryBuildManageToken(ID, 1)).toBeNull()
  })
})
