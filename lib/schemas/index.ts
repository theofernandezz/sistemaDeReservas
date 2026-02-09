/**
 * Centralized Zod schemas for validation
 * All server actions should use these schemas to validate input
 */

import { z } from 'zod'

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAYMENT_LIMITS = {
  MIN_AMOUNT_ARS: 1,
  MAX_AMOUNT_ARS: 999999999,
} as const

// ============================================================================
// APPOINTMENTS
// ============================================================================

export const createAppointmentSchema = z.object({
  service_id: z.string().uuid('ID de servicio inválido'),
  start_time: z.string().datetime('Fecha de inicio inválida'),
  end_time: z.string().datetime('Fecha de fin inválida'),
  client_name: z.string().min(1, 'Nombre del cliente requerido').max(100, 'Nombre demasiado largo'),
  client_phone: z.string().max(20, 'Teléfono demasiado largo').optional().nullable(),
  client_email: z.string().email('Email inválido').max(100, 'Email demasiado largo').optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  addons: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number().nonnegative(),
    duration_minutes: z.number().nonnegative(),
  })).optional(),
}).refine(data => {
  const start = new Date(data.start_time)
  const end = new Date(data.end_time)
  return start < end
}, {
  message: 'La hora de inicio debe ser anterior a la hora de fin',
  path: ['start_time'],
})

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().uuid('ID de turno inválido'),
  newStartTime: z.string().datetime('Fecha de inicio inválida'),
  newEndTime: z.string().datetime('Fecha de fin inválida'),
}).refine(data => {
  const start = new Date(data.newStartTime)
  const end = new Date(data.newEndTime)
  return start < end
}, {
  message: 'La hora de inicio debe ser anterior a la hora de fin',
  path: ['newStartTime'],
})

// ============================================================================
// SERVICES
// ============================================================================

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Nombre del servicio requerido').max(100, 'Nombre demasiado largo'),
  duration_minutes: z.number()
    .int('La duración debe ser un número entero')
    .min(1, 'La duración debe ser al menos 1 minuto')
    .max(1440, 'La duración no puede exceder 24 horas'),
  price: z.number()
    .nonnegative('El precio no puede ser negativo')
    .max(PAYMENT_LIMITS.MAX_AMOUNT_ARS, 'Precio demasiado alto'),
  is_active: z.boolean().optional(),
})

export const updateServiceSchema = z.object({
  name: z.string().min(1, 'Nombre del servicio requerido').max(100, 'Nombre demasiado largo').optional(),
  duration_minutes: z.number()
    .int('La duración debe ser un número entero')
    .min(1, 'La duración debe ser al menos 1 minuto')
    .max(1440, 'La duración no puede exceder 24 horas')
    .optional(),
  price: z.number()
    .nonnegative('El precio no puede ser negativo')
    .max(PAYMENT_LIMITS.MAX_AMOUNT_ARS, 'Precio demasiado alto')
    .optional(),
  is_active: z.boolean().optional(),
})

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100, 'Nombre demasiado largo'),
  role: z.string().max(50, 'Rol demasiado largo').optional().nullable(),
  avatar_color: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
  slot_interval: z.number()
    .int('El intervalo debe ser un número entero')
    .min(5, 'El intervalo mínimo es 5 minutos')
    .max(120, 'El intervalo máximo es 120 minutos')
    .optional(),
  buffer_time: z.number()
    .int('El tiempo de buffer debe ser un número entero')
    .min(0, 'El buffer no puede ser negativo')
    .max(60, 'El buffer máximo es 60 minutos')
    .optional(),
  weekly_schedule: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      slots: z.array(z.object({
        start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
        end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
      })),
    })
  ).optional(),
})

// ============================================================================
// ONBOARDING
// ============================================================================

export const completeOnboardingSchema = z.object({
  businessName: z.string().min(1, 'Nombre del negocio requerido').max(100, 'Nombre demasiado largo'),
  slug: z.string()
    .min(3, 'La URL debe tener al menos 3 caracteres')
    .max(50, 'La URL es demasiado larga')
    .regex(/^[a-z0-9-]+$/, 'La URL solo puede contener letras minúsculas, números y guiones'),
  logo: z.string()
    .refine(
      (val) => {
        if (!val) return true
        return val.startsWith('http') || val.startsWith('data:image')
      },
      'Logo debe ser una URL o imagen base64'
    )
    .nullable()
    .optional(),
  description: z.string()
    .max(500, 'Descripción demasiado larga')
    .optional()
    .or(z.literal('')),
  services: z.array(z.object({
    name: z.string().min(1, 'Nombre del servicio requerido').max(100),
    durationMinutes: z.number().int().min(1).max(1440),
    price: z.number().nonnegative().max(PAYMENT_LIMITS.MAX_AMOUNT_ARS),
  })).min(0),
  businessHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    dayName: z.string(),
    isOpen: z.boolean(),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  })).refine(
    (hours) => {
      return hours.every((day) => {
        if (!day.isOpen) return true
        const [startH, startM] = day.startTime.split(':').map(Number)
        const [endH, endM] = day.endTime.split(':').map(Number)
        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM
        return startMinutes < endMinutes
      })
    },
    {
      message: 'La hora de cierre debe ser posterior a la hora de apertura',
    }
  ),
  slotInterval: z.number().int().min(5).max(120),
})

// ============================================================================
// PAYMENTS - MERCADOPAGO
// ============================================================================

export const pendingBookingSchema = z.object({
  serviceId: z.string().uuid('ID de servicio inválido'),
  startTime: z.string().datetime('Fecha de inicio inválida'),
  endTime: z.string().datetime('Fecha de fin inválida'),
  clientName: z.string().min(1, 'Nombre del cliente requerido').max(100),
  clientPhone: z.string().min(1, 'Teléfono del cliente requerido').max(20),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  addons: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().nonnegative(),
    duration_minutes: z.number().nonnegative(),
  })).optional(),
  paymentAmount: z.number().min(PAYMENT_LIMITS.MIN_AMOUNT_ARS).max(PAYMENT_LIMITS.MAX_AMOUNT_ARS),
  paymentMethod: z.enum(['full', 'deposit']),
})

// MercadoPago webhook payload schema
export const mercadoPagoWebhookSchema = z.object({
  type: z.string().optional(),
  topic: z.string().optional(),
  data: z.object({
    id: z.string().or(z.number()),
  }).optional(),
  id: z.string().or(z.number()).optional(),
}).refine(data => {
  // Must have either type or topic
  return data.type || data.topic
}, {
  message: 'Webhook debe tener type o topic',
  path: ['type'],
}).refine(data => {
  // Must have data.id or id
  return data.data?.id || data.id
}, {
  message: 'Webhook debe tener data.id o id',
  path: ['data'],
})

// MercadoPago payment response schema (subset - only what we use)
export const mercadoPagoPaymentSchema = z.object({
  id: z.number().or(z.string()),
  status: z.enum(['pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back']),
  status_detail: z.string().optional(),
  transaction_amount: z.number(),
  metadata: z.object({
    pending_booking_id: z.string().uuid().optional(),
    appointment_id: z.string().uuid().optional(),
  }).optional(),
  date_approved: z.string().nullable().optional(),
  payment_method_id: z.string().optional(),
  payment_type_id: z.string().optional(),
})

// ============================================================================
// TYPE EXPORTS (infer from schemas)
// ============================================================================

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
export type PendingBookingInput = z.infer<typeof pendingBookingSchema>
export type MercadoPagoWebhookPayload = z.infer<typeof mercadoPagoWebhookSchema>
export type MercadoPagoPayment = z.infer<typeof mercadoPagoPaymentSchema>
