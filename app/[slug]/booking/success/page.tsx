import Link from 'next/link'
import { Check, CalendarCheck, Calendar, ExternalLink, Clock, AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getAppointmentById } from '@/app/actions'
import { createClient } from '@/utils/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getAppUrl } from '@/lib/config'
import CopyLinkButton from './copy-link-button'
import { TransferDetailsCard } from '@/components/booking/transfer-details-card'
import { ProofUploadCard } from '@/components/booking/proof-upload-card'
import { BusinessSettings } from '@/types/database.types'

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

  const supabase = await createClient()

  // Fetch business info to get phone and manual payment settings
  const { data: business } = await supabase
    .from('businesses')
    .select('name, phone, settings, deposit_percentage')
    .eq('slug', slug)
    .single()

  const settings = business?.settings as BusinessSettings | undefined

  if (bookingId) {
    const result = await getAppointmentById(bookingId)
    if (result.success && result.data) {
      appointment = result.data
    }
  }

  // If pending ID provided, check pending_bookings table
  if (pendingId) {
    // First check if payment was completed (converted_appointment_id exists)
    const { data: pending } = await supabase
      .from('pending_bookings')
      .select('*, service:services(name, price)')
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
  const paymentStatus = appointment?.payment_status as string | undefined
  const appointmentStatus = appointment?.status
  const pendingStatus = pendingBooking?.status

  // Check if this was a failed/pending redirect from MP
  const isPaymentPending = paymentStatus === 'pending' || urlStatus === 'pending' || pendingStatus === 'pending_payment'
  const isPaymentFailed = urlStatus === 'failure'
  const isConfirmed = paymentStatus === 'paid' || appointmentStatus === 'confirmed' || pendingStatus === 'paid'

  const startDate = appointment ? new Date(appointment.start_time) : (pendingBooking ? new Date(pendingBooking.start_time) : null)
  const endDate = appointment ? new Date(appointment.end_time) : (pendingBooking ? new Date(pendingBooking.end_time) : null)
  const serviceName = appointment?.service?.name || (pendingBooking?.service as { name: string; price: number } | null)?.name || 'Cita'
  const clientName = appointment?.client_name || pendingBooking?.client_name
  const clientEmail = appointment?.client_email || pendingBooking?.client_email
  const servicePrice = appointment?.service?.price || (pendingBooking?.service as { name: string; price: number } | null)?.price

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
    const isManualTransfer = settings?.paymentFlowMode === 'manual_transfer' && settings?.manualTransfer?.enabled
    
    // Check if we have what we need to show the manual payment UI
    if (isManualTransfer && settings?.manualTransfer) {
      const depositPercentage = business?.deposit_percentage || 100
      const totalAmount = servicePrice || 0
      const depositAmount = Math.round(totalAmount * (depositPercentage / 100))
      
      const formattedDate = startDate ? format(startDate, 'dd/MM/yyyy') : ''
      const formattedTime = startDate ? format(startDate, 'HH:mm') : ''
      const waMessage = `Hola! Acá te envío el comprobante de mi turno para el ${formattedDate} a las ${formattedTime} hs - ${serviceName}.`
      const cleanPhone = business?.phone?.replace(/[^0-9]/g, '') || ''
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`

      return (
        <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col items-center justify-center p-4">
          <Card className="max-w-xl w-full border border-border/40 shadow-2xl shadow-black/5 bg-card/60 backdrop-blur-xl rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <CardContent className="pt-8 pb-8 px-6 sm:px-10 space-y-5">
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-20 h-20 animate-in zoom-in duration-500 delay-150 fill-mode-both">
                  <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-500/10 rounded-full animate-ping duration-1000" />
                  <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/20 shadow-inner">
                    <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                  <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-500">Paso Final</p>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground text-balance leading-tight">Reserva <br/> Pre-confirmada</h1>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Tu lugar {startDate ? `para el ${format(startDate, "EEEE d", { locale: es })}` : 'está guardado'}, pero falta tu pago para confirmarlo definitivamente.
                  </p>
                </div>
              </div>

              <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
                <TransferDetailsCard 
                  alias={settings.manualTransfer.alias || null}
                  cvu={settings.manualTransfer.cvu || null}
                  accountHolder={settings.manualTransfer.accountHolder || null}
                  message={null}
                  totalAmount={totalAmount}
                  depositAmount={depositAmount}
                  depositPercentage={depositPercentage}
                />
              </div>

              <div className="pt-2 animate-in fade-in-from-bottom-2 duration-500 delay-700 fill-mode-both">
                <ProofUploadCard
                  appointmentId={appointment?.id || ''}
                  currentProofUrl={(appointment as unknown as Record<string, unknown>)?.proof_url as string | null}
                />
              </div>

              {appointment?.id && (
                <p className="text-xs text-center text-muted-foreground/70 -mt-1">
                  ¿Cerraste la página?{' '}
                  <a
                    href={`/reserva/${appointment.id}`}
                    className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
                  >
                    Accedé a tu reserva
                  </a>
                </p>
              )}

              <div className="pt-0 animate-in fade-in duration-500 delay-1000 fill-mode-both">
                <Button asChild variant="ghost" className="w-full rounded-xl hover:bg-secondary/50">
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

    // Default Pending state (e.g., Mercado Pago pending like Rapipago)
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/40 shadow-2xl shadow-black/5 bg-card/60 backdrop-blur-xl rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 animate-in zoom-in duration-500 delay-150 fill-mode-both">
              <div className="absolute inset-0 bg-amber-400/20 dark:bg-amber-500/10 rounded-full animate-ping duration-1000" />
              <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/20 shadow-inner">
                <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
              <h1 className="text-3xl font-bold tracking-tighter text-balance leading-tight">Pago <br/> Pendiente</h1>
              <p className="text-muted-foreground text-sm">
                Tu reserva está guardada pero necesita confirmación de pago de Mercado Pago.
              </p>
            </div>

            {startDate && (
              <div className="bg-secondary/30 rounded-2xl p-5 text-left space-y-4 border border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 fill-mode-both">
                <h3 className="font-semibold text-lg">{serviceName}</h3>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="font-medium text-foreground">
                      {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="font-medium text-foreground">{format(startDate, 'HH:mm')} hs</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 animate-in fade-in duration-500 delay-700 fill-mode-both">
              <Button asChild className="w-full h-12 rounded-2xl text-base transition-all hover:shadow-lg hover:-translate-y-0.5">
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

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col items-center justify-center p-4">
      <Card className="max-w-lg w-full border border-border/40 shadow-2xl shadow-black/5 bg-card/60 backdrop-blur-xl rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <CardContent className="pt-10 pb-8 px-8 sm:px-12 text-center space-y-5">

          {/* Success Icon */}
          <div className="relative mx-auto w-24 h-24 animate-in zoom-in duration-500 delay-150 fill-mode-both">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping duration-1000" />
            <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-primary/10 to-primary/30 text-primary shadow-inner">
              <CalendarCheck className="w-10 h-10" strokeWidth={1.5} />
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white border-4 border-background shadow-lg animate-in zoom-in duration-300 delay-500 fill-mode-both">
              <Check className="w-4 h-4 font-bold" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Excelente</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-balance leading-tight">¡Reserva <br/> Confirmada!</h1>
            <p className="text-muted-foreground text-sm">
              Tu cita ha sido agendada exitosamente.
            </p>
          </div>

          {/* Appointment Details */}
          {startDate && (
            <div className="bg-secondary/30 border border-border/50 rounded-2xl p-5 text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
              <h3 className="font-semibold text-lg">{serviceName}</h3>
              <Separator />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium text-foreground">
                    {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora</span>
                  <span className="font-medium text-foreground">{format(startDate, 'HH:mm')} hs</span>
                </div>
                {clientName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium text-foreground">{clientName}</span>
                  </div>
                )}
                {servicePrice && (
                  <div className="flex justify-between pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="font-bold text-primary">${servicePrice}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Buttons */}
          {startDate && googleCalendarUrl && (
            <div className="space-y-3 pt-0 animate-in fade-in duration-500 delay-700 fill-mode-both">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Agregar a tu calendario</p>
              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1 h-10 text-xs rounded-xl border-border/60 hover:bg-secondary/50">
                  <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <Calendar className="w-3 h-3 mr-2" />
                    Google
                  </a>
                </Button>
                {icsDataUrl && (
                  <Button asChild variant="outline" className="flex-1 h-10 text-xs rounded-xl border-border/60 hover:bg-secondary/50">
                    <a href={icsDataUrl} download="cita.ics">
                      <Calendar className="w-3 h-3 mr-2" />
                      Apple / Outlook
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Email Reminder */}
          {clientEmail && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-3 text-left animate-in fade-in duration-500 delay-1000 fill-mode-both">
              <p className="text-xs text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10 leading-relaxed">
                <span className="font-medium">📧 Revisá tu email:</span> Te enviamos un link para que puedas reprogramar o cancelar tu turno si lo necesitás.
              </p>
            </div>
          )}

          {/* Copy Management Link */}
          {appointment && (
            <div className="animate-in fade-in duration-500 delay-1000 fill-mode-both">
              <CopyLinkButton link={`${getAppUrl()}/cancel/${appointment.id}`} />
            </div>
          )}

          {/* Home Button */}
          <div className="pt-2 animate-in fade-in duration-500 delay-1200 fill-mode-both">
            <Button asChild className="w-full h-12 rounded-2xl text-base shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5">
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
