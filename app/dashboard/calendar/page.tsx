import { getAppointments, getBlockedSlots } from '@/app/actions'
import CustomCalendar from '@/components/dashboard/custom-calendar'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  // Get appointments for the current month and a bit before/after
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

  const result = await getAppointments({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  })

  const appointments = result.success ? result.data || [] : []

  return <CustomCalendar initialAppointments={appointments} />
}
