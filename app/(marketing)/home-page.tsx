'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { FlipWords } from '@/components/ui/flip-words'
import { InteractiveFeatureCards } from '@/components/marketing/feature-cards'
import { HeroDashboardMockup } from '@/components/marketing/hero-dashboard-mockup'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { FAQ } from '@/components/marketing/faq'

export default function HomePage() {
  const words = ["Inteligente", "Rápida", "Elegante", "Sin\u00A0Estrés"]

  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* 3D Scroll Hero Section with Aurora */}
      <AuroraBackground className="min-h-0 h-auto bg-background dark:bg-background pt-24">
        {/* Fade to background at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-75 bg-linear-to-t from-background to-transparent z-10 pointer-events-none" />

        <div className="relative z-20 flex flex-col overflow-hidden w-full pt-12 md:pt-8" style={{ position: "relative" }}>
          <ContainerScroll
            titleComponent={
              <div className="flex flex-col items-center justify-center space-y-8 mb-10 md:mb-20">
                <h1 className="text-4xl md:text-7xl font-bold text-foreground leading-tight text-center max-w-4xl">
                  Gestiona tu negocio de forma <br />
                  <span className="text-primary inline-block min-w-[200px] md:min-w-[400px]">
                    <FlipWords words={words} className="text-indigo-600 dark:text-indigo-400" />
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-center leading-relaxed">
                  La plataforma todo-en-uno para profesionales que valoran su tiempo.
                  Automatiza citas, pagos y recordatorios mientras duermes.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto px-4">
                  <Button size="lg" className="h-14 px-8 rounded-full text-base font-semibold shadow-xl shadow-primary/20 w-full sm:w-auto" asChild>
                    <Link href="/signup">
                      Comenzar Gratis <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base bg-background/50 backdrop-blur-sm hover:bg-muted/50 w-full sm:w-auto" asChild>
                    <Link href="#features">Ver cómo funciona</Link>
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground pt-2">
                  ✨ Sin tarjeta de crédito · Configuración en 5 minutos
                </p>
              </div>
            }
          >
            {/* The Actual Dashboard Mockup inside the 3D Card */}
            <HeroDashboardMockup />
          </ContainerScroll>
        </div>
      </AuroraBackground>

      {/* Features Grid */}
      <section id="features" className="container px-4 py-24 md:py-32 relative bg-background scroll-mt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[1000px] bg-primary/5 blur-[120px] rounded-full -z-10" />

        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Todo lo que necesitas. <br /><span className="text-muted-foreground font-normal">Nada que sobre.</span></h2>
          <p className="text-muted-foreground text-lg">Una suite completa diseñada obsesivamente para ser simple.</p>
        </div>

        <InteractiveFeatureCards />
      </section>

      {/* FAQ */}
      <FAQ />

      {/* CTA Final */}
      <section className="container px-4 py-24 md:py-32">
        <div className="relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
          </div>

          <div className="text-center max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              ¿Listo para empezar?
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
              Crea tu página de reservas en minutos. Sin complicaciones, sin tarjeta de crédito.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <Button size="lg" className="h-12 px-8 rounded-full text-base font-medium" asChild>
                <Link href="/signup">
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base" asChild>
                <Link href="/pricing">Ver precios</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
