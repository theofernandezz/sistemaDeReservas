import Link from 'next/link'
import { Check, CalendarCheck, Calendar, ExternalLink, Clock, AlertCircle, XCircle, Loader2, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getAppointmentById } from '@/app/actions'
import { createClient } from '@/utils/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getAppUrl } from '@/lib/config'
import CopyLinkButton from './copy-link-button'

interface SuccessPageProps {
  searchParams: Promise<{ id?: string; appointment?: string; pending?: string; status?: string }>
  params: Promise<{ slug: string }>
}

function generateGoogleCalendarUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  description: string
): string {
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}/, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: description,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function generateIcsContent(
  title: string,
  startDate: Date,
  endDate: Date,
  description: string
): string {
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}/, '').replace('Z', '')

  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}Z
DTEND:${formatDate(endDate)}Z
SUMMARY:${title}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`
}

export default async function SuccessPage({ searchParams, params }: SuccessPageProps) {
  const { id, appointment: appointmentId, pending: pendingId, status: urlStatus } = await searchParams
  const { slug } = await params

  let appointment = null
  let pendingBooking = null

  // First try to get appointment by ID
  const bookingId = id || appointmentId
  if (bookingId) {
    const result = await getAppointmentById(bookingId)
    if (result.success && result.data) {
      appointment = result.data
    }
  }

  // If pending ID provided, check pending_bookings table
  if (pendingId) {
    const supabase = await createClient()

    // First check if payment was completed (converted_appointment_id exists)
    const { data: pending } = await supabase
      .from('pending_bookings')
      .select('*, service:services(name)')
      .eq('id', pendingId)
      .single()

    if (pending) {
      pendingBooking = pending

      // If converted, get the actual appointment
      if (pending.converted_appointment_id) {
        const result = await getAppointmentById(pending.converted_appointment_id)
        if (result.success && result.data) {
          appointment = result.data
        }
      }
    }
  }

  // Determine payment status
  // @ts-ignore - payment_status may exist
  const paymentStatus = appointment?.payment_status as string | undefined
  const appointmentStatus = appointment?.status
  const pendingStatus = pendingBooking?.status

  // Check if this was a failed/pending redirect from MP
  const isPaymentPending = paymentStatus === 'pending' || urlStatus === 'pending' || pendingStatus === 'pending_payment'
  const isPaymentFailed = urlStatus === 'failure'
  const isConfirmed = paymentStatus === 'paid' || appointmentStatus === 'confirmed' || pendingStatus === 'paid'

  const startDate = appointment ? new Date(appointment.start_time) : (pendingBooking ? new Date(pendingBooking.start_time) : null)
  const endDate = appointment ? new Date(appointment.end_time) : (pendingBooking ? new Date(pendingBooking.end_time) : null)
  const serviceName = appointment?.service?.name || (pendingBooking?.service as any)?.name || 'Cita'

  const googleCalendarUrl = startDate && endDate && isConfirmed
    ? generateGoogleCalendarUrl(
      `${serviceName}`,
      startDate,
      endDate,
      `Tu cita de ${serviceName}`
    )
    : null

  const icsContent = startDate && endDate && isConfirmed
    ? generateIcsContent(
      `${serviceName}`,
      startDate,
      endDate,
      `Tu cita de ${serviceName}`
    )
    : null

  const icsDataUrl = icsContent
    ? `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`
    : null

  // PENDING PAYMENT STATE
  if (isPaymentPending && !isConfirmed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Clock className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Pago Pendiente</h1>
              <p className="text-muted-foreground text-sm">
                Tu reserva está guardada pero necesita confirmación de pago.
              </p>
            </div>

            {appointment && startDate && (
              <div className="bg-secondary/30 rounded-xl p-4 text-left space-y-3">
                <h3 className="font-semibold text-lg">{serviceName}</h3>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="font-medium">
                      {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="font-medium">{format(startDate, 'HH:mm')} hs</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">¿Qué debo hacer?</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    Si elegiste pagar en efectivo (Rapipago/Pago Fácil), tenés hasta 3 días para completar el pago. Si no, la reserva se cancelará automáticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button asChild className="w-full h-11">
                <Link href={`/${slug}`}>
                  Volver al Inicio
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // FAILED PAYMENT STATE
  if (isPaymentFailed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="relative flex items-center justify-center w-full h-full rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <XCircle className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Pago Rechazado</h1>
              <p className="text-muted-foreground text-sm">
                No pudimos procesar tu pago. Por favor, intenta nuevamente.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Button asChild className="w-full h-11">
                <Link href={`/${slug}`}>
                  Intentar de Nuevo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // SUCCESS STATE (payment confirmed)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">

          {/* Success Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-full h-full rounded-full bg-primary/10 text-primary">
              <CalendarCheck className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-background">
              <Check className="w-4 h-4 font-bold" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">¡Reserva Confirmada!</h1>
            <p className="text-muted-foreground text-sm">
              Tu cita ha sido agendada exitosamente.
            </p>
          </div>

          {/* Appointment Details */}
          {appointment && startDate && (
            <div className="bg-secondary/30 rounded-xl p-4 text-left space-y-3">
              <h3 className="font-semibold text-lg">{serviceName}</h3>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">
                    {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora</span>
                  <span className="font-medium">{format(startDate, 'HH:mm')} hs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{appointment.client_name}</span>
                </div>
                {appointment.service?.price && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold text-primary">${appointment.service.price}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Buttons */}
          {startDate && googleCalendarUrl && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">Agregar a tu calendario:</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 h-11" size="sm">
                  <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <Calendar className="w-4 h-4 mr-2" />
                    Google
                    <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                  </a>
                </Button>
                {icsDataUrl && (
                  <Button asChild variant="outline" className="flex-1 h-11" size="sm">
                    <a href={icsDataUrl} download="cita.ics">
                      <Calendar className="w-4 h-4 mr-2" />
                      Apple / Outlook
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Email Reminder */}
          {appointment?.client_email && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg p-4 text-left">
              <p className="text-sm text-green-900 dark:text-green-100 leading-relaxed">
                <span className="font-medium">📧 Revisá tu email:</span> Te enviamos un link para que puedas reprogramar o cancelar tu turno si lo necesitás.
              </p>
            </div>
          )}

          {/* Copy Management Link */}
          {appointment && (
            <CopyLinkButton link={`${getAppUrl()}/cancel/${appointment.id}`} />
          )}

          {/* Home Button */}
          <div className="pt-4">
            <Button asChild className="w-full h-11">
              <Link href={`/${slug}`}>
                Volver al Inicio
              </Link>
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
