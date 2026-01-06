import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'


export interface ServiceCardProps {
  id: string
  title: string
  description: string
  price: number
  durationMin: number
  image?: string | null
  bookingBasePath?: string // Optional: defaults to /booking
}

export function ServiceCard({ id, title, description, price, durationMin, image, bookingBasePath = '/booking' }: ServiceCardProps) {
  return (
    <Link href={`${bookingBasePath}/${id}`} className="group block h-full">
      <Card className="h-full border-0 shadow-sm hover:shadow-xl bg-card transition-all duration-300 overflow-hidden flex flex-col hover:ring-2 hover:ring-primary/5">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
          {image ? (
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/40">
              <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-semibold border-0 px-2.5 py-0.5">
              ${price}
            </Badge>
          </div>
        </div>

        <CardContent className="flex-1 p-5 pt-4 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-serif text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>

          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {description}
          </p>
        </CardContent>

        <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{durationMin} min</span>
          </div>

          <Button size="sm" variant="ghost" className="h-8 gap-1 pl-2 pr-1 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 pointer-events-none">
            Reservar <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
