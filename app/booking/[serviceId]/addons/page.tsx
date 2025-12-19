import { getServiceById, getServiceAddons } from '@/app/actions'
import { redirect, notFound } from 'next/navigation'
import AddonsPageClient from './addons-client'

interface AddonsPageProps {
  params: Promise<{ serviceId: string }>
  searchParams: Promise<{ date?: string; time?: string }>
}

export default async function AddonsPage({ params, searchParams }: AddonsPageProps) {
  const { serviceId } = await params
  const { date, time } = await searchParams

  // Validate required params
  if (!date || !time) {
    redirect(`/booking/${serviceId}`)
  }

  // Fetch service and addons in parallel
  const [serviceResult, addonsResult] = await Promise.all([
    getServiceById(serviceId),
    getServiceAddons()
  ])

  if (!serviceResult.success || !serviceResult.data) {
    notFound()
  }

  const service = serviceResult.data
  const addons = addonsResult.success ? addonsResult.data || [] : []

  return (
    <AddonsPageClient
      service={service}
      addons={addons}
      selectedDate={date}
      selectedTime={time}
    />
  )
}
