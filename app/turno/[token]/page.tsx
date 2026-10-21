import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Clock, Info } from 'lucide-react'
import { getAppointmentByToken } from '@/app/actions/manage-appointment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ManagedAppointmentView } from '@/lib/manage-appointment-types'
import ManageActions, { type RescheduleDateOption } from './manage-actions'

export const metadata: Metadata = {
  title: 'Gestionar turno',
  description: 'Cancelá o reprogramá tu turno de forma rápida y sencilla.',
  robots: { index: false, follow: false },
  // The token lives in the URL: never leak it through the Referer header.
  referrer: 'no-referrer',
}

const AR_TZ = 'America/Argentina/Buenos_Aires'
const DAYS_AHEAD = 30
const DAY_MS = 24 * 60 * 60 * 1000
const PAID_STATUSES = ['paid', 'pending_confirmation'] as const

interface PageProps {
  params: Promise<{ token: string }>
}

interface PageWrapperProps {
  children: React.ReactNode
  businessName: string
  businessSlug: string
}

function PageWrapper({ children, businessName, businessSlug }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-pink-100 selection:text-pink-900">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link
            href={businessSlug ? `/${businessSlug}` : '/'}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-lg shadow-sm">
              {businessName.charAt(0).toUpperCase()}
            </div>
            <span className="font-serif font-bold tracking-tight text-xl">{businessName}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">{children}</div>
      </main>
    </div>
  )
}

// Today + next days, as Argentina calendar dates (the server decides "today", not the browser).
function buildDateOptions(): RescheduleDateOption[] {
  const now = Date.now()
  return Array.from({ length: DAYS_AHEAD }, (_, index) => {
    const instant = new Date(now + index * DAY_MS)
    const value = new Intl.DateTimeFormat('en-CA', {
      timeZone: AR_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant)
    const noon = new Date(`${value}T12:00:00Z`)
    return {
      value,
      weekday: noon.toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' }),
      label: noon.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    }
  })
}

function cancellationPolicy(hours: number): string {
  return hours > 0
    ? `Podés cancelar hasta ${hours} ${hours === 1 ? 'hora' : 'horas'} antes del turno.`
    : 'Podés cancelar hasta el momento del turno.'
}

function AppointmentSummary({ view }: { view: ManagedAppointmentView }) {
  const start = new Date(view.startTime)
  const dateStr = start.toLocaleDateString('es-AR', { dateStyle: 'full', timeZone: AR_TZ })
  const timeStr = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: AR_TZ })

  return (
    <div className="bg-muted/30 p-6 border-b border-border/50 relative">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <Badge variant="secondary" className="mb-2 font-medium bg-background/80 backdrop-blur-sm border-border/50">
            Reserva #{view.id.slice(0, 8)}
          </Badge>
          <h2 className="font-serif font-bold text-xl leading-tight">{view.serviceName ?? 'Servicio'}</h2>
        </div>
        {view.servicePrice !== null && (
          <span className="text-lg font-bold text-primary">${view.servicePrice}</span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground bg-background/50 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="capitalize font-medium text-foreground">{dateStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">{timeStr} hs</span>
        </div>
      </div>

      <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-background rounded-full border border-border/50" />
      <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-background rounded-full border border-border/50" />
    </div>
  )
}

export default async function ManageAppointmentPage({ params }: PageProps) {
  const { token } = await params
  const result = await getAppointmentByToken(token)

  if (!result.success) {
    return (
      <PageWrapper businessName="Reservas" businessSlug="">
        <Card className="border-border/50 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold tracking-tight">Link no válido</h1>
            <p className="text-muted-foreground">
              Este link no es válido o ya no está disponible. Si necesitás gestionar tu turno, revisá el último
              mail que recibiste o contactá al negocio.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </Card>
      </PageWrapper>
    )
  }

  const view = result.data
  const businessName = view.businessName ?? 'Reservas'
  const businessSlug = view.businessSlug ?? ''
  const backHref = businessSlug ? `/${businessSlug}` : '/'

  if (view.status === 'cancelled') {
    return (
      <PageWrapper businessName={businessName} businessSlug={businessSlug}>
        <Card className="border-border/50 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" aria-hidden="true" />
          </div>
          <div className="space-y-2" role="status">
            <h1 className="text-2xl font-serif font-bold tracking-tight">Turno cancelado</h1>
            <p className="text-muted-foreground">Esta reserva está cancelada. El horario ya quedó liberado.</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href={backHref}>Volver a {businessName}</Link>
          </Button>
        </Card>
      </PageWrapper>
    )
  }

  const hasPaymentToRefund = (PAID_STATUSES as readonly string[]).includes(view.paymentStatus ?? '')

  return (
    <PageWrapper businessName={businessName} businessSlug={businessSlug}>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-foreground">Gestionar turno</h1>
          <p className="text-muted-foreground">Podés reprogramar o cancelar tu reserva</p>
        </div>

        <Card className="border-border/50 shadow-xl overflow-hidden bg-card">
          <AppointmentSummary view={view} />

          <div className="p-6 pt-8 space-y-4">
            <ManageActions token={token} view={view} dateOptions={buildDateOptions()} />

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <div className="space-y-1">
                <p>{cancellationPolicy(view.cancellationHours)}</p>
                {hasPaymentToRefund && (
                  <p>Si cancelás un turno con pago o seña, la devolución la gestiona directamente {businessName}.</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            Volver a {businessName}
          </Link>
        </div>
      </div>
    </PageWrapper>
  )
}
