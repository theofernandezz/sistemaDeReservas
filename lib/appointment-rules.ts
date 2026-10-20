/**
 * Pure business rules for client-side appointment management.
 * No I/O: callers pass already-loaded data so these are trivially testable.
 */

export const MANAGEABLE_STATUSES = ['pending', 'confirmed'] as const

export const BLOCK_REASONS = {
  AlreadyCancelled: 'ALREADY_CANCELLED',
  Completed: 'COMPLETED',
  NotManageable: 'NOT_MANAGEABLE',
  Past: 'PAST',
  WithinWindow: 'WITHIN_WINDOW',
} as const
export type BlockReason = (typeof BLOCK_REASONS)[keyof typeof BLOCK_REASONS]

export type RuleResult = { ok: true } | { ok: false; reason: BlockReason; message: string }

interface RuleInput {
  status: string
  startTime: string
  now: Date
  /** Minimum hours of notice required. 0 is a valid value. */
  windowHours: number
}

export function isManageableStatus(status: string): boolean {
  return (MANAGEABLE_STATUSES as readonly string[]).includes(status)
}

function checkWindow(
  { status, startTime, now, windowHours }: RuleInput,
  action: 'cancelar' | 'reprogramar'
): RuleResult {
  if (status === 'cancelled') {
    return { ok: false, reason: BLOCK_REASONS.AlreadyCancelled, message: 'El turno ya fue cancelado' }
  }
  if (status === 'completed') {
    return { ok: false, reason: BLOCK_REASONS.Completed, message: 'El turno ya fue completado' }
  }
  if (!isManageableStatus(status)) {
    return { ok: false, reason: BLOCK_REASONS.NotManageable, message: `No se puede ${action} este turno` }
  }

  const hoursUntil = (new Date(startTime).getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntil <= 0) {
    return { ok: false, reason: BLOCK_REASONS.Past, message: 'El turno ya pasó' }
  }
  if (hoursUntil < windowHours) {
    return {
      ok: false,
      reason: BLOCK_REASONS.WithinWindow,
      message: `Solo se puede ${action} con al menos ${windowHours} horas de anticipación`,
    }
  }
  return { ok: true }
}

export function checkCanCancel(input: RuleInput): RuleResult {
  return checkWindow(input, 'cancelar')
}

export function checkCanReschedule(input: RuleInput): RuleResult {
  return checkWindow(input, 'reprogramar')
}

interface PaymentInfo {
  paymentStatus: string | null
  paymentAmount: number | null
}

/**
 * True when the owner may have to refund / settle money manually after a
 * client cancellation (no automatic refunds exist).
 */
export function hasPaymentToResolve({ paymentStatus, paymentAmount }: PaymentInfo): boolean {
  if (paymentStatus === 'paid' || paymentStatus === 'pending_confirmation') return true
  if (paymentStatus === 'refunded' || paymentStatus === 'rejected') return false
  return (paymentAmount ?? 0) > 0
}

export interface ManageSettings {
  cancellationHours: number
  rescheduleHours: number
}

export function resolveManageSettings(
  settings: { cancellationHours?: number; rescheduleHours?: number } | null | undefined
): ManageSettings {
  return {
    cancellationHours: settings?.cancellationHours ?? 24,
    // `??`, not `||`: 0 means "no minimum notice" and must be preserved
    rescheduleHours: settings?.rescheduleHours ?? 24,
  }
}
