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
      className="relative overflow-hidden rounded-2xl mb-6 sm:mb-8"
      aria-labelledby="business-hero-title"
    >
      {/* Gradient mesh background - based on accent color */}
      <div 
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% -20%, ${accentColor}, transparent),
            radial-gradient(ellipse 60% 60% at 80% 50%, ${accentColor}80, transparent),
            radial-gradient(ellipse 50% 80% at 40% 100%, ${accentColor}60, transparent)
          `
        }}
        aria-hidden="true"
      />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${accentColor}20 1px, transparent 1px),
            linear-gradient(90deg, ${accentColor}20 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Badge - top accent */}
        <div 
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-4",
            "bg-background/80 backdrop-blur-sm border border-border/50",
            "transition-all duration-300 hover:border-border"
          )}
        >
          <Sparkles 
            className="h-3 w-3" 
            style={{ color: accentColor }} 
            aria-hidden="true"
          />
          <span className="text-muted-foreground">Reserva online</span>
        </div>

        {/* Main heading - asymmetric for visual interest */}
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          <h1 
            id="business-hero-title"
            className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
          >
            Bienvenido a{' '}
            <span 
              className="relative"
              style={{ color: accentColor }}
            >
              {business.name}
              {/* Underline accent */}
              <span 
                className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full opacity-30"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
            </span>
          </h1>
          
          {hasDescription && (
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl">
              {business.description}
            </p>
          )}
        </div>

        {/* Contact info - glassmorphism pills */}
        {hasContactInfo && (
          <div 
            className="flex flex-wrap items-center gap-2 sm:gap-3 mt-6 sm:mt-8"
            role="list"
            aria-label="Información de contacto"
          >
            {hasAddress && (
              <div 
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-background/60 backdrop-blur-sm border border-border/40",
                  "text-xs sm:text-sm text-muted-foreground",
                  "transition-all duration-200 hover:bg-background/80 hover:border-border/60"
                )}
                role="listitem"
              >
                <MapPin 
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" 
                  style={{ color: accentColor }} 
                  aria-hidden="true"
                />
                <span className="line-clamp-1">{business.address}</span>
              </div>
            )}
            
            {hasPhone && (
              <a 
                href={`tel:${business.phone}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-background/60 backdrop-blur-sm border border-border/40",
                  "text-xs sm:text-sm text-muted-foreground",
                  "transition-all duration-200 hover:bg-background/80 hover:border-border/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                role="listitem"
              >
                <Phone 
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" 
                  style={{ color: accentColor }} 
                  aria-hidden="true"
                />
                <span>{business.phone}</span>
              </a>
            )}
            
            {hasInstagram && business.instagram && (
              <a
                href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-background/60 backdrop-blur-sm border border-border/40",
                  "text-xs sm:text-sm text-muted-foreground",
                  "transition-all duration-200 hover:bg-background/80 hover:border-border/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                role="listitem"
              >
                <Instagram 
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" 
                  style={{ color: accentColor }} 
                  aria-hidden="true"
                />
                <span>
                  {business.instagram.startsWith('@') ? business.instagram : `@${business.instagram}`}
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Bottom border gradient */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}30, transparent)`
        }}
        aria-hidden="true"
      />
    </section>
  )
}
