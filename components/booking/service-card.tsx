import { Card } from '@/components/ui/card'
import { Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface ServiceCardProps {
  id: string
  title: string
  description: string
  price: number
  durationMin: number
  image?: string | null
  bookingBasePath?: string
  accentColor?: string
}

/**
 * ServiceCard - Premium compact service card
 * 
 * Design:
 * - Mobile: Vertical stack, price always visible at bottom
 * - Desktop: Compact card suitable for 2-column grid
 * - Accent color glow on hover
 */
export function ServiceCard({ 
  id, 
  title, 
  description, 
  price, 
  durationMin, 
  image, 
  bookingBasePath = '/booking',
  accentColor = '#f97316'
}: ServiceCardProps) {
  const hasImage = !!image

  return (
    <Link 
      href={`${bookingBasePath}/${id}`} 
      className={cn(
        "group block h-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      )}
    >
      <Card 
        className={cn(
          "relative h-full overflow-hidden",
          "border border-border/60 bg-card",
          "transition-all duration-300 ease-out",
          "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1",
          "active:scale-[0.995] active:shadow-lg",
          "flex flex-col"
        )}
      >
        {/* Accent border glow on hover */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${accentColor}25, 0 0 24px ${accentColor}08`
          }}
          aria-hidden="true"
        />

        {/* Image section - optional, with proper aspect ratio */}
        {hasImage && (
          <div className="relative w-full aspect-[16/10] shrink-0 overflow-hidden bg-muted/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </div>
        )}

        {/* Content section */}
        <div className="flex flex-col flex-1 p-4 sm:p-5">
          {/* Title */}
          <h3 className={cn(
            "font-semibold text-base sm:text-lg text-foreground leading-snug",
            "transition-colors duration-200",
            "line-clamp-2"
          )}>
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-1.5 text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2 flex-1">
              {description}
            </p>
          )}

          {/* Bottom section - price, duration, CTA */}
          <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-border/40">
            {/* Left: Duration + Price stacked */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{durationMin} min</span>
              </div>
              <span 
                className="block font-bold text-xl sm:text-2xl tabular-nums"
                style={{ color: accentColor }}
              >
                ${price}
              </span>
            </div>

            {/* Right: CTA button */}
            <div 
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                "text-xs sm:text-sm font-medium",
                "transition-all duration-200",
                "group-hover:gap-2"
              )}
              style={{ 
                backgroundColor: `${accentColor}10`,
                color: accentColor 
              }}
            >
              <span className="hidden xs:inline sm:inline">Reservar</span>
              <span className="xs:hidden sm:hidden">Ver</span>
              <ArrowRight 
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  "group-hover:translate-x-0.5"
                )} 
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
