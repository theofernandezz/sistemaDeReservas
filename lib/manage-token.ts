import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'

/**
 * Stateless client manage token. Nothing about it is stored in the DB:
 *   token = `${appointmentId}.${base64url(HMAC-SHA256(MANAGE_LINK_SECRET, `${appointmentId}:${version}`))}`
 * The id prefix is only a lookup key (it is NOT a credential); the MAC is.
 * Bumping appointments.manage_token_version invalidates the link; rotating the secret invalidates all.
 */

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const MIN_SECRET_LENGTH = 32

export const manageTokenSchema = z
  .string()
  .regex(new RegExp(`^${UUID_PATTERN}\\.[A-Za-z0-9_-]{43}$`), 'Link inválido')

export class ManageLinkConfigError extends Error {
  constructor() {
    super('Configuración del servidor incompleta')
    this.name = 'ManageLinkConfigError'
  }
}

function getSecret(): string {
  const secret = process.env.MANAGE_LINK_SECRET
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    console.error(
      `CRITICAL: MANAGE_LINK_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} chars; client manage links cannot be generated or verified`
    )
    throw new ManageLinkConfigError()
  }
  return secret
}

function computeMac(appointmentId: string, version: number): Buffer {
  return createHmac('sha256', getSecret()).update(`${appointmentId}:${version}`).digest()
}

/** Throws ManageLinkConfigError if the secret is not configured. */
export function buildManageToken(appointmentId: string, version: number): string {
  return `${appointmentId}.${computeMac(appointmentId, version).toString('base64url')}`
}

/** Same as buildManageToken but returns null (after logging) instead of throwing: for best-effort mails. */
export function tryBuildManageToken(appointmentId: string, version: number | null | undefined): string | null {
  try {
    return buildManageToken(appointmentId, version ?? 1)
  } catch {
    return null
  }
}

/** Appointment id embedded in a well-formed token, or null. Lookup key only. */
export function parseManageToken(token: string): { appointmentId: string; mac: string } | null {
  const parsed = manageTokenSchema.safeParse(token)
  if (!parsed.success) return null
  const [appointmentId, mac] = parsed.data.split('.')
  return { appointmentId, mac }
}

/**
 * Constant-time check of a token against the appointment's current id + version.
 * Only the canonical form is accepted (lowercase id, MAC re-encodes to itself), so a
 * given appointment has exactly one valid token string.
 */
export function verifyManageToken(token: string, appointmentId: string, version: number): boolean {
  const parsed = parseManageToken(token)
  if (!parsed || parsed.appointmentId !== appointmentId) return false
  const received = Buffer.from(parsed.mac, 'base64url')
  if (received.toString('base64url') !== parsed.mac) return false
  const expected = computeMac(appointmentId, version)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function buildManageUrl(appUrl: string, token: string): string {
  return `${appUrl}/turno/${token}`
}
