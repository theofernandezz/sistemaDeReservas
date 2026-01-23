'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, CalendarRange, CalendarCheck, LogOut, Menu, X, Sparkles, CalendarDays, Settings } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

const navItems = [
  { id: 'services', label: 'Servicios', icon: LayoutGrid, href: '/admin/services' },
  { id: 'addons', label: 'Add-ons', icon: Sparkles, href: '/admin/addons' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, href: '/admin/calendar' },
  { id: 'appointments', label: 'Citas', icon: CalendarCheck, href: '/admin/appointments' },
  { id: 'availability', label: 'Disponibilidad', icon: CalendarRange, href: '/admin/availability' },
  { id: 'settings', label: 'Configuración', icon: Settings, href: '/admin/settings' },
]

function SidebarContent({ pathname, onClose }: { pathname: string, onClose?: () => void }) {
  return (
    <>
      <div className="p-6 border-b border-border flex justify-between items-center">
        <div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-primary">Siv Nails</h1>
          <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase mt-0.5">
            Admin Panel
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
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

      <div className="p-4 border-t border-border">
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-secondary/30 flex flex-col md:flex-row text-foreground font-sans">

      {/* Mobile Header */}
      <div className="md:hidden bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-sm shadow-sm">
            S
          </div>
          <span className="font-serif font-bold tracking-tight text-lg">Siv Nails</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-background border-r border-border flex-col h-screen sticky top-0">
        <SidebarContent pathname={pathname} />
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
            <SidebarContent pathname={pathname} onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto">
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </div>
      </main>
    </div>
  )
}
