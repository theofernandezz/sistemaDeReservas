import { MapPin, Phone, Instagram } from 'lucide-react'
import type { Business } from '@/types/database.types'
import { getOpenStatus } from '@/lib/business-hours'
import { cn } from '@/lib/utils'

interface BusinessHeroProps {
  business: Business
  accentColor?: string
}

/**
 * BusinessHero - Hero del storefront público del negocio
 *
 * El título es el propio texto del negocio (description), no un saludo genérico.
 * El estado "abierto/cerrado" sale de settings.businessHours (hora Argentina).
 */
export function BusinessHero({ business, accentColor = '#f97316' }: BusinessHeroProps) {
  const hasDescription = !!business.description
  const hasAddress = !!business.address
  const hasPhone = !!business.phone
  const hasInstagram = !!business.instagram
  const hasContactInfo = hasAddress || hasPhone || hasInstagram

  const openStatus = getOpenStatus(business.settings?.businessHours)

  return (
    <section
      className="relative border-b border-border/40 mb-8 sm:mb-12 pb-8 sm:pb-12"
      aria-labelledby="business-hero-title"
    >
      <div className="max-w-3xl space-y-4 sm:space-y-6 px-0 sm:px-4">
        <h1
          id="business-hero-title"
          className="text-3xl sm:text-4xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.08]"
        >
          {hasDescription ? business.description : business.name}
        </h1>

        {hasDescription && (
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl">
            Reservá online en menos de dos minutos.
          </p>
        )}

        {openStatus && (
          <div className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
              {openStatus.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
            </span>
            {openStatus.isOpen && (
              <span className="text-muted-foreground">· Cierra {openStatus.closesAt}</span>
            )}
          </div>
        )}

        {hasContactInfo && (
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            role="list"
            aria-label="Información de contacto"
          >
            {hasAddress && (
              <span className="flex items-center gap-1.5" role="listitem">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{business.address}</span>
              </span>
            )}

            {hasPhone && (
              <a
                href={`tel:${business.phone}`}
                className={cn(
                  "flex items-center gap-1.5 hover:text-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                )}
                role="listitem"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                {business.phone}
              </a>
            )}

            {hasInstagram && business.instagram && (
              <a
                href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-1.5 hover:text-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                )}
                role="listitem"
              >
                <Instagram className="h-4 w-4 shrink-0" aria-hidden="true" />
                {business.instagram.startsWith('@') ? business.instagram : `@${business.instagram}`}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
