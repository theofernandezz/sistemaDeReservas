import { getAppointments, getBlockedSlots } from '@/app/actions'
import CustomCalendar from '@/components/dashboard/custom-calendar'

export default async function CalendarPage() {
  // Get appointments for the current month and a bit before/after
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

  const [appointmentsResult, blockedResult] = await Promise.all([
    getAppointments({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }),
    getBlockedSlots(startDate.toISOString(), endDate.toISOString())
  ])

  const appointments = appointmentsResult.success ? appointmentsResult.data || [] : []
  const blockedSlots = blockedResult.success ? blockedResult.data || [] : []

  return (
    <CustomCalendar
      initialAppointments={appointments}
      initialBlockedSlots={blockedSlots}
    />
  )
}
