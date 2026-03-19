import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { HeroDashboardMockup } from '@/components/marketing/hero-dashboard-mockup'
import dynamic from 'next/dynamic'

// Lazy load heavy interactive components below the fold
const InteractiveFeatureCards = dynamic(
  () => import('@/components/marketing/feature-cards').then((mod) => mod.InteractiveFeatureCards),
  { loading: () => <div className="h-[600px] w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div> }
)

const FAQ = dynamic(
  () => import('@/components/marketing/faq').then((mod) => mod.FAQ),
  { loading: () => <div className="h-[400px] w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div> }
)

export default function HomePage() {
  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-0 pt-32 pb-0 overflow-hidden">
        {/* Single calm radial glow — no grids, no aurora */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] w-[900px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        </div>

        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two-column asymmetric layout */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-12 lg:gap-20">

            {/* LEFT — Headline */}
            <div className="flex-1 space-y-8">
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground animate-in fade-in duration-500"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Reservas automáticas · Argentina
              </div>

              {/* Headline */}
              <h1
                className="font-extrabold tracking-[-0.04em] leading-[0.92] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ fontSize: 'clamp(3rem, 7.5vw, 5.8rem)' }}
              >
                Tu negocio,<br />
                <em className="not-italic text-foreground/40 font-semibold">
                  sin el caos.
                </em>
              </h1>

              {/* Sub */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                La plataforma todo-en-uno para profesionales que quieren cobrar más, atender mejor y no perderse un turno.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                <Button
                  size="lg"
                  className="h-12 px-8 rounded-full text-base font-semibold shadow-md shadow-primary/15 group w-full sm:w-auto"
                  asChild
                >
                  <Link href="/signup">
                    Comenzar gratis
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-5 rounded-full text-base text-muted-foreground hover:text-foreground w-full sm:w-auto"
                  asChild
                >
                  <Link href="#features">Ver funcionalidades →</Link>
                </Button>
              </div>

              {/* Social proof / trust */}
              <p className="text-xs text-muted-foreground/60 animate-in fade-in duration-700 delay-300 fill-mode-both">
                Sin tarjeta de crédito · Configuración en 5 minutos · Soporte en español
              </p>
            </div>

            {/* RIGHT — Stats sidebar, desktop only */}
            <div className="hidden lg:flex flex-col gap-7 pb-6 shrink-0 min-w-[180px] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
              {[
                { value: '2 min', label: 'Para publicar tu página' },
                { value: '0%', label: 'Comisión por reserva' },
                { value: '24/7', label: 'Turnos automáticos' },
              ].map((s) => (
                <div key={s.label} className="border-l-2 border-primary/25 pl-4">
                  <div
                    className="font-extrabold tracking-[-0.03em] text-foreground tabular-nums"
                    style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row — mobile */}
          <div className="flex lg:hidden justify-between mt-10 pt-8 border-t border-border/30 animate-in fade-in duration-700 delay-300 fill-mode-both">
            {[
              { value: '2 min', label: 'Setup' },
              { value: '0%', label: 'Comisión' },
              { value: '24/7', label: 'Automático' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold tracking-tight tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard 3D scroll card */}
        <div className="mt-16">
          <ContainerScroll titleComponent={<></>}>
            <HeroDashboardMockup />
          </ContainerScroll>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────── */}
      <section
        id="features"
        className="relative bg-background scroll-mt-20 py-28 md:py-36"
      >
        {/* Subtle center glow */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label + headline */}
          <div className="max-w-2xl mb-16 md:mb-20 space-y-4">
            <p className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
              Funcionalidades
            </p>
            <h2 className="font-extrabold tracking-[-0.035em] leading-tight text-foreground" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)' }}>
              Todo lo que necesitás.<br />
              <span className="text-muted-foreground font-medium">Nada que sobre.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              Una suite completa diseñada obsesivamente para ser simple y funcionar desde el primer día.
            </p>
          </div>

          <InteractiveFeatureCards />
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <FAQ />

      {/* ─── CTA FINAL ────────────────────────────────────────────── */}
      <section className="bg-foreground text-background py-28 md:py-36">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            {/* Left */}
            <div className="space-y-4 max-w-xl">
              <h2
                className="font-extrabold tracking-[-0.04em] leading-[0.95] text-background"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
              >
                Empezá hoy.<br />
                <span className="text-background/50 font-medium">Sin excusas.</span>
              </h2>
              <p className="text-background/60 text-lg leading-relaxed">
                Crea tu página de reservas en minutos. Sin tarjeta de crédito, sin contratos.
              </p>
            </div>

            {/* Right */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Button
                size="lg"
                className="h-13 px-10 rounded-full text-base font-semibold bg-background text-foreground hover:bg-background/90 shadow-none group"
                asChild
              >
                <Link href="/signup">
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-13 px-8 rounded-full text-base text-background/60 hover:bg-white/10 hover:text-background"
                asChild
              >
                <Link href="/pricing">Ver planes →</Link>
              </Button>
              <p className="text-xs text-background/30 text-center lg:text-left mt-1">
                Sin tarjeta de crédito · 5 minutos de setup
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
