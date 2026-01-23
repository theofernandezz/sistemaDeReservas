'use client'

import { Calendar, ChevronLeft, ChevronRight, Clock, Bell, Plus, CalendarCheck, CheckCircle2 } from 'lucide-react'
import { HeroAnimation } from '@/components/marketing/hero-animation'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export function HeroDashboardMockup() {
  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden relative select-none">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-6">
          {/* Logo + Business Name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <Image src="/logo/icon.png" alt="Buki" width={100} height={60} className="h-8 w-auto object-contain" />
            </div>
            <span className="font-semibold text-sm hidden sm:inline">Mi Negocio</span>
          </div>
          
          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            <NavItem label="Inicio" active />
            <NavItem label="Calendario" />
            <NavItem label="Servicios" />
            <NavItem label="Disponibilidad" />
          </nav>
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

      {/* Main Content Area (No Sidebar) */}
      <div className="flex-1 bg-secondary/10 p-4 lg:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Greeting */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Buenos días 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Lunes 20 de enero
            </p>
          </div>

          {/* Stats Row - Aligned with Real Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard 
              icon={CalendarCheck} 
              iconColor="text-primary" 
              iconBg="bg-primary/10"
              label="Citas hoy" 
              value="8" 
            />
            <StatCard 
              icon={Clock} 
              iconColor="text-emerald-500" 
              iconBg="bg-emerald-500/10"
              label="Por atender" 
              value="5" 
            />
            <StatCard 
              icon={CheckCircle2} 
              iconColor="text-blue-500" 
              iconBg="bg-blue-500/10"
              label="Completadas" 
              value="3" 
            />
          </div>

          {/* Agenda Card with Animation */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <CalendarCheck size={18} className="text-primary" />
                Agenda de hoy
              </h2>
              <div className="flex gap-2">
                <ButtonIcon icon={ChevronLeft} size="sm" />
                <ButtonIcon icon={ChevronRight} size="sm" />
                <div className="ml-2 px-3 py-2 bg-primary text-primary-foreground text-xs rounded-xl font-medium flex items-center gap-1.5 shadow-lg shadow-primary/25 transition-all hover:bg-primary/90">
                  <Plus className="w-3.5 h-3.5" /> Nueva
                </div>
              </div>
            </div>
            
            {/* Animation Area */}
            <div className="h-[400px] md:h-[500px] relative bg-secondary/5">
              <div className="absolute inset-0 p-4">
                <div className="w-full h-full border rounded-lg bg-background shadow-inner overflow-hidden">
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

interface NavItemProps {
  label: string
  active?: boolean
}

function NavItem({ label, active }: NavItemProps) {
  return (
    <div className={cn(
      "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
      active 
        ? "text-foreground bg-secondary" 
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    )}>
      {label}
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  label: string
  value: string
}

function StatCard({ icon: Icon, iconColor, iconBg, label, value }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

function ButtonIcon({ icon: Icon, size = "md" }: { icon: React.ComponentType<{ className?: string }>, size?: "sm" | "md" }) {
  return (
    <div className={cn(
      "rounded-md border bg-background flex items-center justify-center hover:bg-secondary cursor-pointer transition-colors",
      size === "sm" ? "w-7 h-7" : "w-9 h-9"
    )}>
      <Icon className={cn("text-muted-foreground", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />
    </div>
  )
}
