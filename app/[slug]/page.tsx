import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { getServicesByBusinessId } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import { ServiceCard } from '@/components/booking/service-card'
import { BusinessHero } from '@/components/booking/business-hero'

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
  
  // Color de acento del negocio (default naranja)
  const accentColor = business.settings?.accentColor || '#f97316'

  return (
    <div className="space-y-4 sm:space-y-6 lg:max-w-[1400px] lg:mx-auto lg:px-12 lg:py-12">
      {/* Hero condicional del negocio */}
      <BusinessHero business={business} accentColor={accentColor} />

      {/* Sección de servicios */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          Nuestros Servicios
        </h2>

        {services.length === 0 ? (
          <div className="py-12 sm:py-16 text-center border border-dashed rounded-xl border-border bg-muted/5">
            <p className="text-sm sm:text-base text-muted-foreground">No hay servicios disponibles en este momento.</p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                {...service}
                bookingBasePath={`/${slug}/booking`}
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
