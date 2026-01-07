import { getServiceById, getAvailableSlots } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import BookingCalendar from '@/components/booking/booking-calendar'

export default async function BookingPage({
  params
}: {
  params: Promise<{ serviceId: string }>
}) {
  const { serviceId } = await params

  // Fetch service data
  const serviceResult = await getServiceById(serviceId)

  if (!serviceResult.success || !serviceResult.data) {
    notFound()
  }

  const service = dbServiceToFrontend(serviceResult.data)
  const today = new Date().toISOString().split('T')[0]

  // Try to get business hours from cookies (set by admin availability page)
  const cookieStore = await cookies()
  const businessHoursCookie = cookieStore.get('business_hours')
  const businessHours = businessHoursCookie?.value ? decodeURIComponent(businessHoursCookie.value) : undefined

  // Fetch available slots for today with business hours config
  const slotsResult = await getAvailableSlots(serviceId, today, businessHours)
  const initialSlots = slotsResult.success ? slotsResult.data : []

  return (
    <BookingCalendar
      service={service}
      serviceId={serviceId}
      initialDate={today}
      initialSlots={initialSlots || []}
    />
  )
}
