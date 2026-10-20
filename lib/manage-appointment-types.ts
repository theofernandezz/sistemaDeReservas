export const MANAGE_ERROR_CODES = {
  InvalidToken: 'INVALID_TOKEN',
  Validation: 'VALIDATION_ERROR',
  NotAllowed: 'NOT_ALLOWED',
  SlotUnavailable: 'SLOT_UNAVAILABLE',
  Failed: 'FAILED',
} as const
export type ManageErrorCode = (typeof MANAGE_ERROR_CODES)[keyof typeof MANAGE_ERROR_CODES]

export type ManageActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: ManageErrorCode }

/** Only what the client page needs. No other appointment's data. */
export interface ManagedAppointmentView {
  id: string
  status: string
  startTime: string
  endTime: string
  clientName: string
  serviceName: string | null
  servicePrice: number | null
  businessName: string | null
  businessSlug: string | null
  paymentStatus: string | null
  proofUrl: string | null
  rescheduleCount: number
  cancellationHours: number
  rescheduleHours: number
  canCancel: boolean
  cancelBlockedReason: string | null
  canReschedule: boolean
  rescheduleBlockedReason: string | null
}
