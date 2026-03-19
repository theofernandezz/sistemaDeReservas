'use client'

import { Ban, Bell, CalendarCheck, CheckCircle, ChevronRight, Clock, ExternalLink } from 'lucide-react'
import { HeroAnimation } from '@/components/marketing/hero-animation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import logo from '@/public/logo/icon.png'

// Fake appointments that look real
const APPOINTMENTS = [
  { id: 1, time: '09:00', end: '09:30', client: 'María González', service: 'Consulta premium', status: 'confirmed', isCurrent: true },
  { id: 2, time: '10:30', end: '11:00', client: 'Lucas Fernández', service: 'Corte y barba', status: 'confirmed', isCurrent: false },
  { id: 3, time: '12:00', end: '12:45', client: 'Valentina Ruiz', service: 'Coloración', status: 'pending', isCurrent: false, isPast: true },
]

const STATUS_BADGE = {
  confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
} as const

const STATUS_LABEL = { confirmed: 'Confirmado', pending: 'Pendiente', cancelled: 'Cancelado' } as const

export function HeroDashboardMockup() {
  return (
    <div className="w-full h-full bg-secondary/10 flex flex-col overflow-hidden relative select-none">

      {/* ── Top Nav ── matches the real dashboard nav */}
      <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 bg-background z-10">
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src={logo} alt="Buki" width={100} height={60} className="h-7 w-auto object-contain" priority />
            <span className="font-semibold text-sm hidden sm:inline tracking-tight">Mi Negocio</span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {['Inicio', 'Calendario', 'Servicios', 'Disponibilidad'].map((item) => (
              <div
                key={item}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  item === 'Inicio'
                    ? 'text-foreground bg-secondary'
                    : 'text-muted-foreground'
                )}
              >
                {item}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium bg-green-500/10 text-green-600 px-3 py-1 rounded-full border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Sistema Operativo
          </div>
          <div className="w-8 h-8 rounded-md border border-border/50 bg-background flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-border/50" />
        </div>
      </div>

      {/* ── Main Content ── matches p-6 md:p-8 max-w-7xl */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header row — matches real dashboard header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-border/50 pb-5">
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                Resumen de hoy
              </h1>
              <p className="text-xs text-muted-foreground">
                Lunes 20 de enero · Tienes 3 citas pendientes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 text-xs font-medium border border-border/50 text-muted-foreground">
                <Ban className="w-3 h-3" />
                Bloquear horario
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-sm">
                <ExternalLink className="w-3 h-3" />
                Ver mi página
              </div>
            </div>
          </div>

          {/* Asymmetric grid — 8/4 like the real dashboard */}
          <div className="grid grid-cols-12 gap-5">

            {/* ── Agenda column (8/12) ── */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                  Agenda
                </h2>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  Ver calendario completo <ChevronRight className="w-3 h-3" />
                </span>
              </div>

              {/* Appointment card */}
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-border/50">
                  {APPOINTMENTS.map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        'px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-all',
                        apt.isPast && 'opacity-50',
                        apt.isCurrent && 'bg-primary/5 outline outline-1 outline-primary/20'
                      )}
                    >
                      {/* Time */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 min-w-16">
                        <p className={cn('text-xs font-semibold', apt.isCurrent ? 'text-primary' : 'text-foreground')}>
                          {apt.time}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{apt.end}</p>
                      </div>

                      {/* Divider */}
                      <div className="hidden sm:block w-px h-8 bg-border/50" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{apt.client}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{apt.service}</p>
                      </div>

                      {/* Badge */}
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-medium border shrink-0',
                        STATUS_BADGE[apt.status as keyof typeof STATUS_BADGE]
                      )}>
                        {STATUS_LABEL[apt.status as keyof typeof STATUS_LABEL]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Animation area — the booking flow preview */}
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                  <h2 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                    Vista del cliente — Página de reservas
                  </h2>
                </div>
                <div className="h-[260px] md:h-[320px] relative bg-secondary/5 p-3">
                  <div className="w-full h-full border border-border/50 rounded-xl bg-background shadow-inner overflow-hidden">
                    <HeroAnimation />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats sidebar (4/12) ── */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <h2 className="text-sm font-medium text-foreground">Métricas</h2>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {/* Stat: Total */}
                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Total hoy</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">8</p>
                    <span className="text-[10px] text-muted-foreground">citas</span>
                  </div>
                </div>

                {/* Stat: Pending */}
                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Por atender</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">5</p>
                    <span className="text-[10px] text-muted-foreground">pendientes</span>
                  </div>
                </div>

                {/* Stat: Completed */}
                <div className="col-span-2 lg:col-span-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Completadas</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">3</p>
                    <span className="text-[10px] text-muted-foreground">citas finalizadas</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '37.5%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
