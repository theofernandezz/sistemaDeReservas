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

    const businessId = appointment.service?.business_id
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
    const totalPrice = appointment.service?.price || 0
    const depositAmount = Math.round(totalPrice * depositPercentage / 100)

    // Create MP preference
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const businessSlug = business?.slug || ''

    const preference = await mpCreatePreference(
      mpIntegration.access_token,
      [
        {
          id: appointmentId,
          title: `Seña - ${appointment.service?.name}`,
          description: `Reserva en ${business?.name}`,
          quantity: 1,
          unit_price: depositAmount,
        }
      ],
      {
        booking_id: appointmentId,
        business_id: businessId,
      },
      {
        success: `${appUrl}/${businessSlug}/booking/success?appointment=${appointmentId}`,
        failure: `${appUrl}/${businessSlug}/booking/failed?appointment=${appointmentId}`,
        pending: `${appUrl}/${businessSlug}/booking/pending?appointment=${appointmentId}`,
      }
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
