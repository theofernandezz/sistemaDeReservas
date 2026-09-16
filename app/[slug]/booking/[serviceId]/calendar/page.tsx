import { notFound } from 'next/navigation'
import { getServiceById, getAvailableSlots } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import BookingCalendar from '@/components/booking/booking-calendar'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{ slug: string; serviceId: string }>
  searchParams: Promise<{ member?: string }>
}

export default async function CalendarPage({ params, searchParams }: PageProps) {
  const { serviceId } = await params
  const { member = 'any' } = await searchParams

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
  const businessHours = businessData?.settings?.businessHours
  const accentColor = businessData?.settings?.accentColor || '#f97316'

  // Fetch initial slots using team member schedule (or business schedule if "any")
  const slotsResult = await getAvailableSlots(serviceId, today, undefined, member)
  const initialSlots = slotsResult.success ? (slotsResult.data ?? []) : []

  return (
    <BookingCalendar
      service={service}
      serviceId={serviceId}
      initialDate={today}
      initialSlots={initialSlots}
      memberId={member}
      maxAdvanceDays={maxAdvanceDays}
      businessHours={businessHours}
      accentColor={accentColor}
    />
  )
}
