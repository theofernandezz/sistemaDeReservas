'use server'

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { ServerActionResponse } from '@/types/database.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentProofData {
  id: string
  start_time: string
  end_time: string
  client_name: string
  service_id: string
  payment_status: string | null
  proof_url: string | null
  proof_uploaded_at: string | null
  proof_expires_at: string | null
  proof_auto_approve_at: string | null
  proof_rejection_reason: string | null
  business_id: string
  service: {
    name: string
    price: number
  } | null
  business: {
    name: string
    slug: string
    phone: string | null
    settings: Record<string, unknown>
    deposit_percentage: number
  } | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Approve a payment proof.
 * Requires an authenticated session belonging to the business owner.
 */
export async function approvePaymentProof(
  appointmentId: string
): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // Verify the appointment belongs to this user's business
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, business_id, payment_status')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', appointment.business_id)
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      return { success: false, error: 'No tenés permiso para aprobar este comprobante' }
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ payment_status: 'paid' })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('Error approving payment proof:', updateError)
      return { success: false, error: 'Error al aprobar el comprobante' }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('approvePaymentProof error:', error)
    return { success: false, error: 'Error inesperado al aprobar el comprobante' }
  }
}

/**
 * Reject a payment proof.
 * Requires an authenticated session belonging to the business owner.
 */
export async function rejectPaymentProof(
  appointmentId: string,
  reason?: string
): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // Verify the appointment belongs to this user's business
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, business_id, payment_status')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', appointment.business_id)
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      return { success: false, error: 'No tenés permiso para rechazar este comprobante' }
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        payment_status: 'rejected',
        proof_rejection_reason: reason ?? null,
      })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('Error rejecting payment proof:', updateError)
      return { success: false, error: 'Error al rechazar el comprobante' }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('rejectPaymentProof error:', error)
    return { success: false, error: 'Error inesperado al rechazar el comprobante' }
  }
}

/**
 * Get appointment data for the public "Mi reserva" page.
 * No authentication required.
 */
export async function getPublicAppointmentWithProof(
  appointmentId: string
): Promise<ServerActionResponse<AppointmentProofData>> {
  try {
    // Service client — public page, no session
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        client_name,
        service_id,
        payment_status,
        proof_url,
        proof_uploaded_at,
        proof_expires_at,
        proof_auto_approve_at,
        business_id,
        service:services(name, price),
        business:businesses(name, slug, phone, settings, deposit_percentage)
      `)
      .eq('id', appointmentId)
      .single()

    if (error || !data) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    return {
      success: true,
      data: data as unknown as AppointmentProofData,
    }
  } catch (error: unknown) {
    console.error('getPublicAppointmentWithProof error:', error)
    return { success: false, error: 'Error al obtener la reserva' }
  }
}
