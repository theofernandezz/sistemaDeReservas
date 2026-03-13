import { getAppointments } from '@/app/actions'
import { getCurrentBusiness } from '@/app/actions/auth'
import Link from 'next/link'
import { CalendarCheck, Clock, Ban, ExternalLink, ChevronRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      return { 
        label: 'Confirmado', 
        className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
      }
    case 'pending':
      return { 
        label: 'Pendiente', 
        className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
      }
    case 'cancelled':
      return { 
        label: 'Cancelado', 
        className: 'bg-red-500/10 text-red-500 border-red-500/20' 
      }
    default:
      return { 
        label: status, 
        className: 'bg-secondary text-muted-foreground border-border' 
      }
  }
}

export default async function DashboardHomePage() {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  const [businessResult, appointmentsResult] = await Promise.all([
    getCurrentBusiness(),
    getAppointments({
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    }),
  ])

  const business = businessResult.data
  const appointments = (appointmentsResult.success ? appointmentsResult.data || [] : [])
    .filter(apt => apt.status !== 'cancelled')
  
  const upcomingAppointments = appointments.filter(apt =>
    apt.status !== 'cancelled' && new Date(apt.start_time) >= new Date()
  )
  const completedAppointments = appointments.filter(apt => 
    apt.status !== 'cancelled' && new Date(apt.end_time) < new Date()
  )

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* UI_DIRECTION
        - Intent: Transform the dashboard home into a professional command center with a Linear-style aesthetic.
        - Pillars: Typography (High contrast headings), Surface (Glassmorphism and subtle borders), Motion (Hover lift on cards).
        - Risky Choice: Asymmetric 2-column layout (70/30) abandoning the standard stacked view.
        - Usability Guardrail: High contrast status badges with borders for easy scanability.
        - Variation Proof: Layout structure, Background/surface treatment, Typography hierarchy.
      */}

      {/* Header - Option B (Data-driven & Minimalist) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Resumen de hoy
          </h1>
          <p className="text-muted-foreground">
            {today.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
            {' · '}
            {appointments.length > 0 
              ? `Tienes ${upcomingAppointments.length} citas pendientes.`
              : 'No hay citas programadas para hoy.'}
          </p>
        </div>
        
        {/* Quick Actions at Header Level for better space usage */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/availability"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium border border-border/50 transition-all hover:-translate-y-0.5"
          >
            <Ban size={16} className="text-muted-foreground" />
            Bloquear horario
          </Link>
          <Link
            href={`/${business?.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-all hover:-translate-y-0.5 shadow-sm"
          >
            <ExternalLink size={16} />
            Ver mi página
          </Link>
        </div>
      </div>

      {/* Asymmetric Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Column: Agenda (70%) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              <CalendarCheck size={18} className="text-primary" />
              Agenda
            </h2>
            <Link
              href="/dashboard/calendar"
              className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Ver calendario completo
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            {appointments.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-xl bg-secondary mx-auto mb-4 flex items-center justify-center border border-border/50">
                  <CalendarCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Día libre</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  No tienes citas programadas para hoy. Comparte tu enlace de reservas para recibir más clientes.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {appointments.map(appointment => {
                  const status = getStatusBadge(appointment.status)
                  const isPast = new Date(appointment.end_time) < new Date()
                  const isCurrent = new Date(appointment.start_time) <= new Date() && new Date(appointment.end_time) >= new Date()

                  return (
                    <div
                      key={appointment.id}
                      className={cn(
                        "p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:bg-secondary/20",
                        isPast && "opacity-60 grayscale-[0.5]",
                        isCurrent && "bg-primary/5 outline outline-1 outline-primary/20"
                      )}
                    >
                      {/* Time Column */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 min-w-20">
                        <p className={cn(
                          "text-sm font-semibold",
                          isCurrent ? "text-primary" : "text-foreground"
                        )}>
                          {formatTime(appointment.start_time)}
                        </p>
                        <span className="sm:hidden text-muted-foreground">-</span>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(appointment.end_time)}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="hidden sm:block w-px h-10 bg-border/50 mx-2" />

                      {/* Info Column */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {appointment.client_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                          {appointment.service?.name || 'Servicio asignado'}
                        </p>
                      </div>

                      {/* Status & Actions Column */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium border",
                          status.className
                        )}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column: Stats (30%) */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            Métricas
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {/* Stat 1 */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total hoy</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {appointments.length}
                </p>
                <span className="text-xs text-muted-foreground">citas</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Por atender</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {upcomingAppointments.length}
                </p>
                <span className="text-xs text-muted-foreground">pendientes</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="col-span-2 lg:col-span-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Completadas</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {completedAppointments.length}
                </p>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  citas finalizadas
                </span>
              </div>
              {/* Simple progress bar */}
              <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${appointments.length > 0 ? (completedAppointments.length / appointments.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
