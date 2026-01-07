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
    // Buscar la reserva por mp_preference_id o payment_id
    // Primero necesitamos obtener info del pago desde MP
    // Para eso necesitamos el access_token del negocio

    // Opción 1: Buscar por external_reference (que es el appointment_id)
    // Opción 2: Consultar MP API con el payment_id

    // Por ahora, buscamos reservas pendientes y verificamos el pago
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
      console.log('No pending appointments with MP preference found')
      return
    }

    // Para cada reserva pendiente, verificar con su negocio
    for (const apt of pendingAppointments) {
      // @ts-ignore - Supabase types are complex for nested selects
      const businessId = (apt.service as any)?.business_id
      if (!businessId) continue

      // Obtener access_token del negocio
      const { data: mpIntegration } = await supabase
        .from('mp_integrations')
        .select('access_token')
        .eq('business_id', businessId)
        .single()

      if (!mpIntegration?.access_token) continue

      // Consultar el pago en MP
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

      // Verificar que el pago corresponde a esta reserva
      if (payment.metadata?.booking_id !== apt.id) continue

      // Si el pago está aprobado, confirmar la reserva
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

          // TODO: Enviar email de confirmación
          // TODO: Crear evento en Google Calendar
        }
        return // Encontramos la reserva, salimos
      }
    }

    console.log(`Payment ${paymentId} processed, no matching pending appointment found`)

  } catch (error) {
    console.error('Error processing payment notification:', error)
  }
}
