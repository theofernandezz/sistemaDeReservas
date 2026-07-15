import { getPendingAppointments } from '@/app/actions'
import RemindersList from '@/components/admin/reminders-list'
import WhatsAppRemindersPanel from '@/components/admin/whatsapp-reminders-panel'
import { Clock } from 'lucide-react'

export default async function RemindersPage() {
  // Fetch pending approvals for the header badge
  const pendingResult = await getPendingAppointments()
  const pendingAppointments = pendingResult.success && pendingResult.data ? pendingResult.data : []

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Centro de Gestión
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisá pagos pendientes y envía recordatorios por WhatsApp
          </p>
        </div>

        {/* Summary Badge */}
        {pendingAppointments.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
            <Clock size={16} />
            {pendingAppointments.length} {pendingAppointments.length === 1 ? 'pago pendiente' : 'pagos pendientes'}
          </div>
        )}
      </div>

      {/* Pending Bookings Section */}
      <RemindersList
        pendingAppointments={pendingAppointments}
        tomorrowAppointments={[]}
        tomorrowFormatted=""
      />

      {/* WhatsApp Reminders Panel */}
      <WhatsAppRemindersPanel />
    </div>
  )
}
