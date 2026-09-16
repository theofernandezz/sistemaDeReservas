import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { ProductShowcase } from '@/components/marketing/product-showcase'
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
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Kicker */}
          <div className="inline-flex items-center gap-3 mb-7 animate-in fade-in duration-500">
            <span className="h-0.5 w-5 bg-[oklch(0.56_0.19_280)]" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Reservas online · Argentina
            </span>
            <span className="h-0.5 w-5 bg-[oklch(0.56_0.19_280)]" />
          </div>

          {/* Headline */}
          <h1
            className="font-extrabold tracking-[-0.03em] leading-[1] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
            style={{ fontSize: 'clamp(2.75rem, 6vw, 4.25rem)' }}
          >
            Tu negocio,<br />
            <span className="text-[oklch(0.56_0.19_280)]">sin el caos.</span>
          </h1>

          {/* Sub */}
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
            La plataforma todo-en-uno para profesionales que quieren cobrar más, atender mejor y no perderse un turno.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
            <Button
              size="lg"
              className="h-[52px] px-7 rounded-[11px] text-base font-semibold bg-[oklch(0.56_0.19_280)] hover:bg-[oklch(0.48_0.19_280)] group w-full sm:w-auto"
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
              className="h-[52px] px-5 rounded-[11px] text-base text-muted-foreground hover:text-foreground w-full sm:w-auto"
              asChild
            >
              <Link href="#features">Ver funcionalidades →</Link>
            </Button>
          </div>

          {/* Trust line */}
          <p className="mt-5 text-xs text-muted-foreground/70 animate-in fade-in duration-700 delay-300 fill-mode-both">
            Sin tarjeta de crédito · Configuración en 5 minutos · Soporte en español
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center mt-8 pt-6 border-t border-border/50 animate-in fade-in duration-700 delay-300 fill-mode-both">
            {[
              { value: '2 min', label: 'Para publicar' },
              { value: '0%', label: 'Comisión' },
              { value: '24/7', label: 'Automático' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <span className="h-7 w-px bg-border mx-6" />}
                <div className="text-center">
                  <div className="text-[22px] font-extrabold tracking-[-0.01em] tabular-nums">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device showcase: the real dashboard, on desktop and on the phone */}
        <ProductShowcase />
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
      <section className="relative overflow-hidden bg-[oklch(0.97_0.018_280)] py-28 md:py-36">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-[oklch(0.56_0.19_280)]/10 blur-[120px]" />
        </div>

        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            {/* Left */}
            <div className="space-y-4 max-w-xl">
              <h2
                className="font-extrabold tracking-[-0.04em] leading-[0.95] text-foreground"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
              >
                Empezá hoy.<br />
                <span className="text-[oklch(0.56_0.19_280)]">Sin excusas.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Crea tu página de reservas en minutos. Sin tarjeta de crédito, sin contratos.
              </p>
            </div>

            {/* Right */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Button
                size="lg"
                className="h-13 px-10 rounded-full text-base font-semibold bg-[oklch(0.56_0.19_280)] hover:bg-[oklch(0.48_0.19_280)] shadow-none group"
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
                className="h-13 px-8 rounded-full text-base text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                asChild
              >
                <Link href="/pricing">Ver planes →</Link>
              </Button>
              <p className="text-xs text-muted-foreground/60 text-center lg:text-left mt-1">
                Sin tarjeta de crédito · 5 minutos de setup
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
