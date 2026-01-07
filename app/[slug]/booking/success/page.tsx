import Link from 'next/link'
import { Check, CalendarCheck, Calendar, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getAppointmentById } from '@/app/actions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SuccessPageProps {
  searchParams: Promise<{ id?: string }>
}

function generateGoogleCalendarUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  description: string
): string {
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

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
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', '')

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

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { id } = await searchParams

  let appointment = null
  if (id) {
    const result = await getAppointmentById(id)
    if (result.success && result.data) {
      appointment = result.data
    }
  }

  const startDate = appointment ? new Date(appointment.start_time) : null
  const endDate = appointment ? new Date(appointment.end_time) : null
  const serviceName = appointment?.service?.name || 'Cita en Siv Nails'

  const googleCalendarUrl = startDate && endDate
    ? generateGoogleCalendarUrl(
      `${serviceName} - Siv Nails`,
      startDate,
      endDate,
      `Tu cita de ${serviceName} en Siv Nails Studio`
    )
    : null

  const icsContent = startDate && endDate
    ? generateIcsContent(
      `${serviceName} - Siv Nails`,
      startDate,
      endDate,
      `Tu cita de ${serviceName} en Siv Nails Studio`
    )
    : null

  const icsDataUrl = icsContent
    ? `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`
    : null

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
          {startDate && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">Agregar a tu calendario:</p>
              <div className="flex gap-2">
                {googleCalendarUrl && (
                  <Button asChild variant="outline" className="flex-1 h-11" size="sm">
                    <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                      <Calendar className="w-4 h-4 mr-2" />
                      Google
                      <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                    </a>
                  </Button>
                )}
                {icsDataUrl && (
                  <Button asChild variant="outline" className="flex-1 h-11" size="sm">
                    <a href={icsDataUrl} download="cita-sivnails.ics">
                      <Calendar className="w-4 h-4 mr-2" />
                      Apple / Outlook
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Home Button */}
          <div className="pt-4">
            <Button asChild className="w-full h-11">
              <Link href="/">
                Volver al Inicio
              </Link>
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
