'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/marketing/mobile-nav'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import logo from '@/public/logo/icon.png'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-background font-sans selection:bg-primary/10">
      {/* Navigation */}
      <header className="fixed top-0 z-60 w-full">
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300 pointer-events-none",
            scrolled
              ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
              : "bg-transparent"
          )}
        />
        <div className="container relative mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90 relative z-10">
            <Image src={logo} alt="Buki" width={100} height={60} className="h-8 w-auto object-contain" />
            <span className="font-bold tracking-tight text-xl hidden sm:inline-block">
              Buki
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
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
            <Button asChild size="sm" className="rounded-full px-6 font-semibold shadow-none">
              <Link href="/signup">Comenzar Gratis</Link>
            </Button>
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center">
            <MobileNav />
          </div>
        </div>
      </header>

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
                <Image src={logo} alt="Buki" width={100} height={60} className="h-7 w-auto object-contain" />
                <span className="font-bold text-lg">Buki</span>
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
              © 2026 Buki. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
