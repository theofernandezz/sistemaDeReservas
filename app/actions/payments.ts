'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/utils/supabase/server'
import { ServerActionResponse } from '@/types/database.types'
import { createPaymentPreference as mpCreatePreference } from '@/lib/mercadopago'
import { z } from 'zod'
import { getAppUrl } from '@/lib/config'
import { parseManageToken, verifyManageToken } from '@/lib/manage-token'
import {
  BookingValidationError,
  assertSlotAvailable,
  computeEndTime,
  computePaymentAmount,
  resolveAddons,
  totalDurationMinutes,
  totalPrice as sumTotalPrice,
  type ResolvedAddon,
} from '@/lib/services/booking-rules'

// Payment limits for security
const PAYMENT_LIMITS = {
  MIN_AMOUNT_ARS: 100,
  MAX_AMOUNT_ARS: 500000,
} as const

const MP_TOKEN_INVALID_ERROR = 'mp_token_invalid'

const paymentOptionSchema = z.enum(['deposit', 'full'])
type PaymentOption = z.infer<typeof paymentOptionSchema>

function isMPTokenInvalid(error: unknown): boolean {
  if (error instanceof Error) {
    // MP SDK wraps HTTP errors — check status on the error or its cause
    const err = error as Error & { status?: number; cause?: { status?: number } }
    if (err.status === 401 || err.status === 403) return true
    if (err.cause?.status === 401 || err.cause?.status === 403) return true
    // Some SDK versions include the status in the message
    if (/\b(401|403)\b/.test(err.message)) return true
  }
  return false
}

interface PaymentConfig {
  depositPercentage: number
  hasMPConnected: boolean
  paymentFlowMode: 'mercadopago' | 'manual_transfer'
  /** Hours of notice required to cancel (business setting, default 24). Shown in the booking UI. */
  cancellationHours?: number
  manualTransfer: {
    enabled: boolean
    alias: string | null
    cvu: string | null
    accountHolder: string | null
    message: string | null
    isReady: boolean
  }
}

interface ManualTransferConfigInput {
  enabled: boolean
  paymentFlowMode: 'mercadopago' | 'manual_transfer'
  alias: string
  cvu: string
  accountHolder: string
  message: string
}

const DEFAULT_TRANSFER_MESSAGE =
  'Realiza la transferencia y guarda el comprobante. Nuestro equipo se contactará con vos para solicitarlo y confirmar la reserva.'

const manualTransferConfigSchema = z.object({
  enabled: z.boolean(),
  paymentFlowMode: z.enum(['mercadopago', 'manual_transfer']),
  alias: z.string().trim().max(80),
  cvu: z.string().trim().max(40),
  accountHolder: z.string().trim().max(120),
  message: z.string().trim().max(240),
})

function sanitizeCvu(value: string): string {
  return value.replace(/\s+/g, '')
}

function parseManualTransferSettings(settings: unknown): PaymentConfig['manualTransfer'] {
  const settingsObj = (settings && typeof settings === 'object') ? settings as Record<string, unknown> : {}
  const rawManual =
    settingsObj.manualTransfer && typeof settingsObj.manualTransfer === 'object'
      ? settingsObj.manualTransfer as Record<string, unknown>
      : {}

  const enabled = rawManual.enabled === true
  const alias = typeof rawManual.alias === 'string' && rawManual.alias.trim() ? rawManual.alias.trim() : null
  const cvuRaw = typeof rawManual.cvu === 'string' ? rawManual.cvu : ''
  const cvu = cvuRaw.trim() ? sanitizeCvu(cvuRaw.trim()) : null
  const accountHolder =
    typeof rawManual.accountHolder === 'string' && rawManual.accountHolder.trim()
      ? rawManual.accountHolder.trim()
      : null
  const message =
    typeof rawManual.message === 'string' && rawManual.message.trim()
      ? rawManual.message.trim()
      : DEFAULT_TRANSFER_MESSAGE

  const isReady = Boolean(alias && cvu && accountHolder)

  return {
    enabled,
    alias,
    cvu,
    accountHolder,
    message,
    isReady,
  }
}

interface PaymentPreferenceResult {
  preferenceId: string
  initPoint: string
}

/**
 * Get payment configuration for a business
 */
export async function getBusinessPaymentConfig(businessId: string): Promise<ServerActionResponse<PaymentConfig>> {
  try {
    const supabase = await createClient()

    // Get business deposit percentage
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('deposit_percentage, settings')
      .eq('id', businessId)
      .single()

    if (bizError) throw bizError

    // Check if MP is connected — use service client because this action
    // is called from public booking pages where the user is not authenticated
    const serviceSupabase = createServiceClient()
    const { data: mpIntegration } = await serviceSupabase
      .from('mp_integrations')
      .select('id')
      .eq('business_id', businessId)
      .single()

    const manualTransfer = parseManualTransferSettings(business?.settings)
    const settingsObj =
      business?.settings && typeof business.settings === 'object'
        ? business.settings as Record<string, unknown>
        : {}
    const paymentFlowMode =
      settingsObj.paymentFlowMode === 'manual_transfer' && manualTransfer.enabled
        ? 'manual_transfer'
        : 'mercadopago'

    return {
      success: true,
      data: {
        depositPercentage: business?.deposit_percentage || 100,
        hasMPConnected: !!mpIntegration,
        paymentFlowMode,
        cancellationHours: typeof settingsObj.cancellationHours === 'number' ? settingsObj.cancellationHours : 24,
        manualTransfer,
      }
    }
  } catch (error: unknown) {
    console.error('Error getting payment config:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error getting payment config' }
  }
}

/**
 * Update transfer/manual payment configuration for a business
 */
export async function updateBusinessManualTransferConfig(
  businessId: string,
  input: ManualTransferConfigInput
): Promise<ServerActionResponse<void>> {
  try {
    const validation = manualTransferConfigSchema.safeParse({
      ...input,
      alias: input.alias.trim(),
      cvu: sanitizeCvu(input.cvu.trim()),
      accountHolder: input.accountHolder.trim(),
      message: input.message.trim() || DEFAULT_TRANSFER_MESSAGE,
    })

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return { success: false, error: firstError?.message || 'Configuración inválida' }
    }

    if (validation.data.enabled) {
      if (!validation.data.alias || !validation.data.cvu || !validation.data.accountHolder) {
        return { success: false, error: 'Alias, CVU y titular son obligatorios para activar transferencia manual' }
      }
      if (!/^\d{22}$/.test(validation.data.cvu)) {
        return { success: false, error: 'El CVU debe tener 22 dígitos' }
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: currentBusiness, error: fetchError } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .single()

    if (fetchError) throw fetchError

    const currentSettings =
      currentBusiness?.settings && typeof currentBusiness.settings === 'object'
        ? currentBusiness.settings as Record<string, unknown>
        : {}

    const newSettings = {
      ...currentSettings,
      paymentFlowMode: validation.data.paymentFlowMode,
      manualTransfer: {
        enabled: validation.data.enabled,
        alias: validation.data.alias || '',
        cvu: validation.data.cvu || '',
        accountHolder: validation.data.accountHolder || '',
        message: validation.data.message || DEFAULT_TRANSFER_MESSAGE,
      },
    }

    const { error } = await supabase
      .from('businesses')
      .update({ settings: newSettings })
      .eq('id', businessId)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating manual transfer config:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating manual transfer config' }
  }
}

/**
 * Update payment configuration for a business
 */
export async function updateBusinessPaymentConfig(
  businessId: string,
  depositPercentage: number
): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const { error } = await supabase
      .from('businesses')
      .update({ deposit_percentage: depositPercentage })
      .eq('id', businessId)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating payment config:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating payment config' }
  }
}

/**
 * Create a Mercado Pago payment preference for a booking
 * @param manageToken - Signed manage token returned by createAppointment. It is the credential:
 *   the appointment id is derived from it and the token is verified against id + stored version.
 *   No endpoint turns a bare id into a token.
 * @param option - 'deposit' (business deposit_percentage) or 'full'. The amount is always computed here
 *   from the DB (service + stored add-ons); there is no client-supplied amount.
 * The MP back_urls carry that same (verified) token (`?token=`).
 */
export async function createBookingPaymentPreference(
  manageToken: string,
  option: PaymentOption
): Promise<ServerActionResponse<PaymentPreferenceResult>> {
  try {
    const parsedOption = paymentOptionSchema.safeParse(option)
    if (!parsedOption.success) {
      return { success: false, error: 'Opción de pago inválida' }
    }

    const parsedToken = parseManageToken(manageToken)
    if (!parsedToken) {
      return { success: false, error: 'No pudimos iniciar el pago. Intentá de nuevo.' }
    }
    const appointmentId = parsedToken.appointmentId

    const supabase = await createClient()
    // Anon cannot SELECT/UPDATE appointments (RLS closed in migration 025). The token format was
    // validated above and the HMAC is verified right after the read, before anything is used.
    const serviceSupabase = createServiceClient()

    // Get appointment with service info
    const { data: appointment, error: aptError } = await serviceSupabase
      .from('appointments')
      .select(`
        *,
        service:services(name, price, business_id)
      `)
      .eq('id', appointmentId)
      .single()

    // Same generic answer for unknown appointment / wrong token / wrong version
    if (
      aptError ||
      !appointment ||
      !verifyManageToken(manageToken, appointment.id, appointment.manage_token_version ?? 1)
    ) {
      return { success: false, error: 'No pudimos iniciar el pago. Intentá de nuevo.' }
    }

    // Nothing to charge for a cancelled or already-paid / proof-under-review appointment
    if (
      appointment.status === 'cancelled' ||
      appointment.payment_status === 'paid' ||
      appointment.payment_status === 'pending_confirmation'
    ) {
      return { success: false, error: 'Este turno ya no admite un nuevo pago.' }
    }

    const businessId = (appointment.service as { business_id: string; name: string; price: number } | null)?.business_id
    if (!businessId) {
      throw new Error('Negocio no encontrado')
    }

    // Get business config and MP integration
    const { data: business } = await supabase
      .from('businesses')
      .select('deposit_percentage, name, slug')
      .eq('id', businessId)
      .single()

    // Service client for mp_integrations — this may be called from public pages
    const { data: mpIntegration } = await serviceSupabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) {
      throw new Error('El negocio no tiene Mercado Pago conectado')
    }

    // Amount computed from DB data only: service price + add-ons stored (server-resolved) on the appointment
    const servicePrice = (appointment.service as { business_id: string; name: string; price: number } | null)?.price || 0
    const storedAddons = (appointment.addons ?? []) as ResolvedAddon[]
    const paymentAmount = computePaymentAmount(
      sumTotalPrice(servicePrice, storedAddons),
      parsedOption.data,
      business?.deposit_percentage ?? null
    )
    if (paymentAmount <= 0) {
      return { success: false, error: 'No pudimos iniciar el pago. Intentá de nuevo.' }
    }

    // Create MP preference
    const appUrl = getAppUrl()
    const businessSlug = business?.slug

    // Build back URLs with the already-verified token
    const successBase = `${appUrl}/${businessSlug}/booking/success`
    const backUrls = {
      success: `${successBase}?token=${manageToken}`,
      failure: `${successBase}?token=${manageToken}&status=failure`,
      pending: `${successBase}?token=${manageToken}&status=pending`,
    }

    // Do not log back_urls: they may carry the secret manage token
    console.log('Creating MP preference for appointment', appointmentId)

    const preference = await mpCreatePreference(
      mpIntegration.access_token,
      [
        {
          id: appointmentId,
          title: `Pago - ${(appointment.service as { business_id: string; name: string; price: number } | null)?.name}`,
          description: `Reserva en ${business?.name}`,
          quantity: 1,
          unit_price: paymentAmount,
        }
      ],
      {
        booking_id: appointmentId,
        business_id: businessId,
      },
      backUrls
    )

    // Save preference ID to appointment
    await serviceSupabase
      .from('appointments')
      .update({
        mp_preference_id: preference.id,
        payment_amount: paymentAmount,
        payment_status: 'pending',
      })
      .eq('id', appointmentId)

    return {
      success: true,
      data: {
        preferenceId: preference.id!,
        initPoint: preference.init_point!,
      }
    }
  } catch (error: unknown) {
    console.error('Error creating payment preference:', error)
    if (isMPTokenInvalid(error)) {
      return { success: false, error: MP_TOKEN_INVALID_ERROR }
    }
    if (error instanceof BookingValidationError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'No pudimos iniciar el pago. Intentá de nuevo.' }
  }
}

// Booking data structure for deferred creation
export interface PendingBookingData {
  serviceId: string
  startTime: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  addonIds?: string[]
  teamMemberId?: string | null
  paymentMethod: 'full' | 'deposit'
}

// Zod schema for pending booking validation
const pendingBookingSchema = z.object({
  serviceId: z.string().uuid('ID de servicio inválido'),
  startTime: z.string().datetime('Fecha de inicio inválida'),
  clientName: z.string().min(1, 'Nombre del cliente requerido').max(100),
  clientPhone: z.string().min(1, 'Teléfono del cliente requerido').max(20),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  addonIds: z.array(z.string().uuid('ID de extra inválido')).max(20, 'Demasiados extras').optional(),
  teamMemberId: z.string().uuid('ID de miembro inválido').optional().nullable(),
  paymentMethod: z.enum(['full', 'deposit']),
})

/**
 * Create a Mercado Pago payment preference for a PENDING booking
 * The appointment will be created AFTER payment confirmation via webhook
 */
export async function createPendingBookingPreference(
  bookingData: PendingBookingData
): Promise<ServerActionResponse<PaymentPreferenceResult & { pendingBookingId: string }>> {
  try {
    // Validate input with Zod
    const validationResult = pendingBookingSchema.safeParse(bookingData)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const supabase = await createClient()

    // Get service AND business data in one query
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes, business_id, businesses!inner(deposit_percentage, name, slug)')
      .eq('id', validationResult.data.serviceId)
      .single()

    if (serviceError || !service) {
      throw new Error('Servicio no encontrado')
    }

    const businessId = service.business_id
    if (!businessId) {
      throw new Error('Negocio no encontrado')
    }

    const business = (service.businesses as unknown as { deposit_percentage: number; name: string; slug: string } | null)
    if (!business) {
      throw new Error('Configuración de negocio no encontrada')
    }

    // Validate deposit_percentage is in valid range
    const depositPercentage = business.deposit_percentage ?? 100
    if (depositPercentage < 0 || depositPercentage > 100) {
      throw new Error('Configuración de depósito inválida')
    }

    // CRITICAL: everything that affects money/agenda is derived from the DB (NEVER trust client input)
    // Service client only after the Zod validation above; add-ons are read by id, client prices ignored.
    const serviceSupabase = createServiceClient()
    const addons = await resolveAddons(serviceSupabase, businessId, validationResult.data.addonIds)
    const durationMinutes = totalDurationMinutes(service.duration_minutes, addons)
    const endTimeISO = computeEndTime(validationResult.data.startTime, durationMinutes)

    if (new Date(validationResult.data.startTime) < new Date(Date.now() - 60000)) {
      return { success: false, error: 'No se pueden crear turnos en el pasado' }
    }

    await assertSlotAvailable(supabase, {
      serviceId: validationResult.data.serviceId,
      businessId,
      startISO: validationResult.data.startTime,
      durationMinutes,
      teamMemberId: validationResult.data.teamMemberId,
    })

    const totalPrice = sumTotalPrice(service.price, addons)
    const serverCalculatedAmount = computePaymentAmount(
      totalPrice,
      validationResult.data.paymentMethod,
      business.deposit_percentage
    )

    // Validate calculated amount is within limits
    if (serverCalculatedAmount < PAYMENT_LIMITS.MIN_AMOUNT_ARS ||
        serverCalculatedAmount > PAYMENT_LIMITS.MAX_AMOUNT_ARS) {
      return {
        success: false,
        error: `Monto fuera de rango permitido (${PAYMENT_LIMITS.MIN_AMOUNT_ARS}-${PAYMENT_LIMITS.MAX_AMOUNT_ARS} ARS)`
      }
    }

    // Get MP integration — use service client because this is called from
    // the public booking page where the user is not authenticated
    const { data: mpIntegration } = await serviceSupabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) {
      throw new Error('El negocio no tiene Mercado Pago conectado')
    }

    // Create a pending_bookings record to store the booking data temporarily
    const pendingBookingId = crypto.randomUUID()

    // Store in database - use SERVER-CALCULATED amount, not client input
    const { error: insertError } = await supabase
      .from('pending_bookings')
      .insert({
        id: pendingBookingId,
        business_id: businessId,
        service_id: validationResult.data.serviceId,
        start_time: validationResult.data.startTime,
        end_time: endTimeISO,
        client_name: validationResult.data.clientName,
        client_phone: validationResult.data.clientPhone,
        client_email: validationResult.data.clientEmail || null,
        addons,
        payment_amount: serverCalculatedAmount, // Use server-calculated amount
        payment_method: validationResult.data.paymentMethod,
        status: 'pending_payment',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      })

    if (insertError) {
      console.error('Error creating pending booking:', insertError)
      throw new Error('Error al crear reserva pendiente')
    }

    // Create MP preference
    const appUrl = getAppUrl()
    const businessSlug = business?.slug

    const backUrls = {
      success: `${appUrl}/${businessSlug}/booking/success?pending=${pendingBookingId}`,
      failure: `${appUrl}/${businessSlug}/booking/success?pending=${pendingBookingId}&status=failure`,
      pending: `${appUrl}/${businessSlug}/booking/success?pending=${pendingBookingId}&status=pending`,
    }

    const preference = await mpCreatePreference(
      mpIntegration.access_token,
      [
        {
          id: pendingBookingId,
          title: `Pago - ${service.name}`,
          description: `Reserva en ${business?.name}`,
          quantity: 1,
          unit_price: serverCalculatedAmount, // Use server-calculated amount
        }
      ],
      {
        pending_booking_id: pendingBookingId,
        business_id: businessId,
      },
      backUrls
    )

    // Update pending booking with preference ID
    await supabase
      .from('pending_bookings')
      .update({ mp_preference_id: preference.id })
      .eq('id', pendingBookingId)

    return {
      success: true,
      data: {
        preferenceId: preference.id!,
        initPoint: preference.init_point!,
        pendingBookingId,
      }
    }
  } catch (error: unknown) {
    console.error('Error creating pending booking preference:', error)
    if (isMPTokenInvalid(error)) {
      return { success: false, error: MP_TOKEN_INVALID_ERROR }
    }
    if (error instanceof BookingValidationError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'No pudimos iniciar el pago. Intentá de nuevo.' }
  }
}

