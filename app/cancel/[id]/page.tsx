import { Metadata } from 'next'
import { getAppointmentById, canRescheduleAppointment } from '@/app/actions'
import { createClient } from '@/utils/supabase/server'
import AppointmentActions from './appointment-actions'
import { AlertCircle, CheckCircle2, Clock, Calendar as CalendarIcon, MapPin, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Gestionar Turno',
  description: 'Cancelá o reprogramá tu turno de forma rápida y sencilla.',
  robots: {
    index: false,
    follow: false,
  },
}

function PageWrapper({ children, businessSlug, businessName }: {
  children: React.ReactNode
  businessSlug: string
  businessName: string
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-pink-100 selection:text-pink-900">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href={businessSlug ? `/${businessSlug}` : '/'} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-lg shadow-sm">
              {businessName.charAt(0).toUpperCase()}
            </div>
            <span className="font-serif font-bold tracking-tight text-xl">{businessName}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}

export default async function CancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getAppointmentById(id)
  const appointment = result.data

  // Fetch business info separately (no FK from appointments to businesses in PostgREST)
  let business: { name: string; slug: string; address?: string; settings?: { businessHours?: unknown; slotInterval?: number } } | null = null
  if (appointment?.business_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('businesses')
      .select('name, slug, address, settings')
      .eq('id', appointment.business_id)
      .single()
    business = data
  }
  const businessName = business?.name || 'Reservas'
  const businessSlug = business?.slug || ''
  const businessAddress = business?.address || ''

  if (!result.success || !appointment) {
    return (
      <PageWrapper businessSlug={businessSlug} businessName={businessName}>
        <Card className="border-border/50 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold tracking-tight">Turno no encontrado</h1>
            <p className="text-muted-foreground">
              No pudimos encontrar la reserva. Verificá el link o contactanos si creés que es un error.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </Card>
      </PageWrapper>
    )
  }

  if (appointment.status === 'cancelled') {
    return (
      <PageWrapper businessSlug={businessSlug} businessName={businessName}>
        <Card className="border-border/50 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold tracking-tight">Turno Cancelado</h1>
            <p className="text-muted-foreground">
              Esta reserva ya fue cancelada exitosamente.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href={businessSlug ? `/${businessSlug}` : '/'}>Volver a {businessName}</Link>
          </Button>
        </Card>
      </PageWrapper>
    )
  }

  // Check if appointment can be rescheduled
  const eligibilityCheck = await canRescheduleAppointment(id)
  const canReschedule = eligibilityCheck.success && eligibilityCheck.data?.canReschedule || false
  const rescheduleMessage = eligibilityCheck.data?.reason

  // Get business settings from the appointment's business (no auth required)
  const businessHours = business?.settings?.businessHours
    ? JSON.stringify({
        schedule: business.settings.businessHours,
        slotInterval: business.settings.slotInterval || 30
      })
    : undefined

  // Format date and time
  const date = new Date(appointment.start_time)
  const dateStr = date.toLocaleDateString('es-AR', { dateStyle: 'full', timeZone: 'America/Argentina/Buenos_Aires' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  return (
    <PageWrapper businessSlug={businessSlug} businessName={businessName}>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-foreground">Gestionar Turno</h1>
          <p className="text-muted-foreground">
            Podés reprogramar o cancelar tu reserva
          </p>
        </div>

        <Card className="border-border/50 shadow-xl overflow-hidden bg-card">
          {/* Ticket Header style */}
          <div className="bg-muted/30 p-6 border-b border-border/50 relative">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <Badge variant="secondary" className="mb-2 font-medium bg-background/80 backdrop-blur-sm border-border/50">
                  Reserva #{appointment.id.slice(0, 8)}
                </Badge>
                <h3 className="font-serif font-bold text-xl leading-tight">{appointment.service?.name || 'Servicio'}</h3>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">${appointment.service?.price}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground bg-background/50 p-4 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="capitalize font-medium text-foreground">{dateStr}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{timeStr}hs</span>
              </div>
              {businessAddress && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{businessAddress}</span>
                </div>
              )}
            </div>

            {/* Decoration Circles for ticket effect */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-background rounded-full border border-border/50" />
            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-background rounded-full border border-border/50" />
          </div>

          <div className="p-6 pt-8">
            <AppointmentActions
              appointmentId={appointment.id}
              serviceId={appointment.service_id}
              serviceDuration={appointment.service?.duration_minutes || 60}
              businessHours={businessHours}
              canReschedule={canReschedule}
              rescheduleMessage={rescheduleMessage}
            />
          </div>
        </Card>

        <div className="text-center">
          <Link
            href={businessSlug ? `/${businessSlug}` : '/'}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver a {businessName}
          </Link>
        </div>
      </div>
    </PageWrapper>
  )
}
