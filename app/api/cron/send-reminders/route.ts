import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/server'
import { sendAppointmentReminder } from '@/lib/email'
import { format, addHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { toUTC, fromUTC } from '@/lib/utils/timezone'

// Secret para autenticar el cron job
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // CRON_SECRET is REQUIRED in production
  if (!CRON_SECRET) {
    console.error('CRITICAL: CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Service unavailable - cron not configured' },
      { status: 503 }
    )
  }

  // Verificar autenticación - soporta header de Vercel Cron y query param para testing
  const authHeader = request.headers.get('authorization')
  const urlSecret = request.nextUrl.searchParams.get('secret')

  // Vercel Cron envía: Authorization: Bearer <CRON_SECRET>
  const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret

  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Calcular ventana de tiempo: turnos en las próximas 24-25 horas
    const now = new Date()
    const tomorrow = addHours(now, 24)
    const tomorrowEnd = addHours(now, 25)

    // Query turnos que:
    // 1. Están en la ventana de 24-25hs
    // 2. No tienen email_reminder_sent = true
    // 3. Status es confirmed (no cancelled ni pending)
    // 4. Tienen email del cliente
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        client_name,
        client_email,
        client_phone,
        email_reminder_sent,
        business_id,
        service:services(id, name, price)
      `)
      .gte('start_time', toUTC(tomorrow))
      .lt('start_time', toUTC(tomorrowEnd))
      .eq('status', 'confirmed')
      .eq('email_reminder_sent', false)
      .not('client_email', 'is', null)

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    if (!appointments?.length) {
      return NextResponse.json({
        success: true,
        message: 'No appointments to remind',
        count: 0
      })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Enviar recordatorio a cada turno
    for (const apt of appointments) {
      const startTime = new Date(apt.start_time)
      const endTime = new Date(apt.end_time)
      // service viene del join de Supabase - extraer el objeto del array si es necesario
      const rawService = apt.service as unknown
      const service = Array.isArray(rawService) ? rawService[0] : rawService as { id: string; name: string; price: number } | null

      if (!service || !apt.client_email || !apt.business_id) continue

      const emailResult = await sendAppointmentReminder({
        id: apt.id,
        clientName: apt.client_name,
        clientEmail: apt.client_email,
        clientPhone: apt.client_phone || undefined,
        serviceName: service.name,
        servicePrice: service.price,
        date: format(startTime, "EEEE d 'de' MMMM", { locale: es }),
        time: format(startTime, 'HH:mm'),
        startDateTime: startTime,
        endDateTime: endTime
      }, apt.business_id)

      if (emailResult.success) {
        // Marcar como enviado
        await supabase
          .from('appointments')
          .update({
            email_reminder_sent: true,
            email_reminder_sent_at: new Date().toISOString()
          })
          .eq('id', apt.id)

        results.sent++
      } else {
        results.failed++
        results.errors.push(`${apt.id}: ${emailResult.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${results.sent} reminders, ${results.failed} failed`,
      ...results
    })

  } catch (error: unknown) {
    console.error('Cron error:', error)
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// También permitir POST para flexibilidad
export async function POST(request: NextRequest) {
  return GET(request)
}
