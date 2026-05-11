import { notFound } from 'next/navigation'
import { getServiceById, getServiceAddons } from '@/app/actions'
import { getBusinessPaymentConfig } from '@/app/actions/payments'
import ConfirmForm from './confirm-form'

interface PageProps {
  params: Promise<{ slug: string; serviceId: string }>
  searchParams: Promise<{ date?: string; time?: string; member?: string }>
}

export default async function ConfirmPage({ params, searchParams }: PageProps) {
  const { slug, serviceId } = await params
  const { date, time, member } = await searchParams

  const [serviceResult, addonsResult] = await Promise.all([
    getServiceById(serviceId),
    getServiceAddons(),
  ])

  if (!serviceResult.success || !serviceResult.data) {
    notFound()
  }

  const service = serviceResult.data
  const addons = (addonsResult.success && addonsResult.data) ? addonsResult.data : []

  let paymentConfig = null
  if (service.business_id) {
    const configResult = await getBusinessPaymentConfig(service.business_id)
    if (configResult.success && configResult.data) {
      paymentConfig = configResult.data
    }
  }

  if (!paymentConfig) {
    paymentConfig = {
      depositPercentage: 100,
      hasMPConnected: false,
      paymentFlowMode: 'mercadopago' as const,
      manualTransfer: {
        enabled: false,
        alias: null,
        cvu: null,
        accountHolder: null,
        message: null,
        isReady: false,
      },
    }
  }

  return (
    <ConfirmForm
      slug={slug}
      serviceId={serviceId}
      service={service}
      addons={addons}
      paymentConfig={paymentConfig}
      date={date ?? null}
      time={time ?? null}
      memberParam={member ?? null}
    />
  )
}
