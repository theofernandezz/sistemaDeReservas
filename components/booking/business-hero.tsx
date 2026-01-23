import { MapPin, Phone, Instagram } from 'lucide-react'
import type { Business } from '@/types/database.types'

interface BusinessHeroProps {
  business: Business
  accentColor?: string
}

export function BusinessHero({ business, accentColor = '#f97316' }: BusinessHeroProps) {
  const hasDescription = !!business.description
  const hasAddress = !!business.address
  const hasPhone = !!business.phone
  const hasInstagram = !!business.instagram
  
  // Si no hay nada que mostrar, no renderizar
  const hasAnyInfo = hasDescription || hasAddress || hasPhone || hasInstagram
  if (!hasAnyInfo) return null

  return (
    <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border/50">
      {/* Bienvenida */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido a {business.name}
        </h1>
        
        {hasDescription && (
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
            {business.description}
          </p>
        )}
      </div>

      {/* Info de contacto - stack en móvil, inline en desktop */}
      {(hasAddress || hasPhone || hasInstagram) && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-x-5 sm:gap-y-2 mt-4 sm:mt-5 text-xs sm:text-sm text-muted-foreground">
          {hasAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" style={{ color: accentColor }} />
              <span className="line-clamp-1">{business.address}</span>
            </div>
          )}
          
          {hasPhone && (
            <a 
              href={`tel:${business.phone}`}
              className="flex items-center gap-2 transition-colors hover:opacity-80"
            >
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" style={{ color: accentColor }} />
              <span className="hover:underline">{business.phone}</span>
            </a>
          )}
          
          {hasInstagram && business.instagram && (
            <a
              href={`https://instagram.com/${business.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-colors hover:opacity-80"
            >
              <Instagram className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" style={{ color: accentColor }} />
              <span className="hover:underline">
                {business.instagram.startsWith('@') ? business.instagram : `@${business.instagram}`}
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
