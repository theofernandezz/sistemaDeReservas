'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import logoSvg from "@/public/logo/icon.svg"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"

export function MobileNav() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative z-50"
        aria-label="Abrir menú de navegación"
        disabled
      >
        <Menu className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative z-50"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[75%] max-w-[320px] p-0 flex flex-col"
        hideCloseButton
      >
        {/* Título para accesibilidad (oculto visualmente) */}
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>

        {/* Header con logo y botón cerrar */}
        <div className="flex items-center justify-between p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center">
              <Image src={logoSvg} alt="Buki" width={40} height={50} className="h-10 w-auto object-contain" />
            </div>
            <span className="font-bold tracking-tight text-xl">Buki</span>
          </Link>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-muted"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar menú</span>
            </Button>
          </SheetClose>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col p-6">
          <div className="space-y-1">
            <SheetClose asChild>
              <Link
                href="/pricing"
                className="flex items-center justify-between text-lg font-medium text-foreground py-4 px-4 rounded-xl hover:bg-muted transition-colors group"
              >
                <span>Precios</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/login"
                className="flex items-center justify-between text-lg font-medium text-foreground py-4 px-4 rounded-xl hover:bg-muted transition-colors group"
              >
                <span>Ingresar</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            </SheetClose>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* CTA Button */}
          <div className="pt-6 border-t">
            <SheetClose asChild>
              <Link href="/signup" className="block">
                <Button
                  className="w-full h-14 rounded-full font-semibold text-base shadow-lg shadow-primary/20"
                  size="lg"
                >
                  Comenzar Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </SheetClose>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Sin tarjeta de crédito requerida
            </p>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
