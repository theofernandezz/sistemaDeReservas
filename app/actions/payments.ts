'use server'

import { createClient } from '@/utils/supabase/server'
import { ServerActionResponse } from '@/types/database.types'
import { createPaymentPreference as mpCreatePreference } from '@/lib/mercadopago'

interface PaymentConfig {
  depositPercentage: number
  hasMPConnected: boolean
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
      .select('deposit_percentage')
      .eq('id', businessId)
      .single()

    if (bizError) throw bizError

    // Check if MP is connected
    const { data: mpIntegration } = await supabase
      .from('mp_integrations')
      .select('id')
      .eq('business_id', businessId)
      .single()

    return {
      success: true,
      data: {
        depositPercentage: business?.deposit_percentage || 100,
        hasMPConnected: !!mpIntegration,
      }
    }
  } catch (error: any) {
    console.error('Error getting payment config:', error)
    return { success: false, error: error.message }
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

    return { success: true }
  } catch (error: any) {
    console.error('Error updating payment config:', error)
    return { success: false, error: error.message }
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

    // @ts-ignore - Supabase types for nested selects
    const businessId = (appointment.service as any)?.business_id
    if (!businessId) {
      throw new Error('Negocio no encontrado')
    }

    // Get business config and MP integration
    const { data: business } = await supabase
      .from('businesses')
      .select('deposit_percentage, name, slug')
      .eq('id', businessId)
      .single()

    const { data: mpIntegration } = await supabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) {
      throw new Error('El negocio no tiene Mercado Pago conectado')
    }

    // Calculate amount - use customAmount if provided, otherwise calculate deposit
    // @ts-ignore
    const totalPrice = (appointment.service as any)?.price || 0
    const depositPercentage = business?.deposit_percentage || 30
    const paymentAmount = customAmount || Math.round(totalPrice * depositPercentage / 100)

    // Create MP preference
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appointments.devora.lat'
    const businessSlug = business?.slug || 'siv-nails'

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
          // @ts-ignore
          title: `Pago - ${(appointment.service as any)?.name}`,
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
  } catch (error: any) {
    console.error('Error creating payment preference:', error)
    return { success: false, error: error.message }
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

/**
 * Create a Mercado Pago payment preference for a PENDING booking
 * The appointment will be created AFTER payment confirmation via webhook
 */
export async function createPendingBookingPreference(
  bookingData: PendingBookingData
): Promise<ServerActionResponse<PaymentPreferenceResult & { pendingBookingId: string }>> {
  try {
    // Validaciones de entrada
    if (!bookingData.paymentMethod || !['full', 'deposit'].includes(bookingData.paymentMethod)) {
      return { 
        success: false, 
        error: 'Método de pago inválido. Por favor selecciona una opción de pago.' 
      }
    }
    
    if (!bookingData.paymentAmount || bookingData.paymentAmount <= 0) {
      return { 
        success: false, 
        error: 'Monto de pago inválido.' 
      }
    }
    
    if (!bookingData.serviceId || !bookingData.clientName || !bookingData.clientPhone) {
      return {
        success: false,
        error: 'Faltan datos requeridos para la reserva.'
      }
    }

    const supabase = await createClient()

    // Get service to find business_id
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, business_id')
      .eq('id', bookingData.serviceId)
      .single()

    if (serviceError || !service) {
      throw new Error('Servicio no encontrado')
    }

    const businessId = service.business_id
    if (!businessId) {
      throw new Error('Negocio no encontrado')
    }

    // Get business config and MP integration
    const { data: business } = await supabase
      .from('businesses')
      .select('name, slug')
      .eq('id', businessId)
      .single()

    const { data: mpIntegration } = await supabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) {
      throw new Error('El negocio no tiene Mercado Pago conectado')
    }

    // Create a pending_bookings record to store the booking data temporarily
    const pendingBookingId = crypto.randomUUID()

    // Store in database (we'll create this table)
    const { error: insertError } = await supabase
      .from('pending_bookings')
      .insert({
        id: pendingBookingId,
        service_id: bookingData.serviceId,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        client_name: bookingData.clientName,
        client_phone: bookingData.clientPhone,
        client_email: bookingData.clientEmail || null,
        addons: bookingData.addons || [],
        payment_amount: bookingData.paymentAmount,
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appointments.devora.lat'
    const businessSlug = business?.slug || 'siv-nails'

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
          unit_price: bookingData.paymentAmount,
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
  } catch (error: any) {
    console.error('Error creating pending booking preference:', error)
    return { success: false, error: error.message }
  }
}

