import { getAppointments } from '@/app/actions'
import { getTeamMembers } from '@/app/actions/team'
import CalendarView from '@/components/admin/calendar-view'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  // Get appointments for the current month and a bit before/after
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

  const [appointmentsResult, membersResult] = await Promise.all([
    getAppointments({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }),
    getTeamMembers()
  ])

  const appointments = appointmentsResult.success ? appointmentsResult.data || [] : []
  const allMembers = membersResult.success ? membersResult.data || [] : []
  const members = allMembers.filter(m => m.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold tracking-tight">Calendario</h2>
        <p className="text-muted-foreground text-sm">
          Vista general de todas las citas
        </p>
      </div>

      <CalendarView initialAppointments={appointments} members={members} />
    </div>
  )
}
