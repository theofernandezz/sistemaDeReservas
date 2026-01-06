import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, X, HelpCircle } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="pb-24 pt-16">
      <div className="container px-4 text-center max-w-4xl mx-auto mb-16 space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Precios simples.</h1>
        <p className="text-xl text-muted-foreground">Comienza gratis sin riesgo. Escala cuando lo necesites.</p>
      </div>

      <div className="container px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="rounded-3xl border bg-background/50 p-8 flex flex-col gap-6 hover:border-primary/50 transition-colors duration-300">
            <div>
              <h3 className="text-xl font-medium mb-2">Inicial</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Para individuos que recién comienzan.</p>
            </div>
            <Button variant="outline" className="w-full rounded-full" asChild>
              <Link href="/signup">Empezar Gratis</Link>
            </Button>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> 50 reservas mens.</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> 1 calendario</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Recordatorios email</div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="rounded-3xl border border-primary bg-primary/5 p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
              POPULAR
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2 text-primary">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$15</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Para profesionales con alto volumen.</p>
            </div>
            <Button className="w-full rounded-full shadow-lg shadow-primary/20" asChild>
              <Link href="/signup">Prueba 14 días gratis</Link>
            </Button>
            <div className="space-y-3 text-sm font-medium">
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Reservas ilimitadas</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Pagos online</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> WhatsApp Reminders</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-primary" /> Custom Branding</div>
            </div>
          </div>

          {/* Team Plan */}
          <div className="rounded-3xl border bg-background/50 p-8 flex flex-col gap-6 hover:border-primary/50 transition-colors duration-300">
            <div>
              <h3 className="text-xl font-medium mb-2">Equipos</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Para clínicas y agencias.</p>
            </div>
            <Button variant="outline" className="w-full rounded-full" asChild>
              <Link href="/signup">Contactar Ventas</Link>
            </Button>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-muted-foreground" /> Todo en Pro</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-muted-foreground" /> 5 miembros</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-muted-foreground" /> Admin dashboard</div>
              <div className="flex items-center gap-3"><Check className="w-4 h-4 text-muted-foreground" /> Soporte prioritario</div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-24">
          <h2 className="text-2xl font-semibold mb-8 text-center">Comparación detallada</h2>
          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="p-4 pl-6">Funcionalidad</th>
                  <th className="p-4 text-center">Inicial</th>
                  <th className="p-4 text-center text-primary">Pro</th>
                  <th className="p-4 text-center">Equipos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="bg-background">
                  <td className="p-4 pl-6 font-medium">Reservas Mensuales</td>
                  <td className="p-4 text-center">50</td>
                  <td className="p-4 text-center font-bold">Ilimitadas</td>
                  <td className="p-4 text-center font-bold">Ilimitadas</td>
                </tr>
                <tr className="bg-background">
                  <td className="p-4 pl-6 font-medium">Calendarios Conectados</td>
                  <td className="p-4 text-center">1</td>
                  <td className="p-4 text-center">3</td>
                  <td className="p-4 text-center">Todo el equipo</td>
                </tr>
                <tr className="bg-background">
                  <td className="p-4 pl-6 font-medium">Pagos Online (Stripe/MP)</td>
                  <td className="p-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground/30" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                </tr>
                <tr className="bg-background">
                  <td className="p-4 pl-6 font-medium">Marca blanca (Checkout)</td>
                  <td className="p-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground/30" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                </tr>
                <tr className="bg-background">
                  <td className="p-4 pl-6 font-medium">API Access</td>
                  <td className="p-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground/30" /></td>
                  <td className="p-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground/30" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
