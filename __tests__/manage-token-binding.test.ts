import { describe, it, expect, beforeEach } from 'vitest'
import { buildManageToken, parseManageToken, verifyManageToken } from '@/lib/manage-token'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  process.env.MANAGE_LINK_SECRET = 'test-secret-test-secret-test-secret-0123456789'
})

describe('manage token binding to the appointment', () => {
  it('rejects a token whose id prefix is A but whose MAC was minted for B, even when verified against B', () => {
    const macOfB = buildManageToken(ID_B, 1).split('.')[1]
    const forged = `${ID_A}.${macOfB}`

    expect(verifyManageToken(forged, ID_B, 1)).toBe(false)
    expect(verifyManageToken(forged, ID_A, 1)).toBe(false)
  })

  it('does not store or expose anything but id + MAC: the id prefix alone is not a credential', () => {
    const parsed = parseManageToken(buildManageToken(ID_A, 1))
    expect(parsed?.appointmentId).toBe(ID_A)
    expect(verifyManageToken(`${ID_A}.${'A'.repeat(43)}`, ID_A, 1)).toBe(false)
  })

  it('rejects MACs of the wrong length without throwing', () => {
    expect(verifyManageToken(`${ID_A}.${'A'.repeat(42)}`, ID_A, 1)).toBe(false)
    expect(verifyManageToken('', ID_A, 1)).toBe(false)
  })
})

describe('canonical form only (S4)', () => {
  const ID = 'abcdefab-abcd-4abc-8abc-abcdefabcdef'
  const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

  beforeEach(() => {
    process.env.MANAGE_LINK_SECRET = 'test-secret-test-secret-test-secret-0123456789'
  })

  it('rejects every variant of the last character that decodes to the same bytes', () => {
    const token = buildManageToken(ID, 1)
    const last = token.slice(-1)
    // 32 bytes -> 43 chars: the last char carries only 4 data bits, 16 chars share the same bytes
    const variants = [...BASE64URL].filter((c) => c !== last).map((c) => token.slice(0, -1) + c)
    const sameBytes = variants.filter(
      (v) => Buffer.from(v.split('.')[1], 'base64url').equals(Buffer.from(token.split('.')[1], 'base64url'))
    )
    expect(sameBytes.length).toBeGreaterThan(0) // the attack surface really exists
    for (const variant of variants) expect(verifyManageToken(variant, ID, 1)).toBe(false)
    expect(verifyManageToken(token, ID, 1)).toBe(true)
  })

  it('rejects an uppercase id even with the right MAC', () => {
    const [id, mac] = buildManageToken(ID, 1).split('.')
    const upper = `${id.toUpperCase()}.${mac}`
    const upperId = 'abcdefab-abcd-4abc-8abc-abcdefabcdeF'
    expect(verifyManageToken(upper, ID, 1)).toBe(false)
    expect(verifyManageToken(upper, id.toUpperCase(), 1)).toBe(false)
    expect(parseManageToken(upper)).toBeNull()
    expect(verifyManageToken(`${upperId}.${mac}`, upperId, 1)).toBe(false)
  })
})
