import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { getServicesByBusinessId } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import { ServiceCard } from '@/components/booking/service-card'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params
  const businessResult = await getBusinessBySlug(slug)

  if (!businessResult.success || !businessResult.data) {
    notFound()
  }

  const business = businessResult.data
  const servicesResult = await getServicesByBusinessId(business.id)

  if (!servicesResult.success || !servicesResult.data) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Error al cargar servicios</h1>
        <p className="text-muted-foreground">{servicesResult.error || 'Intenta más tarde'}</p>
      </div>
    )
  }

  const services = servicesResult.data.map(dbServiceToFrontend)

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Nuestros Servicios
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          {business.description || 'Selecciona un tratamiento para ver disponibilidad y reservar tu cita.'}
        </p>
      </div>

      {services.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-xl border-muted bg-muted/10">
          <p className="text-muted-foreground font-medium">No hay servicios disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              {...service}
              bookingBasePath={`/${slug}/booking`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
