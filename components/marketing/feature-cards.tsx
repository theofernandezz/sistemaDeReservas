'use client'

import { Calendar, Globe, Zap, Shield, CreditCard, Users, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function InteractiveFeatureCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Global Card - Animated Pins */}
      <div className="md:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group min-h-[300px]">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold mb-2">Disponibilidad Global</h3>
            <p className="text-muted-foreground max-w-md">Detección automática de zonas horarias. Tus clientes verán los horarios en su hora local.</p>
          </div>
        </div>

        {/* Animated Background Map */}
        <div className="absolute top-0 right-0 w-2/3 h-full opacity-10 md:opacity-100 pointer-events-none">
          <div className="relative w-full h-full">
            {/* Simplified World Map Dots */}
            <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary rounded-full animate-ping" />
            <div className="absolute top-1/3 right-1/2 w-2 h-2 bg-primary rounded-full animate-ping delay-700" />
            <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-primary rounded-full animate-ping delay-300" />

            {/* Connecting lines SVG can go here */}
            <svg className="absolute inset-0 w-full h-full stroke-primary/20" viewBox="0 0 200 200">
              <path d="M100,50 Q150,100 120,150" fill="none" strokeWidth="1" className="animate-[grow_3s_infinite]" />
            </svg>
          </div>
        </div>
      </div>

      {/* Instant Payments - Simulated Transaction */}
      <PaymentCard />

      {/* Teams - Simulated Drag & Drop */}
      <div className="glass-card p-8 rounded-3xl relative overflow-hidden group min-h-[300px] flex flex-col">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-600">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Equipos</h3>
        <p className="text-muted-foreground text-sm mb-6">Gestión inteligente de turnos.</p>

        <div className="flex-1 relative bg-background/50 rounded-xl border border-dashed p-3 space-y-2 overflow-hidden">
          <div className="flex items-center gap-2 p-2 bg-background rounded border shadow-sm animate-[slide-up_2s_infinite]">
            <div className="w-6 h-6 rounded-full bg-blue-100" />
            <div className="h-2 w-16 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-2 p-2 bg-background rounded border shadow-sm animate-[slide-up_2.5s_infinite]">
            <div className="w-6 h-6 rounded-full bg-green-100" />
            <div className="h-2 w-12 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-2 p-2 bg-background rounded border shadow-sm animate-[slide-up_3s_infinite]">
            <div className="w-6 h-6 rounded-full bg-amber-100" />
            <div className="h-2 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentCard() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle')

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus('processing')
      setTimeout(() => setStatus('success'), 1500)
      setTimeout(() => setStatus('idle'), 3000)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600">
        <Shield className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Pagos Seguros</h3>
      <p className="text-muted-foreground text-sm mb-8">Cobros automáticos con Stripe.</p>

      {/* Dynamic Credit Card */}
      <div className={cn(
        "bg-zinc-900 text-white p-4 rounded-xl shadow-xl transition-all duration-500 transform",
        status === 'success' ? "scale-105 bg-green-600 ring-4 ring-green-200/50" : ""
      )}>
        <div className="flex justify-between items-center mb-4">
          <CreditCard className="w-5 h-5 opacity-80" />
          <span className="text-xs opacity-60">VISA</span>
        </div>
        <div className="text-lg font-mono tracking-wider mb-2">
          •••• 4242
        </div>
        <div className="flex justify-between items-center">
          <div className="h-2 w-12 bg-white/20 rounded-full" />
          {status === 'processing' && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-5 w-5 text-white animate-in zoom-in" />}
          {status === 'idle' && <span className="text-xs opacity-60">$50.00</span>}
        </div>
      </div>
    </div>
  )
}
