import { getServices } from '@/app/actions'
import { dbServiceToFrontend } from '@/lib/adapters'
import { Button } from '@/components/ui/button'
import { ServiceCard } from '@/components/booking/service-card'
import Link from 'next/link'
import { Settings, MapPin, Instagram } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const result = await getServices()

  if (!result.success || !result.data) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-serif font-bold tracking-tight">Servicio No Disponible</h1>
          <p className="text-muted-foreground">{result.error || 'No se pudieron cargar los servicios. Por favor intenta más tarde.'}</p>
          <Button asChild>
            <a href="/">Reintentar</a>
          </Button>
        </div>
      </div>
    )
  }

  const services = result.data.map(dbServiceToFrontend)

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-pink-100 selection:text-pink-900">

      {/* Compact App Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-lg shadow-sm">
              S
            </div>
            <span className="font-serif font-bold tracking-tight text-xl hidden sm:inline-block">Siv Nails</span>
          </div>
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground rounded-full">
            <Link href="/admin" aria-label="Staff Access">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-primary">
            Nuestros Servicios
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Selecciona un tratamiento para ver disponibilidad y reservar tu cita.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-xl border-muted bg-muted/10">
            <p className="text-muted-foreground font-medium">No hay servicios disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                {...service}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto px-4 bg-secondary/30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Villa Pueyrredón, CABA</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/siv.nails_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Instagram className="h-4 w-4" />
              <span>@siv.nails_</span>
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Siv Nails
          </p>
        </div>
      </footer>
    </div>
  )
}

