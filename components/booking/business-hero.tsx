import { MapPin, Phone, Instagram, Sparkles } from 'lucide-react'
import type { Business } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface BusinessHeroProps {
  business: Business
  accentColor?: string
}

/**
 * BusinessHero - Premium hero section for public booking pages
 * 
 * Design: Linear-style minimal with accent color gradient mesh background
 * - No images - uses subtle gradient patterns based on accent color
 * - Asymmetric layout for visual interest
 * - Glassmorphism contact pills
 */
export function BusinessHero({ business, accentColor = '#f97316' }: BusinessHeroProps) {
  const hasDescription = !!business.description
  const hasAddress = !!business.address
  const hasPhone = !!business.phone
  const hasInstagram = !!business.instagram
  const hasContactInfo = hasAddress || hasPhone || hasInstagram

  return (
    <section 
      className="relative overflow-hidden border-b border-border/40 mb-8 sm:mb-12 pb-8 sm:pb-12"
      aria-labelledby="business-hero-title"
    >

      {/* Content */}
      <div className="relative z-10 px-0 sm:px-4">
        {/* Badge - top accent */}
        <div 
          className={cn(
            "inline-flex items-center gap-2 mb-6",
            "text-sm font-medium tracking-wide text-muted-foreground uppercase"
          )}
        >
          <Sparkles 
            className="h-4 w-4" 
            style={{ color: accentColor }} 
            aria-hidden="true"
          />
          <span>Reserva Online</span>
        </div>

        {/* Main heading - asymmetric for visual interest */}
        <div className="max-w-4xl space-y-4 sm:space-y-6">
          <h1 
            id="business-hero-title"
            className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tighter text-foreground leading-[1.1]"
          >
            Bienvenido a{' '}
            <span 
              className="relative inline-block"
              style={{ color: accentColor }}
            >
              {business.name}
              {/* Subtle underline accent */}
              <span 
                className="absolute -bottom-2 lg:-bottom-3 left-0 right-0 h-1 sm:h-1.5 opacity-20"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
            </span>
          </h1>
          
          {hasDescription && (
            <p className="text-muted-foreground text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl font-light">
              {business.description}
            </p>
          )}
        </div>

        {/* Contact info - minimal layout */}
        {hasContactInfo && (
          <div 
            className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 sm:mt-12"
            role="list"
            aria-label="Información de contacto"
          >
            {hasAddress && (
              <div 
                className="flex items-center gap-2.5 text-sm sm:text-base text-muted-foreground"
                role="listitem"
              >
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30"
                  aria-hidden="true"
                >
                  <MapPin className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <span className="line-clamp-1 border-b border-transparent hover:border-border transition-colors">{business.address}</span>
              </div>
            )}
            
            {hasPhone && (
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-2.5 text-sm sm:text-base text-muted-foreground group"
                role="listitem"
              >
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30 group-hover:bg-muted/50 transition-colors"
                  aria-hidden="true"
                >
                  <Phone className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <span className="border-b border-transparent group-hover:border-border transition-colors">{business.phone}</span>
              </a>
            )}
            
            {hasInstagram && business.instagram && (
              <a
                href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm sm:text-base text-muted-foreground group"
                role="listitem"
              >
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30 group-hover:bg-muted/50 transition-colors"
                  aria-hidden="true"
                >
                  <Instagram className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <span className="border-b border-transparent group-hover:border-border transition-colors">
                  {business.instagram.startsWith('@') ? business.instagram : `@${business.instagram}`}
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
