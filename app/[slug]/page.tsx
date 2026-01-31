import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { getServicesByBusinessId } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import { ServiceCard } from '@/components/booking/service-card'
import { BusinessHero } from '@/components/booking/business-hero'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getBusinessBySlug(slug)

  if (!result.success || !result.data) {
    return { title: 'No encontrado' }
  }

  const business = result.data
  const title = `${business.name} - Reserva Online`
  const description = business.description || `Reserva tu turno en ${business.name}. Sistema de reservas online con confirmación instantánea.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: business.logo ? [{ url: business.logo, width: 400, height: 400, alt: business.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: business.logo ? [business.logo] : undefined,
    },
  }
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Error al cargar servicios</h1>
          <p className="text-sm text-muted-foreground">{servicesResult.error || 'Intenta más tarde'}</p>
        </div>
      </div>
    )
  }

  const services = servicesResult.data.map(dbServiceToFrontend)
  
  // Color de acento del negocio (default naranja)
  const accentColor = business.settings?.accentColor || '#f97316'

  return (
    <div className="space-y-6 sm:space-y-8 lg:max-w-[1400px] lg:mx-auto lg:px-12 lg:py-8">
      {/* Hero section */}
      <BusinessHero business={business} accentColor={accentColor} />

      {/* Services section */}
      <section aria-labelledby="services-heading">
        {/* Section header with accent line */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <h2 
            id="services-heading"
            className="text-lg sm:text-xl font-semibold text-foreground"
          >
            Nuestros Servicios
          </h2>
          <div 
            className="flex-1 h-px opacity-20"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">
            {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
          </span>
        </div>

        {services.length === 0 ? (
          <EmptyServicesState accentColor={accentColor} />
        ) : (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label="Lista de servicios disponibles"
          >
            {services.map((service, index) => (
              <div
                key={service.id}
                role="listitem"
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ServiceCard
                  {...service}
                  bookingBasePath={`/${slug}/booking`}
                  accentColor={accentColor}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * EmptyServicesState - Premium empty state for no services
 */
function EmptyServicesState({ accentColor }: { accentColor: string }) {
  return (
    <div 
      className={cn(
        "relative py-16 sm:py-20 text-center rounded-2xl overflow-hidden",
        "border border-dashed border-border/60 bg-muted/5"
      )}
    >
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
        aria-hidden="true"
      />
      
      <div className="relative z-10 space-y-2">
        <div 
          className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}10` }}
          aria-hidden="true"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke={accentColor}
            strokeWidth={1.5}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" 
            />
          </svg>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          No hay servicios disponibles en este momento.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Vuelve pronto para ver las novedades.
        </p>
      </div>
    </div>
  )
}
