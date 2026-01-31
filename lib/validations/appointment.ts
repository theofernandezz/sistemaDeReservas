/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Type for validation result
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
  message?: string
}

/**
 * Interface for appointment input
 */
export interface AppointmentInput {
  start_time: string
  end_time: string
  client_name: string
  client_phone?: string | null
  client_email?: string | null
  status?: string
  service_id: string
}

/**
 * Interface for blocked slot input
 */
export interface BlockedSlotInput {
  start_time: string
  end_time: string
  reason?: string | null
}

/**
 * Interface for reschedule input
 */
export interface RescheduleInput {
  new_start_time: string
  new_end_time: string
}

/**
 * Validate appointment times are in proper order
 * This is a standalone function for direct validation
 */
export function validateAppointmentTimes(startTime: string, endTime: string): { valid: boolean; error?: string } {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Fechas inválidas' }
  }
  
  if (start >= end) {
    return { valid: false, error: 'La hora de inicio debe ser anterior a la hora de fin' }
  }
  
  const now = new Date()
  if (start < new Date(now.getTime() - 60000)) {
    return { valid: false, error: 'No se pueden crear turnos en el pasado' }
  }
  
  return { valid: true }
}
