import type { Business } from '@/types/database.types'
import { getAppUrl } from '@/lib/config'

interface SoftwareApplicationProps {
  name?: string
  description?: string
  url?: string
}

/**
 * Schema para aplicación de software - usar en landing page
 */
export function SoftwareApplicationSchema({
  name = 'Buki',
  description = 'Plataforma de reservas online para profesionales. Automatiza citas, pagos con Mercado Pago y recordatorios.',
  url = getAppUrl(),
}: SoftwareApplicationProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ARS',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '120',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

interface LocalBusinessSchemaProps {
  business: Business
}

/**
 * Schema para negocio local - usar en páginas de negocios /[slug]
 */
export function LocalBusinessSchema({ business }: LocalBusinessSchemaProps) {
  const appUrl = getAppUrl()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description || `Reserva tu turno en ${business.name}`,
    image: business.logo || undefined,
    url: `${appUrl}/${business.slug}`,
    telephone: business.phone || undefined,
    address: business.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: business.address,
        }
      : undefined,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

interface ServiceSchemaProps {
  name: string
  description?: string
  price: number
  businessName: string
  businessSlug: string
}

/**
 * Schema para servicio individual - usar opcionalmente en páginas de servicios
 */
export function ServiceSchema({
  name,
  description,
  price,
  businessName,
  businessSlug,
}: ServiceSchemaProps) {
  const appUrl = getAppUrl()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description: description || name,
    provider: {
      '@type': 'LocalBusiness',
      name: businessName,
      url: `${appUrl}/${businessSlug}`,
    },
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: 'ARS',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
