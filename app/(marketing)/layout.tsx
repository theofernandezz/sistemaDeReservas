import Link from 'next/link'
import Image from 'next/image'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import type { Metadata } from 'next'
import logo from '@/public/logo/icon.png'

export const metadata: Metadata = {
  title: 'Devora Buki | Plataforma integral de gestión de reservas',
  description: 'Automatiza citas, pagos y recordatorios mientras duermes. La plataforma todo-en-uno diseñada para profesionales y negocios.',
  openGraph: {
    title: 'Devora Buki | Plataforma integral de gestión de reservas',
    description: 'Automatiza citas, pagos y recordatorios mientras duermes. La plataforma todo-en-uno diseñada para profesionales.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devora Buki | Plataforma integral de gestión de reservas',
    description: 'La plataforma todo-en-uno para administrar turnos y negocios.',
  }
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-background font-sans selection:bg-primary/10">
      {/* Navigation */}
      <MarketingHeader />

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand */}
            <div className="max-w-xs">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <Image src={logo} alt="Devora Buki" width={100} height={60} className="h-7 w-auto object-contain" />
                <span className="font-bold text-lg">Devora Buki</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La plataforma de gestión de reservas diseñada para profesionales independientes.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Precios
              </Link>
              <Link href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Ingresar
              </Link>
              <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors">
                Comenzar
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Términos
              </Link>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>🇦🇷</span>
                <span>Hecho en Argentina</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>💬</span>
                <span>Soporte en español</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🔒</span>
                <span>Datos seguros</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>⚡</span>
                <span>Integración con Mercado Pago</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              © 2026 Devora Buki. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
