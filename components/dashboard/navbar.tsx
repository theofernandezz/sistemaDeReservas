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
  Bell,
  ListChecks
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/dashboard/notification-center'
import { Business } from '@/types/database.types'

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home, href: '/dashboard' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendar' },
  { id: 'appointments', label: 'Turnos', icon: ListChecks, href: '/dashboard/appointments' },
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
      <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background">
        <div className="flex h-16 md:h-20 items-center justify-between px-4 md:px-8">
          {/* Left: Logo/Business Name */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3.5 group">
              <div
                className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl text-white font-bold text-[15px] md:text-base transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
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
          <nav className="hidden md:flex items-center gap-1 bg-secondary/40 rounded-full p-1.5 border border-border/40 shadow-sm">
            {navItems.map(item => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all border border-transparent hover:border-border/50"
            >
              <ExternalLink size={14} />
              <span className="opacity-80">Ver página</span>
            </Link>

            {/* Notification Center + User grouped */}
            <div className="hidden sm:flex items-center gap-0.5 bg-secondary/30 rounded-full p-1 border border-border/30">
              {/* Notification Center - hidden on mobile, use hamburger menu */}
              <NotificationCenter />

              {/* Divider */}
              <div className="w-px h-6 bg-border/50 mx-0.5" />

              {/* User Avatar Dropdown - hidden on mobile, use hamburger menu instead */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-1.5 p-1 pr-2 rounded-full transition-all border outline-none ${isUserMenuOpen ? 'bg-secondary/80 border-border/40 shadow-sm' : 'hover:bg-secondary/50 border-transparent'}`}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white transition-all shadow-sm"
                    style={avatarStyle}
                  >
                    <span className="drop-shadow-sm">{initial}</span>
                  </div>
                  <ChevronDown size={14} className={`text-muted-foreground/70 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180 text-foreground' : ''}`} />
                </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-1.5 animate-in fade-in zoom-in-95 slide-in-from-top-2 z-50 origin-top-right">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={avatarStyle}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{business.name}</p>
                      <p className="text-xs text-muted-foreground truncate">Dashboard</p>
                    </div>
                  </div>

                  <div className="h-px bg-border my-1" />

                  {/* Actions */}
                  <div className="space-y-0.5">
                    <form action="/api/auth/logout" method="POST" className="w-full">
                      <button
                        type="submit"
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut size={15} />
                        Cerrar sesión
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
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
