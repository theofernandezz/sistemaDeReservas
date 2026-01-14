'use client'

import { Calendar, ChevronLeft, ChevronRight, Clock, MoreHorizontal, Search, Bell, Plus, Users, TrendingUp, CreditCard } from 'lucide-react'
import { HeroAnimation } from '@/components/marketing/hero-animation'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export function HeroDashboardMockup() {
  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden relative select-none">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image src="/logo/icon.jpg" alt="Buki" width={40} height={50} className="h-10 w-auto object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
            <Search className="w-4 h-4" />
            <span>Buscar cita...</span>
            <span className="ml-4 text-xs opacity-50">⌘K</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium bg-green-500/10 text-green-600 px-3 py-1 rounded-full border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema Operativo
          </div>
          <ButtonIcon icon={Bell} />
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border ring-2 ring-background ml-2" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Simplified) */}
        <div className="w-16 lg:w-64 border-r bg-card/30 flex-shrink-0 hidden md:flex flex-col justify-between p-4">
          <div className="space-y-2">
            <SidebarItem active icon={Calendar} label="Calendario" />
            <SidebarItem icon={Users} label="Clientes" />
            <SidebarItem icon={CreditCard} label="Pagos" />
            <SidebarItem icon={TrendingUp} label="Reportes" />
          </div>
          <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/10">
             <div className="text-xs font-semibold mb-1 text-primary">Pro Plan</div>
             <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full w-[70%] bg-primary rounded-full" />
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-secondary/10 p-4 lg:p-6 overflow-hidden flex flex-col gap-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Ingresos (Mes)" value="$1.2M" trend="+12%" />
            <StatCard label="Citas Totales" value="142" trend="+5%" />
            <StatCard label="Nuevos Clientes" value="28" trend="+18%" />
            <StatCard label="Pendientes" value="3" neutral />
          </div>

          {/* Calendar Area (The real animation lives here) */}
          <div className="flex-1 bg-background rounded-xl border shadow-sm relative overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Agenda de Hoy</h3>
                <div className="flex gap-1">
                    <ButtonIcon icon={ChevronLeft} size="sm" />
                    <ButtonIcon icon={ChevronRight} size="sm" />
                    <div className="ml-2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Nueva
                    </div>
                </div>
            </div>
            
            {/* We embed the HeroAnimation but scaled to fit naturally */}
            <div className="flex-1 relative bg-secondary/5">
                <div className="absolute inset-0 p-4 overflow-hidden">
                   {/* Abstract representation of calendar grid */}
                   <div className="w-full h-full border rounded-lg bg-background shadow-inner opacity-80 scale-[0.98] origin-top">
                        <HeroAnimation />
                   </div>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function SidebarItem({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            active ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary"
        )}>
            <Icon className="w-4 h-4" />
            <span className="hidden lg:inline">{label}</span>
        </div>
    )
}

function StatCard({ label, value, trend, neutral }: { label: string, value: string, trend?: string, neutral?: boolean }) {
    return (
        <div className="bg-background p-4 rounded-xl border shadow-sm flex flex-col justify-between gap-2">
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
            <div className="flex items-end justify-between">
                <div className="text-lg lg:text-2xl font-bold tracking-tight">{value}</div>
                {trend && (
                    <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", neutral ? "bg-secondary text-foreground" : "bg-green-500/10 text-green-600")}>
                        {trend}
                    </div>
                )}
            </div>
        </div>
    )
}

function ButtonIcon({ icon: Icon, size = "md" }: { icon: any, size?: "sm" | "md" }) {
    return (
        <div className={cn(
            "rounded-md border bg-background flex items-center justify-center hover:bg-secondary cursor-pointer transition-colors",
            size === "sm" ? "w-7 h-7" : "w-9 h-9"
        )}>
            <Icon className={cn("text-muted-foreground", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
        </div>
    )
}
