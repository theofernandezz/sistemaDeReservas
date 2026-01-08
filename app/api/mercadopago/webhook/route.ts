import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Webhook para notificaciones IPN de Mercado Pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('MP Webhook received:', JSON.stringify(body, null, 2))

    // MP envía diferentes tipos de notificaciones
    const type = body.type || body.topic
    const dataId = body.data?.id || body.id

    if (!dataId) {
      console.log('No data ID in webhook')
      return NextResponse.json({ received: true })
    }

    // Solo procesar notificaciones de pago
    if (type === 'payment') {
      await processPaymentNotification(dataId.toString())
    }

    // Siempre responder 200 para que MP no reintente
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    // Aún así responder 200 para evitar reintentos infinitos
    return NextResponse.json({ received: true })
  }
}

// MP también puede hacer GET para verificar el endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

async function processPaymentNotification(paymentId: string) {
  const supabase = await createClient()

  try {
    // First, try to find by pending_booking_id (new flow)
    await processPendingBookingPayment(supabase, paymentId)

    // Also check legacy appointments (old flow)
    await processLegacyAppointmentPayment(supabase, paymentId)

  } catch (error) {
    console.error('Error processing payment notification:', error)
  }
}

// NEW FLOW: Create appointment from pending_booking when payment is confirmed
async function processPendingBookingPayment(supabase: any, paymentId: string) {
  // Find pending bookings waiting for payment
  const { data: pendingBookings } = await supabase
    .from('pending_bookings')
    .select(`
      *,
      service:services(business_id)
    `)
    .eq('status', 'pending_payment')
    .not('mp_preference_id', 'is', null)

  if (!pendingBookings?.length) {
    console.log('No pending bookings found')
    return
  }

  for (const pending of pendingBookings) {
    // @ts-ignore
    const businessId = (pending.service as any)?.business_id
    if (!businessId) continue

    // Get access_token for this business
    const { data: mpIntegration } = await supabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) continue

    // Query payment from MP
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpIntegration.access_token}`,
        },
      }
    )

    if (!paymentResponse.ok) continue

    const payment = await paymentResponse.json()

    // Check if this payment matches this pending booking
    if (payment.metadata?.pending_booking_id !== pending.id) continue

    // Payment matches! Check status
    if (payment.status === 'approved') {
      console.log(`Payment ${paymentId} approved for pending booking ${pending.id}`)

      // Create the actual appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          service_id: pending.service_id,
          start_time: pending.start_time,
          end_time: pending.end_time,
          client_name: pending.client_name,
          client_phone: pending.client_phone,
          addons: pending.addons,
          status: 'confirmed',
          payment_status: 'paid',
          payment_id: paymentId,
          payment_amount: pending.payment_amount,
          mp_preference_id: pending.mp_preference_id,
        })
        .select()
        .single()

      if (appointmentError) {
        console.error('Error creating appointment from pending:', appointmentError)
        continue
      }

      // Update pending booking status
      await supabase
        .from('pending_bookings')
        .update({
          status: 'paid',
          converted_appointment_id: newAppointment.id,
        })
        .eq('id', pending.id)

      console.log(`Created appointment ${newAppointment.id} from pending booking ${pending.id}`)

      // TODO: Send confirmation email
      // TODO: Add to Google Calendar

      return // Found and processed, exit
    }
  }
}

// LEGACY FLOW: Update existing appointment status
async function processLegacyAppointmentPayment(supabase: any, paymentId: string) {
  const { data: pendingAppointments } = await supabase
    .from('appointments')
    .select(`
      id,
      mp_preference_id,
      payment_status,
      service:services(business_id)
    `)
    .eq('payment_status', 'pending')
    .not('mp_preference_id', 'is', null)

  if (!pendingAppointments?.length) {
    return
  }

  for (const apt of pendingAppointments) {
    // @ts-ignore
    const businessId = (apt.service as any)?.business_id
    if (!businessId) continue

    const { data: mpIntegration } = await supabase
      .from('mp_integrations')
      .select('access_token')
      .eq('business_id', businessId)
      .single()

    if (!mpIntegration?.access_token) continue

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpIntegration.access_token}`,
        },
      }
    )

    if (!paymentResponse.ok) continue

    const payment = await paymentResponse.json()

    if (payment.metadata?.booking_id !== apt.id) continue

    if (payment.status === 'approved') {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          payment_id: paymentId,
          status: 'confirmed',
        })
        .eq('id', apt.id)

      if (updateError) {
        console.error('Error updating appointment:', updateError)
      } else {
        console.log(`Appointment ${apt.id} confirmed with payment ${paymentId}`)
      }
      return
    }
  }
}
