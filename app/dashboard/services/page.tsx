import { getAllServices, getAllServiceAddons } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import ServicesAndAddons from '@/components/dashboard/services-addons'

export default async function ServicesPage() {
  const [servicesResult, addonsResult] = await Promise.all([
    getAllServices(),
    getAllServiceAddons()
  ])

  const services = servicesResult.success && servicesResult.data
    ? servicesResult.data.map(dbServiceToFrontend)
    : []

  const addons = addonsResult.success ? addonsResult.data || [] : []

  return <ServicesAndAddons initialServices={services} initialAddons={addons} />
}
