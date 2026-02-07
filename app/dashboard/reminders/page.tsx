import { getTomorrowAppointments, getPendingAppointments } from '@/app/actions'
import RemindersList from '@/components/admin/reminders-list'
import { Bell, Clock } from 'lucide-react'

export default async function RemindersPage() {
  // Fetch both pending approvals and tomorrow's reminders
  const [pendingResult, tomorrowResult] = await Promise.all([
    getPendingAppointments(),
    getTomorrowAppointments()
  ])

  const pendingAppointments = pendingResult.success && pendingResult.data ? pendingResult.data : []
  const tomorrowAppointments = tomorrowResult.success && tomorrowResult.data ? tomorrowResult.data : []

  // Get tomorrow's date formatted
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowFormatted = tomorrow.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Centro de Gestión
          </h1>
          <p className="text-sm text-muted-foreground">
            Aprueba reservas y envía recordatorios
          </p>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {pendingAppointments.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
              <Clock size={16} />
              {pendingAppointments.length} {pendingAppointments.length === 1 ? 'reserva pendiente' : 'reservas pendientes'}
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">
            <Bell size={16} />
            {tomorrowAppointments.length} para mañana
          </div>
        </div>
      </div>

      <RemindersList
        pendingAppointments={pendingAppointments}
        tomorrowAppointments={tomorrowAppointments}
        tomorrowFormatted={tomorrowFormatted}
      />
    </div>
  )
}
