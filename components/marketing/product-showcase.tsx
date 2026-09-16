import {
  LayoutGrid,
  CalendarDays,
  CalendarCheck,
  Clock3,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Servicios', icon: LayoutGrid },
  { label: 'Calendario', icon: CalendarDays, active: true },
  { label: 'Citas', icon: CalendarCheck },
  { label: 'Disponibilidad', icon: Clock3 },
  { label: 'Configuración', icon: Settings },
]

const agenda = [
  { time: '09:00', name: 'Lucas Herrera', service: 'Corte clásico', status: 'confirmed' as const },
  { time: '11:30', name: 'Camila Ruiz', service: 'Color y mechas', status: 'pending' as const },
  { time: '15:00', name: 'Franco Díaz', service: 'Corte + Barba', status: 'confirmed' as const },
]

const calendarAppointments = [
  { name: 'Lucas Herrera', service: 'Corte clásico', time: '09:00 – 09:45', status: 'confirmed' as const },
  { name: 'Camila Ruiz', service: 'Color y mechas', time: '11:30 – 13:00', status: 'pending' as const },
  { name: 'Franco Díaz', service: 'Corte + Barba', time: '15:00 – 16:00', status: 'completed' as const },
]

const statusStyles = {
  confirmed: { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', bar: 'border-l-emerald-500 bg-emerald-500/5', label: 'Confirmado' },
  pending: { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', bar: 'border-l-amber-500 bg-amber-500/5', label: 'Pendiente' },
  completed: { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20', bar: 'border-l-blue-500 bg-blue-500/5', label: 'Completado' },
}

const days = [
  { label: 'Lun', num: 24 },
  { label: 'Mar', num: 25 },
  { label: 'Mié', num: 26, today: true },
  { label: 'Jue', num: 27 },
  { label: 'Vie', num: 28 },
]

/**
 * ProductShowcase - "how it looks" hero visual: a browser window with the real
 * dashboard home, and a phone with the real calendar (sample data). Desktop only.
 */
export function ProductShowcase() {
  return (
    <div className="relative mx-auto mt-20 hidden h-[480px] w-full max-w-[940px] lg:block">
      {/* grounding shadow */}
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-[50px] w-[680px] -translate-x-1/2 rounded-full bg-foreground/10 blur-[50px]"
      />

      {/* Browser window: dashboard home */}
      <div className="absolute left-0 top-0 z-10 w-[760px] overflow-hidden rounded-2xl border border-border bg-background shadow-[0_34px_64px_-30px_rgba(0,0,0,0.24)]">
        {/* chrome bar */}
        <div className="flex h-10 items-center gap-3.5 border-b border-border bg-secondary/50 px-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-[1.4px] border-foreground/20" />
            <span className="h-2.5 w-2.5 rounded-full border-[1.4px] border-foreground/20" />
            <span className="h-2.5 w-2.5 rounded-full border-[1.4px] border-foreground/20" />
          </div>
          <div className="flex h-6 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-muted-foreground">
            <Lock size={10} />
            <span className="text-[11px]">app.devorabuki.com/dashboard</span>
          </div>
        </div>

        <div className="flex items-stretch">
          {/* sidebar */}
          <div className="flex w-[148px] shrink-0 flex-col border-r border-border bg-background p-3">
            <div className="mb-2.5 border-b border-border pb-3">
              <div className="text-xs font-bold text-foreground">Estudio Norte</div>
              <div className="mt-0.5 text-[9px] text-muted-foreground">/estudio-norte</div>
            </div>
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-1.5 py-1.5',
                    item.active && 'bg-secondary'
                  )}
                >
                  <item.icon size={11} className={item.active ? 'text-foreground' : 'text-muted-foreground'} />
                  <span className={cn('text-[9.5px]', item.active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex-1" />
            <div className="pt-2 text-[8.5px] text-muted-foreground">Ver página pública →</div>
          </div>

          {/* main */}
          <div className="flex-1 p-[18px_22px]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-bold tracking-tight text-foreground">Resumen de hoy</h3>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Miércoles, 27 de agosto · Tenés 3 citas pendientes.</p>
              </div>
              <span className="rounded-md bg-foreground px-2.5 py-1.5 text-[9px] font-semibold text-background">Ver mi página</span>
            </div>

            <div className="mt-4 flex items-stretch gap-3">
              {/* agenda */}
              <div className="flex-[1.7] overflow-hidden rounded-lg border border-border">
                {agenda.map((apt, i) => (
                  <div
                    key={apt.time}
                    className={cn('flex items-center gap-2.5 px-3 py-2.5', i < agenda.length - 1 && 'border-b border-border')}
                  >
                    <span className="min-w-[30px] text-[10.5px] font-bold text-foreground">{apt.time}</span>
                    <span className="h-4.5 w-px bg-border" />
                    <span className="flex-1">
                      <span className="block text-[11px] font-bold text-foreground">{apt.name}</span>
                      <span className="block text-[9px] text-muted-foreground">{apt.service}</span>
                    </span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[8px] font-bold', statusStyles[apt.status].badge)}>
                      {statusStyles[apt.status].label}
                    </span>
                  </div>
                ))}
              </div>

              {/* stats */}
              <div className="flex flex-1 flex-col gap-2.5">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Total hoy</div>
                  <div className="mt-0.5 text-[19px] font-bold text-foreground">
                    6 <span className="text-[9px] font-medium text-muted-foreground">citas</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Completadas</div>
                  <div className="mt-0.5 text-[19px] font-bold text-foreground">2</div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[34%] rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone: calendar, sample clients loaded */}
      <div className="absolute right-0 top-[105px] z-20 w-[224px] rotate-3 rounded-[34px] bg-foreground p-[24px_7px_16px] shadow-[0_28px_54px_-18px_rgba(0,0,0,0.38)]">
        <span className="absolute left-1/2 top-[9px] h-3 w-[46px] -translate-x-1/2 rounded-full bg-background/30" />

        <div className="h-[302px] w-full overflow-hidden rounded-[26px] bg-background">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground text-[9px] font-bold text-background">E</div>
              <span className="text-[10.5px] font-bold text-foreground">Estudio Norte</span>
            </div>
            <Menu size={13} className="text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between px-3.5 pt-2.5">
            <div className="flex items-center gap-1">
              <ChevronLeft size={9} className="text-muted-foreground" />
              <span className="text-[10.5px] font-bold text-foreground">Agosto 2026</span>
              <ChevronRight size={9} className="text-muted-foreground" />
            </div>
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-foreground text-background">
              <Plus size={10} />
            </span>
          </div>

          <div className="flex justify-between px-3.5 pt-2.5">
            {days.map((d) => (
              <div
                key={d.label}
                className={cn(
                  'flex flex-col items-center rounded-xl px-1.5 py-1',
                  d.today && 'bg-foreground text-background'
                )}
              >
                <span className={cn('text-[6.5px] font-bold uppercase', d.today ? 'text-background/60' : 'text-muted-foreground')}>{d.label}</span>
                <span className={cn('mt-0.5 text-xs font-bold', !d.today && 'text-foreground')}>{d.num}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-2.5">
            {calendarAppointments.map((apt) => (
              <div key={apt.name} className={cn('rounded-lg border-l-[3px] px-2.5 py-2', statusStyles[apt.status].bar)}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground">{apt.name}</span>
                  <span className={cn('text-[7px] font-bold', statusStyles[apt.status].badge.match(/text-\S+/)?.[0])}>
                    {statusStyles[apt.status].label}
                  </span>
                </div>
                <div className="mt-0.5 text-[8.5px] text-muted-foreground">{apt.service}</div>
                <span className="mt-1.5 inline-block rounded bg-secondary px-1.5 py-0.5 text-[7.5px] text-muted-foreground">{apt.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
