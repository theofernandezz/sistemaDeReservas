import { getTomorrowAppointments } from '@/app/actions'
import RemindersList from '@/components/admin/reminders-list'
import { Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RemindersPage() {
  const result = await getTomorrowAppointments()
  const appointments = result.success && result.data ? result.data : []

  // Get tomorrow's date formatted
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowFormatted = tomorrow.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Recordatorios
          </h1>
          <p className="text-sm text-muted-foreground">
            Turnos para mañana, {tomorrowFormatted}
          </p>
        </div>

        {/* Info Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">
          <Bell size={16} />
          {appointments.length} {appointments.length === 1 ? 'turno programado' : 'turnos programados'}
        </div>
      </div>

      <RemindersList appointments={appointments} />
    </div>
  )
}
