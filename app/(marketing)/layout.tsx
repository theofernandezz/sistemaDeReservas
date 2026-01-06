import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans selection:bg-primary/10">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b supports-[backdrop-filter]:bg-background/60" />
        <div className="container relative mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm">
              R
            </div>
            <span className="font-bold tracking-tight text-xl hidden sm:inline-block">
              Reserva
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline decoration-2 underline-offset-4"
            >
              Precios
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline decoration-2 underline-offset-4"
            >
              Ingresar
            </Link>
            <Button asChild size="sm" className="hidden sm:inline-flex rounded-full px-6 font-semibold shadow-none">
              <Link href="/signup">Comenzar Gratis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/40 pb-12 pt-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                  R
                </div>
                <span className="font-bold">Reserva</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La plataforma de gestión de reservas diseñada para el futuro del trabajo independiente.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Producto</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Precios</Link></li>
                <li><Link href="/features" className="hover:text-foreground transition-colors">Funcionalidades</Link></li>
                <li><Link href="/roadmap" className="hover:text-foreground transition-colors">Roadmap</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Compañía</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">Nosotros</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground transition-colors">Carreras</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Legal</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacidad</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Términos</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Reserva Inc. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              {/* Social placeholders */}
              <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
              <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
              <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
