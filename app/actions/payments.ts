'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/utils/supabase/server'
import { ServerActionResponse } from '@/types/database.types'
import { createPaymentPreference as mpCreatePreference } from '@/lib/mercadopago'
import { z } from 'zod'
import { getAppUrl } from '@/lib/config'

// Payment limits for security
const PAYMENT_LIMITS = {
  MIN_AMOUNT_ARS: 100,
  MAX_AMOUNT_ARS: 500000,
} as const

const MP_TOKEN_INVALID_ERROR = 'mp_token_invalid'

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
      paymentFlowMode: validation.data.enabled ? validation.data.paymentFlowMode : 'mercadopago',
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
 * @param appointmentId - The appointment ID
 * @param customAmount - Optional custom amount to charge (if not provided, uses deposit percentage)
 */
export async function createBookingPaymentPreference(
  appointmentId: string,
  customAmount?: number
): Promise<ServerActionResponse<PaymentPreferenceResult>> {
  try {
    const supabase = await createClient()

    // Get appointment with service info
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(name, price, business_id)
      `)
      .eq('id', appointmentId)
      .single()

    if (aptError || !appointment) {
      throw new Error('Reserva no encontrada')
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

    // Use service client for mp_integrations — this may be called from public pages
    const serviceSupabase = createServiceClient()
    const { data: mpIntegration } = await serviceSupabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) {
      throw new Error('El negocio no tiene Mercado Pago conectado')
    }

    // Calculate amount - use customAmount if provided, otherwise calculate deposit
    const totalPrice = (appointment.service as { business_id: string; name: string; price: number } | null)?.price || 0
    const depositPercentage = business?.deposit_percentage || 30
    const paymentAmount = customAmount || Math.round(totalPrice * depositPercentage / 100)

    // Create MP preference
    const appUrl = getAppUrl()
    const businessSlug = business?.slug

    // Build back URLs - ensure they are valid
    const backUrls = {
      success: `${appUrl}/${businessSlug}/booking/success?appointment=${appointmentId}`,
      failure: `${appUrl}/${businessSlug}/booking/success?appointment=${appointmentId}&status=failure`,
      pending: `${appUrl}/${businessSlug}/booking/success?appointment=${appointmentId}&status=pending`,
    }

    console.log('Creating MP preference with back_urls:', backUrls)

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
    await supabase
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
    return { success: false, error: error instanceof Error ? error.message : 'Error creating payment preference' }
  }
}

// Booking data structure for deferred creation
export interface PendingBookingData {
  serviceId: string
  startTime: string
  endTime: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  addons?: { id: string; name: string; price: number; duration_minutes: number }[]
  paymentAmount: number
  paymentMethod: 'full' | 'deposit'
}

// Zod schema for pending booking validation
const pendingBookingSchema = z.object({
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
      .select('id, name, price, business_id, businesses!inner(deposit_percentage, name, slug)')
      .eq('id', bookingData.serviceId)
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

    // CRITICAL: Recalculate payment amount server-side (NEVER trust client input)
    const servicePrice = service.price
    const addonsTotal = (bookingData.addons || []).reduce((sum, addon) => sum + addon.price, 0)
    const totalPrice = servicePrice + addonsTotal

    let serverCalculatedAmount: number
    if (bookingData.paymentMethod === 'full') {
      serverCalculatedAmount = totalPrice
    } else {
      serverCalculatedAmount = Math.round(totalPrice * depositPercentage / 100)
    }

    // Validate calculated amount is within limits
    if (serverCalculatedAmount < PAYMENT_LIMITS.MIN_AMOUNT_ARS ||
        serverCalculatedAmount > PAYMENT_LIMITS.MAX_AMOUNT_ARS) {
      return {
        success: false,
        error: `Monto fuera de rango permitido (${PAYMENT_LIMITS.MIN_AMOUNT_ARS}-${PAYMENT_LIMITS.MAX_AMOUNT_ARS} ARS)`
      }
    }

    // Verify client-provided amount matches server calculation (tolerance: 1 ARS for rounding)
    if (Math.abs(bookingData.paymentAmount - serverCalculatedAmount) > 1) {
      console.error('Payment amount mismatch:', {
        client: bookingData.paymentAmount,
        server: serverCalculatedAmount,
        service: servicePrice,
        addons: addonsTotal,
        method: bookingData.paymentMethod,
        depositPct: depositPercentage
      })
      return {
        success: false,
        error: 'Monto de pago inválido. Por favor recarga la página.'
      }
    }

    // Get MP integration — use service client because this is called from
    // the public booking page where the user is not authenticated
    const serviceSupabase = createServiceClient()
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
        service_id: bookingData.serviceId,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        client_name: bookingData.clientName,
        client_phone: bookingData.clientPhone,
        client_email: bookingData.clientEmail || null,
        addons: bookingData.addons || [],
        payment_amount: serverCalculatedAmount, // Use server-calculated amount
        payment_method: bookingData.paymentMethod,
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
    return { success: false, error: error instanceof Error ? error.message : 'Error creating pending booking preference' }
  }
}

