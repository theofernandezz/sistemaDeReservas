import { getAllServices } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import ServiceManager from '@/components/admin/service-manager'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const result = await getAllServices()
  const services = result.success && result.data ? result.data.map(dbServiceToFrontend) : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-serif text-foreground">Mis Servicios</h1>
        <p className="text-sm text-muted-foreground">{services.length} servicios en total</p>
      </div>

      <ServiceManager initialServices={services} />
    </div>
  )
}
