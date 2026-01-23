import { Card } from '@/components/ui/card'
import { Clock, ChevronRight } from 'lucide-react'
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

export function ServiceCard({ 
  id, 
  title, 
  description, 
  price, 
  durationMin, 
  image, 
  bookingBasePath = '/booking',
  accentColor = '#f97316' // orange-500 default
}: ServiceCardProps) {
  const hasImage = !!image

  return (
    <Link href={`${bookingBasePath}/${id}`} className="group block">
      <Card 
        className={cn(
          "overflow-hidden border border-border/50 bg-card transition-all duration-300",
          "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]",
          // En móvil: columna (imagen arriba). En desktop: fila (imagen izquierda)
          hasImage ? "flex flex-col sm:flex-row" : ""
        )}
        style={{ '--accent': accentColor } as React.CSSProperties}
      >
        {/* Imagen - arriba en móvil, lateral en desktop */}
        {hasImage && (
          <div className="relative w-full sm:w-36 md:w-44 lg:w-48 h-40 sm:h-auto shrink-0 overflow-hidden">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradiente adaptado a la dirección */}
            <div className="absolute inset-0 bg-linear-to-b sm:bg-linear-to-r from-transparent to-black/10" />
          </div>
        )}

        {/* Contenido */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <h3 className="font-semibold text-base sm:text-lg text-foreground leading-tight transition-colors group-hover:text-[var(--accent)]">
                {title}
              </h3>
              <span 
                className="shrink-0 font-bold text-base sm:text-lg"
                style={{ color: accentColor }}
              >
                ${price}
              </span>
            </div>

            {description && (
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{durationMin} min</span>
            </div>

            <div 
              className="flex items-center gap-1 text-xs sm:text-sm font-medium group-hover:gap-2 transition-all"
              style={{ color: accentColor }}
            >
              <span className="hidden xs:inline">Reservar</span>
              <span className="xs:hidden">Ver</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
