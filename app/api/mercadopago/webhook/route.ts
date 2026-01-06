import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Webhook para notificaciones IPN de Mercado Pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('MP Webhook received:', JSON.stringify(body, null, 2))

    // MP envía diferentes tipos de notificaciones
    // Para pagos, el type es "payment" o el topic es "payment"
    const type = body.type || body.topic
    const dataId = body.data?.id || body.id

    if (!dataId) {
      console.log('No data ID in webhook')
      return NextResponse.json({ received: true })
    }

    // Solo procesar notificaciones de pago
    if (type === 'payment') {
      const supabase = await createClient()

      // Obtener detalles del pago desde MP
      // Nota: Necesitamos el access_token del vendedor para consultar
      // Por ahora solo logueamos, luego implementamos la validación completa

      console.log('Payment notification:', { dataId })

      // TODO: Implementar cuando tengamos el flujo de pagos
      // 1. Buscar qué negocio corresponde (por metadata o user_id)
      // 2. Obtener access_token del negocio
      // 3. Consultar estado del pago en MP API
      // 4. Si está aprobado, actualizar booking a confirmed
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
