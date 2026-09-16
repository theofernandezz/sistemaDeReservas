import Link from 'next/link'
import { Check, Calendar, Clock, XCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAppointmentById } from '@/app/actions'
import { createClient } from '@/utils/supabase/server'
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

const AR_TZ = 'America/Argentina/Buenos_Aires'
const formatArDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString('es-AR', { ...options, timeZone: AR_TZ })
const formatArTime = (date: Date) =>
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: AR_TZ })

// Contenedor compartido por todos los estados de esta página — misma box
// que el resto del flujo de reserva (calendario / confirmar).
function StatusBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[560px] border border-border rounded-[20px] p-8 sm:p-10 flex flex-col items-center text-center gap-6">
        {children}
      </div>
    </div>
  )
}

function StatusIcon({ tone, children }: { tone: 'success' | 'pending' | 'failed'; children: React.ReactNode }) {
  const color = tone === 'success' ? '#16a34a' : tone === 'failed' ? '#dc2626' : 'oklch(0.556 0 0)'
  return (
    <div
      className="w-16 h-16 rounded-full border-[1.5px] flex items-center justify-center"
      style={{ borderColor: color, color }}
    >
      {children}
    </div>
  )
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

      return (
        <StatusBox>
          <StatusIcon tone="pending">
            <Clock className="w-6 h-6" strokeWidth={1.75} />
          </StatusIcon>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Reserva pre-confirmada</h1>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tu lugar {startDate ? `para el ${formatArDate(startDate, { weekday: 'long', day: 'numeric' })}` : 'está guardado'}, pero falta tu pago para confirmarlo definitivamente.
            </p>
          </div>

          <div className="w-full border border-border rounded-2xl p-4 text-left flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span>Total del servicio</span>
              <span className="font-semibold">${totalAmount}</span>
            </div>
            {depositPercentage < 100 && (
              <div className="flex justify-between text-sm">
                <span>Seña a transferir ({depositPercentage}%)</span>
                <span className="font-bold" style={{ color: '#b45309' }}>${depositAmount}</span>
              </div>
            )}
          </div>

          <div className="w-full">
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

          <div className="w-full">
            <ProofUploadCard
              appointmentId={appointment?.id || ''}
              currentProofUrl={(appointment as unknown as Record<string, unknown>)?.proof_url as string | null}
            />
          </div>

          {appointment?.id && (
            <p className="text-xs text-muted-foreground -mt-2">
              ¿Cerraste la página?{' '}
              <a href={`/reserva/${appointment.id}`} className="underline underline-offset-2 hover:text-foreground transition-colors">
                Accedé a tu reserva
              </a>
            </p>
          )}

          <a
            href={`/${slug}`}
            className="w-full h-[46px] rounded-[11px] border border-border flex items-center justify-center text-sm font-semibold hover:border-muted-foreground/40 transition-colors"
          >
            Volver al inicio
          </a>
        </StatusBox>
      )
    }

    // Default Pending state (e.g., Mercado Pago pending like Rapipago)
    return (
      <StatusBox>
        <StatusIcon tone="pending">
          <Clock className="w-6 h-6" strokeWidth={1.75} />
        </StatusIcon>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Pago pendiente</h1>
          <p className="text-muted-foreground text-sm">
            Tu reserva está guardada pero necesita confirmación de pago de Mercado Pago.
          </p>
        </div>

        {startDate && (
          <div className="w-full border border-border rounded-2xl p-5 text-left flex flex-col gap-3">
            <h3 className="font-semibold">{serviceName}</h3>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium">{formatArDate(startDate, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hora</span>
              <span className="font-medium">{formatArTime(startDate)} hs</span>
            </div>
          </div>
        )}

        <Link href={`/${slug}`} className="w-full">
          <Button className="w-full h-[46px] rounded-[11px]">Volver al inicio</Button>
        </Link>
      </StatusBox>
    )
  }

  // FAILED PAYMENT STATE
  if (isPaymentFailed) {
    return (
      <StatusBox>
        <StatusIcon tone="failed">
          <XCircle className="w-6 h-6" strokeWidth={1.75} />
        </StatusIcon>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Pago rechazado</h1>
          <p className="text-muted-foreground text-sm">
            No pudimos procesar tu pago. Por favor, intentá nuevamente.
          </p>
        </div>

        <Link href={`/${slug}`} className="w-full">
          <Button className="w-full h-[46px] rounded-[11px]">Intentar de nuevo</Button>
        </Link>
      </StatusBox>
    )
  }

  // SUCCESS STATE
  return (
    <StatusBox>
      <StatusIcon tone="success">
        <Check className="w-6 h-6" strokeWidth={2.5} />
      </StatusIcon>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Reserva confirmada</h1>
        <p className="text-muted-foreground text-sm">Tu cita fue agendada con éxito.</p>
      </div>

      {startDate && (
        <div className="w-full border border-border rounded-2xl p-5 text-left flex flex-col gap-2.5">
          <h3 className="font-semibold">{serviceName}</h3>
          <div className="h-px bg-border" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-medium">{formatArDate(startDate, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hora</span>
            <span className="font-medium">{formatArTime(startDate)} hs</span>
          </div>
          {clientName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clientName}</span>
            </div>
          )}
          {servicePrice && (
            <>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold">${servicePrice}</span>
              </div>
            </>
          )}
        </div>
      )}

      {startDate && googleCalendarUrl && (
        <div className="w-full flex flex-col gap-2.5">
          <span className="text-xs text-muted-foreground">Agregar a tu calendario</span>
          <div className="flex gap-2.5">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-[42px] rounded-[10px] border border-border flex items-center justify-center gap-1.5 text-sm font-medium hover:border-muted-foreground/40 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" /> Google
            </a>
            {icsDataUrl && (
              <a
                href={icsDataUrl}
                download="cita.ics"
                className="flex-1 h-[42px] rounded-[10px] border border-border flex items-center justify-center gap-1.5 text-sm font-medium hover:border-muted-foreground/40 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" /> Apple / Outlook
              </a>
            )}
          </div>
        </div>
      )}

      {clientEmail && (
        <div className="w-full flex gap-2.5 items-start text-left">
          <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Te enviamos un email con un link para reprogramar o cancelar tu turno si lo necesitás.
            Si no lo ves, revisá la carpeta de spam y marcalo como &quot;no es spam&quot; para no perderte los próximos.
          </p>
        </div>
      )}

      {appointment && (
        <CopyLinkButton link={`${getAppUrl()}/cancel/${appointment.id}`} />
      )}

      <Link href={`/${slug}`} className="w-full">
        <Button className="w-full h-[48px] rounded-[11px]">Volver al inicio</Button>
      </Link>
    </StatusBox>
  )
}
