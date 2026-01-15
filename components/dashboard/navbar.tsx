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
  ChevronDown
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Business } from '@/types/database.types'

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home, href: '/dashboard' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendar' },
  { id: 'services', label: 'Servicios', icon: LayoutGrid, href: '/dashboard/services' },
  { id: 'availability', label: 'Disponibilidad', icon: Clock, href: '/dashboard/availability' },
  { id: 'settings', label: 'Configuración', icon: Settings, href: '/dashboard/settings' },
]

interface DashboardNavbarProps {
  business: Business & { isViewing?: boolean }
  allBusinesses?: Business[] | null
  isSuperAdmin?: boolean
}

export function DashboardNavbar({ business, allBusinesses, isSuperAdmin }: DashboardNavbarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const initial = business.name.charAt(0).toUpperCase()

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
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Logo/Business Name */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
                {initial}
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold text-foreground">{business.name}</h1>
                <p className="text-xs text-muted-foreground">/{business.slug}</p>
              </div>
            </Link>
          </div>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: User Menu & Mobile Toggle */}
          <div className="flex items-center gap-2">
            {/* External link to public page */}
            <Link
              href={`/${business.slug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ExternalLink size={14} />
              Ver página
            </Link>

            {/* User Avatar Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {initial}
                </div>
                <ChevronDown size={14} className={`hidden sm:block text-muted-foreground transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-background shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{business.name}</p>
                    <p className="text-xs text-muted-foreground">/{business.slug}</p>
                  </div>
                  <Link
                    href={`/${business.slug}`}
                    target="_blank"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="sm:hidden flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={14} />
                    Ver página pública
                  </Link>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut size={14} />
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-background shadow-xl animate-in slide-in-from-right duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm flex items-center justify-center">
                  {initial}
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{business.name}</h2>
                  <p className="text-xs text-muted-foreground">/{business.slug}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X size={20} />
              </Button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-2">
              <Link
                href={`/${business.slug}`}
                target="_blank"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <ExternalLink size={18} />
                Ver página pública
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={18} />
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
