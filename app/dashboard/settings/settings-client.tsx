'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { sections } from './settings-sections'
import type { SectionId, SettingsProps } from './settings-types'
import {
  AccountSection,
  AppearanceSection,
  ContactSection,
  IntegrationsSection,
  NotificationsSection,
  PaymentsSection,
  ProfileSection,
  ReservationsSection,
} from './sections'

export default function SettingsPage({
  isGoogleConnected,
  initialAdminEmail,
  isMPConnected,
  mpTokenValid,
  mpUserId,
  depositPercentage: initialDeposit,
  businessId,
  reservationSettings,
  businessName,
  business,
  businessSettings,
  paymentSettings
}: SettingsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<SectionId>(
    searchParams.get('mp_success') === 'true' || searchParams.get('mp_error')
      ? 'payments'
      : searchParams.get('success') === 'google_connected'
        ? 'integrations'
        : 'profile'
  )
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(true)
  const { success: showSuccess, error: showError } = useToast()

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle OAuth callbacks
  const successParam = searchParams.get('success')
  const errorParam = searchParams.get('error')
  const mpSuccess = searchParams.get('mp_success')
  const mpError = searchParams.get('mp_error')

  useEffect(() => {
    if (successParam === 'google_connected') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowMobileMenu(false)
      setTimeout(() => {
        showSuccess('Google Calendar conectado', 'Tu calendario ha sido vinculado correctamente')
        router.replace('/dashboard/settings')
      }, 0)
    }
    if (mpSuccess === 'true') {
      setShowMobileMenu(false)
      setTimeout(() => {
        showSuccess('Mercado Pago conectado', 'Ya podés recibir pagos de tus clientes')
        router.replace('/dashboard/settings')
      }, 0)
    }
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Autorización denegada',
        no_code: 'Error en la autorización',
        no_refresh_token: 'No se pudo obtener el token',
        db_error: 'Error guardando la conexión',
        token_exchange: 'Error al conectar con Google'
      }
      setTimeout(() => {
        showError('Error', errorMessages[errorParam] || 'Error desconocido')
        router.replace('/dashboard/settings')
      }, 0)
    }
    if (mpError) {
      const mpErrorMessages: Record<string, string> = {
        denied: 'Autorización denegada',
        invalid: 'Error en la autorización',
        invalid_state: 'Sesión expirada',
        config: 'Error de configuración',
        token: 'Error obteniendo acceso',
        save: 'Error guardando',
        no_business: 'No tenés un negocio configurado',
        exception: 'Error inesperado'
      }
      setTimeout(() => {
        showError('Error de Mercado Pago', mpErrorMessages[mpError] || mpError)
        router.replace('/dashboard/settings')
      }, 0)
    }
  }, [successParam, errorParam, mpSuccess, mpError, showSuccess, showError, router])

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection business={business} />
      case 'contact':
        return <ContactSection business={business} />
      case 'appearance':
        return <AppearanceSection businessSettings={businessSettings} />
      case 'reservations':
        return <ReservationsSection reservationSettings={reservationSettings} />
      case 'payments':
        return (
          <PaymentsSection
            isMPConnected={isMPConnected}
            mpTokenValid={mpTokenValid}
            mpUserId={mpUserId}
            depositPercentage={initialDeposit}
            businessId={businessId}
            paymentSettings={paymentSettings}
          />
        )
      case 'integrations':
        return <IntegrationsSection isGoogleConnected={isGoogleConnected} />
      case 'notifications':
        return <NotificationsSection initialEmail={initialAdminEmail} />
      case 'account':
        return <AccountSection businessName={businessName} />
      default:
        return null
    }
  }

  // Mobile: show section list or content
  if (isMobile) {
    return (
      <div className="p-4">
        {!showMobileMenu ? (
          <div>
            <button
              onClick={() => setShowMobileMenu(true)}
              className="flex items-center gap-2 text-primary mb-4 text-sm"
            >
              <ChevronRight size={16} className="rotate-180" />
              Volver a Configuración
            </button>
            <h1 className="text-xl font-bold mb-4">
              {sections.find(s => s.id === activeSection)?.label}
            </h1>
            {renderContent()}
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6">Configuración</h1>
            <div className="space-y-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id)
                    setShowMobileMenu(false)
                  }}
                  className="w-full flex items-center justify-between p-4 bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl hover:bg-secondary/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-secondary/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-inner border border-white/5">
                      {section.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground tracking-tight">{section.label}</div>
                      <div className="text-xs text-muted-foreground/80 mt-0.5">{section.description}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground/50 group-hover:text-primary transition-colors hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop: sidebar + content
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Configuración</h1>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1.5 sticky top-8">
            {sections.map(section => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                    isActive
                      ? 'bg-card/60 backdrop-blur-xl shadow-sm border border-white/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className={`transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground'}`}>
                    {section.icon}
                  </div>
                  <span className="text-sm tracking-tight">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          <div className="bg-card/20 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight mb-1.5 text-foreground">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            <p className="text-sm text-muted-foreground/80 mb-8 pb-6 border-b border-border/40">
              {sections.find(s => s.id === activeSection)?.description}
            </p>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}


