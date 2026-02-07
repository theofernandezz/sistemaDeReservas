import { getAppointments } from '@/app/actions'
import { getCurrentBusiness } from '@/app/actions/auth'
import Link from 'next/link'
import { CalendarCheck, Clock, Plus, Ban, ExternalLink, ChevronRight } from 'lucide-react'

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

// Format time for display
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get status badge styles
function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-500' }
    case 'pending':
      return { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-500' }
    case 'cancelled':
      return { label: 'Cancelado', className: 'bg-red-500/10 text-red-500' }
    default:
      return { label: status, className: 'bg-secondary text-muted-foreground' }
  }
}

export default async function DashboardHomePage() {
  // Get today's appointments
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  // Parallelize data fetches
  const [businessResult, appointmentsResult] = await Promise.all([
    getCurrentBusiness(),
    getAppointments({
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    }),
  ])

  const business = businessResult.data

  const appointments = appointmentsResult.success ? appointmentsResult.data || [] : []
  const upcomingAppointments = appointments.filter(apt =>
    apt.status !== 'cancelled' && new Date(apt.start_time) >= new Date()
  )

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {getGreeting()} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {today.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
              <p className="text-xs text-muted-foreground">Citas hoy</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingAppointments.length}</p>
              <p className="text-xs text-muted-foreground">Por atender</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/dashboard/availability"
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors"
        >
          <Ban size={16} />
          Bloquear horario
        </Link>
        <Link
          href={`/${business?.slug}`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary/25"
        >
          <ExternalLink size={16} />
          Ver mi página
        </Link>
      </div>

      {/* Today's Agenda */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarCheck size={18} className="text-primary" />
            Agenda de hoy
          </h2>
          <Link
            href="/dashboard/calendar"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            Ver calendario
            <ChevronRight size={14} />
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
              <CalendarCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No tenés citas para hoy</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Compartí tu link de reservas para recibir más clientes
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appointments.map(appointment => {
              const status = getStatusBadge(appointment.status)
              const isPast = new Date(appointment.end_time) < new Date()

              return (
                <div
                  key={appointment.id}
                  className={`p-4 flex items-center gap-4 ${isPast ? 'opacity-50' : ''}`}
                >
                  {/* Time */}
                  <div className="text-center min-w-15">
                    <p className="text-sm font-semibold text-foreground">
                      {formatTime(appointment.start_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(appointment.end_time)}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-1 h-12 bg-primary/20 rounded-full" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {appointment.client_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {appointment.service?.name || 'Servicio'}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
