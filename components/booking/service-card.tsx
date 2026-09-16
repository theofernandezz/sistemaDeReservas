import { Card } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
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
 * ServiceCard - card de servicio del storefront público
 *
 * Sin foto, usa un placeholder plano con la inicial del servicio
 * (no un ícono adivinado por rubro: el negocio puede ser cualquier
 * profesión, no solo estética/belleza).
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
          "border border-border/60 bg-card rounded-xl",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-0.5 hover:border-border",
          "flex flex-col group/card"
        )}
      >
        {/* Image / placeholder */}
        {hasImage ? (
          <div className="relative w-full aspect-[16/11] shrink-0 overflow-hidden bg-muted/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        ) : (
          <div
            className="relative w-full aspect-[16/11] shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}12` }}
            aria-hidden="true"
          >
            <span className="text-3xl font-bold" style={{ color: accentColor }}>
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Content section */}
        <div className="flex flex-col flex-1 p-4 sm:p-5">
          <h3 className="font-semibold text-base sm:text-lg text-foreground leading-snug line-clamp-2">
            {title}
          </h3>

          {description && (
            <p className="mt-1.5 text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2 flex-1">
              {description}
            </p>
          )}

          {/* Bottom section - price, duration, CTA */}
          <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-border/40">
            <div className="space-y-0.5">
              <span className="block text-xs text-muted-foreground/80">{durationMin} min</span>
              <span className="block font-semibold text-lg sm:text-xl tabular-nums text-foreground">
                ${price}
              </span>
            </div>

            <span className="flex items-center gap-1 text-sm font-medium transition-[gap] duration-200 group-hover/card:gap-2">
              Reservar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
