import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { HeroAnimation } from '@/components/marketing/hero-animation'
import { InteractiveFeatureCards } from '@/components/marketing/feature-cards'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-[100%] blur-3xl -z-10 opacity-50 pointer-events-none" />

        <div className="container px-4 text-center max-w-4xl mx-auto space-y-8 animate-[fade-in_0.6s_ease-out_forwards]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-secondary text-secondary-foreground text-sm font-medium backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            V2.0 ahora disponible
          </div>

          <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter text-balance">
            Tu tiempo vale oro. <br />
            <span className="text-muted-foreground">Gestionalo con estilo.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            La plataforma de reservas diseñada para profesionales que valoran la estética y la eficiencia. Sin fricción. Sin complicaciones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all" asChild>
              <Link href="/signup">
                Empezar Ahora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base bg-background/50 backdrop-blur-sm hover:bg-muted/50" asChild>
              <Link href="/pricing">Ver Demo</Link>
            </Button>
          </div>
        </div>

        {/* Hero Visual Mockup (Interactive) */}
        <div className="container mt-16 md:mt-24 px-4 relative">
          <div className="max-w-5xl mx-auto animate-[slide-up_0.8s_ease-out_forwards_0.2s] opacity-0">
            <HeroAnimation />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container px-4 text-center">
        <p className="text-sm font-medium text-muted-foreground mb-8">CONFIADO POR MÁS DE 10,000 PROFESIONALES</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {['Acme Inc', 'Vertex', 'Novus', 'Global', 'Starlight'].map((brand) => (
            <div key={brand} className="text-xl font-bold font-serif">{brand}</div>
          ))}
        </div>
      </section>

      {/* Interactive Bento Grid Features */}
      <section className="container px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">Todo lo que necesitas.</h2>
          <p className="text-muted-foreground text-lg">Una suite completa de herramientas poderosas, empaquetadas en una interfaz simple.</p>
        </div>

        <InteractiveFeatureCards />

      </section>

      {/* CTA Section */}
      <section className="container px-4 pt-16">
        <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Recupera el control de tu agenda.</h2>
            <p className="text-primary-foreground/80 text-xl leading-relaxed">
              Únete a los profesionales que han simplificado su vida con Reserva.
            </p>
            <div className="flex justify-center pt-4">
              <Button size="lg" variant="secondary" className="h-14 px-8 rounded-full text-lg shadow-2xl" asChild>
                <Link href="/signup">Crear cuenta gratuita</Link>
              </Button>
            </div>
            <p className="text-sm opacity-60">No se requiere tarjeta de crédito</p>
          </div>
        </div>
      </section>
    </div>
  )
}
