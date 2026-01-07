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
        depositPercentage: business?.deposit_percentage || 50,
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
 */
export async function createBookingPaymentPreference(
  appointmentId: string
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

    // Calculate deposit amount
    const depositPercentage = business?.deposit_percentage || 50
    // @ts-ignore
    const totalPrice = (appointment.service as any)?.price || 0
    const depositAmount = Math.round(totalPrice * depositPercentage / 100)

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
          title: `Seña - ${(appointment.service as any)?.name}`,
          description: `Reserva en ${business?.name}`,
          quantity: 1,
          unit_price: depositAmount,
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
        payment_amount: depositAmount,
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
