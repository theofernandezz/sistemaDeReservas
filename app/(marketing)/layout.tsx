import Link from 'next/link'
import Image from 'next/image'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import type { Metadata } from 'next'
import logo from '@/public/logo/icon.png'

export const metadata: Metadata = {
  title: 'Devora Buki — Tu negocio, sin el caos.',
  description:
    'La plataforma todo-en-uno para gestionar turnos, cobrar señas y automatizar recordatorios. Creá tu página de reservas en 2 minutos, sin tarjeta de crédito.',
  openGraph: {
    title: 'Devora Buki — Tu negocio, sin el caos.',
    description:
      'Reservas online, pagos automáticos y recordatorios. La plataforma diseñada para profesionales independientes en Argentina.',
    type: 'website',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Devora Buki — Reservas online para profesionales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devora Buki — Tu negocio, sin el caos.',
    description: 'Reservas online, pagos automáticos y recordatorios. Sin complicaciones.',
    images: ['/og/home.png'],
  },
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
      <footer className="bg-background border-t border-border/40 py-16">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">

            {/* Brand */}
            <div className="space-y-3">
              <Link href="/" className="flex items-center gap-2.5">
                <Image src={logo} alt="Devora Buki" width={100} height={60} sizes="(max-width: 640px) 60px, 100px" className="h-7 w-auto object-contain" />
                <span className="font-bold text-lg tracking-tight">Devora Buki</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
                Plataforma de gestión de reservas para profesionales independientes.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                <span>🇦🇷 Argentina</span>
                <span>•</span>
                <span>💬 Soporte en español</span>
              </div>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Precios</Link>
              <Link href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Ingresar</Link>
              <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors">Comenzar</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacidad</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Términos</Link>
            </nav>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/50">© 2026 Devora Buki. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/40">
              <span>🔒 Datos seguros</span>
              <span>⚡ Integración con Mercado Pago</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
