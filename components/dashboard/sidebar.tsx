'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, CalendarRange, CalendarCheck, LogOut, Menu, X, Sparkles, CalendarDays, Settings } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Business } from '@/types/database.types'
import { BusinessSelector } from './business-selector'

const navItems = [
  { id: 'services', label: 'Servicios', icon: LayoutGrid, href: '/dashboard/services' },
  { id: 'addons', label: 'Add-ons', icon: Sparkles, href: '/dashboard/addons' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendar' },
  { id: 'appointments', label: 'Citas', icon: CalendarCheck, href: '/dashboard/appointments' },
  { id: 'availability', label: 'Disponibilidad', icon: CalendarRange, href: '/dashboard/availability' },
  { id: 'settings', label: 'Configuración', icon: Settings, href: '/dashboard/settings' },
]

interface DashboardSidebarProps {
  business: Business & { isViewing?: boolean }
  allBusinesses?: Business[] | null
  isSuperAdmin?: boolean
}

function SidebarContent({
  pathname,
  business,
  allBusinesses,
  isSuperAdmin,
  onClose
}: {
  pathname: string
  business: Business & { isViewing?: boolean }
  allBusinesses?: Business[] | null
  isSuperAdmin?: boolean
  onClose?: () => void
}) {
  // Get first letter for avatar
  const initial = business.name.charAt(0).toUpperCase()

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-start mb-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground ml-auto"
              onClick={onClose}
            >
              <X size={20} />
            </Button>
          )}
        </div>

        {/* Show business selector for super admins, regular header for others */}
        {isSuperAdmin && allBusinesses && allBusinesses.length > 0 ? (
          <BusinessSelector
            businesses={allBusinesses}
            currentBusiness={business}
          />
        ) : (
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">{business.name}</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide mt-0.5">
              /{business.slug}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === item.href
              ? 'bg-secondary text-primary'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-primary'
              }`}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {/* Link to public booking page */}
        <Link
          href={`/${business.slug}`}
          target="_blank"
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary/50 hover:text-primary transition-colors"
        >
          Ver página pública →
        </Link>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </>
  )
}

export function DashboardSidebar({ business, allBusinesses, isSuperAdmin }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const initial = business.name.charAt(0).toUpperCase()

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
            {initial}
          </div>
          <span className="font-bold tracking-tight text-lg">{business.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-background border-r border-border flex-col h-screen sticky top-0">
        <SidebarContent pathname={pathname} business={business} allBusinesses={allBusinesses} isSuperAdmin={isSuperAdmin} />
      </div>

      {/* Mobile Sidebar Overlay & Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar Panel */}
          <div className="relative w-4/5 max-w-xs bg-background h-full shadow-xl animate-in slide-in-from-left duration-200 flex flex-col">
            <SidebarContent
              pathname={pathname}
              business={business}
              allBusinesses={allBusinesses}
              isSuperAdmin={isSuperAdmin}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
