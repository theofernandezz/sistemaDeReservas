import { getServiceById, getAvailableSlots } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import { notFound } from 'next/navigation'
import BookingCalendar from '@/components/booking/booking-calendar'
import { createClient } from '@/utils/supabase/server'

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

  const supabase = await createClient()
  const { data: businessData } = await supabase
    .from('businesses')
    .select('settings')
    .eq('id', serviceResult.data.business_id)
    .single()

  const maxAdvanceDays = Math.max(1, Number(businessData?.settings?.maxAdvanceDays ?? 21))

  // Always fetch availability from DB settings (source of truth)
  const slotsResult = await getAvailableSlots(serviceId, today)
  const initialSlots = slotsResult.success ? slotsResult.data : []

  return (
    <BookingCalendar
      service={service}
      serviceId={serviceId}
      initialDate={today}
      initialSlots={initialSlots || []}
      maxAdvanceDays={maxAdvanceDays}
    />
  )
}
