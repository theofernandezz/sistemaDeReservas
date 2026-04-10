'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  CalendarDays,
  LayoutGrid,
  Clock,
  Settings,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ChevronDown,
  Bell
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/dashboard/notification-center'
import { Business } from '@/types/database.types'

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home, href: '/dashboard' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendar' },
  { id: 'services', label: 'Servicios', icon: LayoutGrid, href: '/dashboard/services' },
  { id: 'reminders', label: 'Recordatorios', icon: Bell, href: '/dashboard/reminders' },
  { id: 'availability', label: 'Disponibilidad', icon: Clock, href: '/dashboard/availability' },
  { id: 'settings', label: 'Configuración', icon: Settings, href: '/dashboard/settings' },
]

interface DashboardNavbarProps {
  business: Business & { isViewing?: boolean }
  allBusinesses?: Business[] | null
  isSuperAdmin?: boolean
}

export function DashboardNavbar({ business }: DashboardNavbarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const initial = business.name.charAt(0).toUpperCase()
  const accentColor = business.settings?.accentColor || '#f97316' // Default orange if not set

  // Generate a dynamic gradient style based on the accent color
  const avatarStyle = {
    background: `linear-gradient(135deg, ${accentColor}dd 0%, ${accentColor}80 100%)`,
    boxShadow: `0 4px 14px 0 ${accentColor}40`,
  }

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Desktop & Mobile Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Logo/Business Name */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3.5 group">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-[15px] transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
                style={avatarStyle}
              >
                <span className="drop-shadow-md">{initial}</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-[15px] font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors leading-none mb-1">{business.name}</h1>
                <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground/60">Dashboard</p>
              </div>
            </Link>
          </div>

          {/* Center: Navigation (Desktop - Floating Pill Style) */}
          <nav className="hidden md:flex items-center gap-1 bg-secondary/40 rounded-full p-1 border border-white/5 shadow-sm">
            {navItems.map(item => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive
                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40'
                    }`}
                >
                  <item.icon size={15} className={isActive ? "text-primary/80" : ""} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: User Menu & Mobile Toggle */}
          <div className="flex items-center gap-1.5">
            {/* External link to public page */}
            <Link
              href={`/${business.slug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all border border-transparent hover:border-border/50"
            >
              <ExternalLink size={14} />
              <span className="opacity-80">Ver página</span>
            </Link>

            {/* Notification Center - hidden on mobile, use hamburger menu */}
            <div className="hidden sm:block">
              <NotificationCenter />
            </div>

            {/* User Avatar Dropdown - hidden on mobile, use hamburger menu instead */}
            <div className="relative hidden sm:block ml-2" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-1.5 p-1 pr-2 rounded-full transition-all border outline-none ${isUserMenuOpen ? 'bg-secondary/80 border-white/10 shadow-sm' : 'hover:bg-secondary/50 border-transparent'}`}
              >
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white transition-all shadow-sm"
                  style={avatarStyle}
                >
                  <span className="drop-shadow-sm">{initial}</span>
                </div>
                <ChevronDown size={14} className={`text-muted-foreground/70 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180 text-foreground' : ''}`} />
              </button>

              {/* Dropdown Menu (Premium Glassmorphism Card) */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 rounded-[1.5rem] border border-white/10 bg-card shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-2 animate-in fade-in zoom-in-95 slide-in-from-top-2 z-50 overflow-hidden origin-top-right">
                  {/* Glowing header section */}
                  <div className="relative px-4 py-5 rounded-2xl bg-secondary/30 mb-2 overflow-hidden flex flex-col items-center text-center">
                    {/* Background glow effect */}
                    <div 
                      className="absolute top-0 inset-x-0 h-24 opacity-20 dark:opacity-30 blur-2xl" 
                      style={{ backgroundColor: accentColor }} 
                    />
                    
                    <div 
                      className="relative h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white mb-3 shadow-md ring-4 ring-background"
                      style={avatarStyle}
                    >
                      <span className="drop-shadow-md">{initial}</span>
                    </div>
                    
                    <div className="relative z-10 w-full">
                      <p className="text-[17px] font-bold tracking-tight text-foreground mb-0.5 truncate">{business.name}</p>
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex w-fit mx-auto shadow-inner">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-1 space-y-1">
                    <Link
                      href={`/${business.slug}`}
                      target="_blank"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex sm:hidden items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground/80 hover:bg-secondary/60 hover:text-foreground transition-all group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-background border border-white/5 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ExternalLink size={14} className="text-foreground" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-foreground font-semibold tracking-tight">Ver página pública</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">reservar.app/{business.slug}</span>
                      </div>
                    </Link>
                    
                    <div className="h-px bg-border/40 my-1 mx-2 sm:hidden" />
                    
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all group"
                      >
                         <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <LogOut size={14} className="text-destructive" />
                        </div>
                        Cerrar sesión
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop (Darkened) */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel (Glassmorphism Offcanvas) */}
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-card border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-background/50">
              <div className="flex items-center gap-3">
                <div 
                  className="h-11 w-11 rounded-2xl text-white font-bold text-lg flex items-center justify-center shadow-lg"
                  style={avatarStyle}
                >
                  <span className="drop-shadow-md">{initial}</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">{business.name}</h2>
                  <p className="text-xs text-muted-foreground/80 font-medium">Dashboard</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-full hover:bg-secondary/50" aria-label="Cerrar menú">
                <X size={20} />
              </Button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 p-5 space-y-1 overflow-y-auto">
              {/* Notifications - mobile only, shown first */}
              <Link
                href="/dashboard/notifications"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-border/50 mb-3 shadow-sm bg-background/50"
              >
                <div className="bg-primary/10 text-primary p-1 rounded-md">
                  <Bell size={16} />
                </div>
                Notificaciones
              </Link>

              <div className="pt-2 space-y-1">
                {navItems.map(item => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-secondary text-foreground shadow-sm border border-border/50'
                        : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                        }`}
                    >
                      <item.icon size={18} className={isActive ? "text-primary/80" : "opacity-70"} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-5 border-t border-border/50 bg-background/50 space-y-3">
              <Link
                href={`/${business.slug}`}
                target="_blank"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-secondary/50 border border-border/50 hover:bg-secondary hover:text-foreground transition-all"
              >
                <ExternalLink size={16} />
                Ver página pública
              </Link>
              <form action="/api/auth/logout" method="POST" className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive/80 bg-destructive/5 hover:bg-destructive/10 hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
