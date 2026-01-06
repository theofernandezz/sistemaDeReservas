import { getAppointments } from '@/app/actions'
import AppointmentList from '@/components/admin/appointment-list'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  const result = await getAppointments()
  const appointments = result.success && result.data ? result.data : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Citas</h1>
        <p className="text-sm text-muted-foreground">{appointments.length} citas en total</p>
      </div>

      <AppointmentList initialAppointments={appointments} />
    </div>
  )
}
