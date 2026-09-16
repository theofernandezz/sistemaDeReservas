'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/marketing/mobile-nav'
import { cn } from '@/lib/utils'
import logo from '@/public/logo/icon.png'

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
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
          <Image src={logo} alt="Devora Buki" width={100} height={60} className="h-8 w-auto object-contain" priority />
          <span className="font-bold tracking-tight text-xl hidden sm:inline-block">
            Devora Buki
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
          <Button asChild size="sm" className="rounded-[9px] px-6 font-semibold shadow-none bg-[oklch(0.56_0.19_280)] hover:bg-[oklch(0.48_0.19_280)]">
            <Link href="/signup">Comenzar Gratis</Link>
          </Button>
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center">
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
