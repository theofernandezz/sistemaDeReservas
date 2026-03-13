'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  Phone,
  CalendarClock,
  CreditCard,
  Plug2,
  Bell,
  User,
  ChevronRight,
  Check,
  X,
  Loader2,
  ExternalLink,
  Mail,
  Percent,
  Calendar,
  Clock,
  Globe,
  AtSign,
  Palette,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { disconnectGoogleCalendar, disconnectMercadoPago, updateBusiness, updateBusinessSettings } from '@/app/actions'
import { updateBusinessPaymentConfig } from '@/app/actions/payments'
import { requestAccountDeletion, sendPasswordResetEmail } from '@/app/actions/auth'

// Types
interface SettingsProps {
  isGoogleConnected: boolean
  initialAdminEmail: string
  isMPConnected: boolean
  mpTokenValid?: boolean
  mpUserId?: string
  depositPercentage: number
  businessId?: string
  reservationSettings?: {
    minAdvanceHours?: number
    cancellationHours?: number
  }
  businessName?: string
  business?: {
    id: string
    name: string
    slug: string
    description?: string
    phone?: string
    email?: string
    instagram?: string
    address?: string
  }
  businessSettings?: {
    primaryColor?: string
    accentColor?: string
  }
}

type SectionId = 'profile' | 'contact' | 'appearance' | 'reservations' | 'payments' | 'integrations' | 'notifications' | 'account'

interface Section {
  id: SectionId
  label: string
  icon: React.ReactNode
  description: string
}

const sections: Section[] = [
  { id: 'profile', label: 'Perfil', icon: <Building2 size={18} />, description: 'Nombre, logo y descripción' },
  { id: 'contact', label: 'Contacto', icon: <Phone size={18} />, description: 'Teléfono, email y redes' },
  { id: 'appearance', label: 'Apariencia', icon: <Palette size={18} />, description: 'Color de tu marca' },
  { id: 'reservations', label: 'Reservas', icon: <CalendarClock size={18} />, description: 'Anticipación y cancelaciones' },
  { id: 'payments', label: 'Pagos', icon: <CreditCard size={18} />, description: 'MercadoPago y señas' },
  { id: 'integrations', label: 'Integraciones', icon: <Plug2 size={18} />, description: 'Google Calendar' },
  { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} />, description: 'Emails y recordatorios' },
  { id: 'account', label: 'Cuenta', icon: <User size={18} />, description: 'Contraseña y acceso' },
]

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
  businessSettings
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

// ============ SECTIONS ============

function ProfileSection({ business }: { business?: SettingsProps['business'] }) {
  const [name, setName] = useState(business?.name || '')
  const [slug, setSlug] = useState(business?.slug || '')
  const [description, setDescription] = useState(business?.description || '')
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Error', 'El nombre es obligatorio')
      return
    }
    if (!slug.trim()) {
      showError('Error', 'La URL es obligatoria')
      return
    }
    setSaving(true)
    try {
      const result = await updateBusiness({ name, slug, description: description || null })
      if (result.success) {
        showSuccess('Guardado', 'Perfil actualizado correctamente')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch {
      showError('Error', 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Nombre del negocio</label>
        <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mi Negocio"
            className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">URL pública (slug)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground/60">reservar.app/</span>
          <div className="flex-1 bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))}
              placeholder="mi-negocio"
              className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Descripción</label>
        <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Contá brevemente de qué se trata tu negocio..."
            rows={3}
            className="w-full px-3 py-2 border-0 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function ContactSection({ business }: { business?: SettingsProps['business'] }) {
  const [phone, setPhone] = useState(business?.phone || '')
  const [email, setEmail] = useState(business?.email || '')
  const [instagram, setInstagram] = useState(business?.instagram || '')
  const [address, setAddress] = useState(business?.address || '')
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateBusiness({
        phone: phone || null,
        email: email || null,
        instagram: instagram || null,
        address: address || null
      })
      if (result.success) {
        showSuccess('Guardado', 'Información de contacto actualizada')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch {
      showError('Error', 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Teléfono / WhatsApp</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 11 1234-5678"
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Email del negocio</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contacto@minegocio.com"
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Instagram</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm font-bold">@</span>
          <Input
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            placeholder="mi_negocio"
            className="pl-8 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Dirección (opcional)</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Av. Corrientes 1234, CABA"
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

// Colores predefinidos para elegir
const PRESET_COLORS = [
  { name: 'Naranja', value: '#f97316' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Amarillo', value: '#eab308' },
  { name: 'Negro', value: '#000000' },
]

function AppearanceSection({ businessSettings }: { businessSettings?: SettingsProps['businessSettings'] }) {
  const [accentColor, setAccentColor] = useState(businessSettings?.accentColor || '#f97316')
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateBusinessSettings({
        accentColor
      })
      if (result.success) {
        showSuccess('Guardado', 'Color actualizado correctamente')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch {
      showError('Error', 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Color de acento */}
      <div>
        <label className="text-sm font-semibold tracking-tight mb-1.5 block text-foreground">Color de tu marca</label>
        <p className="text-sm text-muted-foreground/80 mb-5">
          Se usa en botones, precios y elementos destacados de tu página de reservas
        </p>

        {/* Colores preset */}
        <div className="flex flex-wrap gap-2.5 mb-5 p-3 bg-card/40 backdrop-blur-xl border border-white/5 shadow-sm rounded-[1rem] inline-flex">
          {PRESET_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => setAccentColor(color.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${accentColor === color.value
                  ? 'border-foreground scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.2)] z-10'
                  : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100 hover:shadow-md'
                }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        {/* Color picker custom */}
        <div className="flex items-center gap-3">
          <div className="relative overflow-hidden rounded-xl h-11 w-12 border border-border shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all shrink-0">
            <input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
            />
          </div>
          <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Input
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              placeholder="#f97316"
              className="w-28 font-mono text-[15px] font-medium border-0 bg-transparent focus-visible:ring-0 shadow-none uppercase"
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground/60 tracking-tight">o elegí un color personalizado</span>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-6 mt-2 border-t border-border/40">
        <label className="text-sm font-semibold tracking-tight mb-3 block text-foreground">Vista previa</label>
        <div className="p-5 rounded-2xl border border-white/5 shadow-inner bg-card/30 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 bg-card/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-sm transition-transform hover:-translate-y-0.5 duration-300">
            <div>
              <p className="font-semibold tracking-tight text-[15px] text-foreground">Corte de cabello</p>
              <p className="text-xs font-medium text-muted-foreground/80 mt-0.5">30 min</p>
            </div>
            <div className="flex items-center gap-3.5">
              <span
                className="font-bold tracking-tight text-lg drop-shadow-sm"
                style={{ color: accentColor }}
              >
                $25
              </span>
              <button
                className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-md shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                Reservar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function ReservationsSection({
  reservationSettings
}: {
  reservationSettings?: SettingsProps['reservationSettings']
}) {
  const initialMinAdvance = reservationSettings?.minAdvanceHours ?? 2
  const initialCancelHours = reservationSettings?.cancellationHours ?? 24

  const [minAdvance, setMinAdvance] = useState(String(initialMinAdvance))
  const [cancelHours, setCancelHours] = useState(String(initialCancelHours))
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  useEffect(() => {
    setMinAdvance(String(initialMinAdvance))
    setCancelHours(String(initialCancelHours))
  }, [initialMinAdvance, initialCancelHours])

  const handleSave = async () => {
    const minAdvanceValue = Number(minAdvance)
    const cancelHoursValue = Number(cancelHours)

    if (Number.isNaN(minAdvanceValue) || Number.isNaN(cancelHoursValue)) {
      showError('Error', 'Ingresá valores válidos')
      return
    }

    setSaving(true)
    try {
      const result = await updateBusinessSettings({
        minAdvanceHours: Math.max(0, minAdvanceValue),
        cancellationHours: Math.max(0, cancelHoursValue)
      })
      if (result.success) {
        showSuccess('Guardado', 'Configuración de reservas actualizada')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch {
      showError('Error', 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Anticipación mínima</label>
        <p className="text-sm text-muted-foreground/80 mb-3">
          Cuántas horas antes del turno se puede reservar
        </p>
        <div className="flex items-center gap-3">
          <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              type="number"
              value={minAdvance}
              onChange={e => setMinAdvance(e.target.value)}
              className="pl-10 w-28 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
              min="0"
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground/60 tracking-tight">horas</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Cancelación permitida hasta</label>
        <p className="text-sm text-muted-foreground/80 mb-3">
          Hasta cuántas horas antes se puede cancelar sin penalidad
        </p>
        <div className="flex items-center gap-3">
          <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              type="number"
              value={cancelHours}
              onChange={e => setCancelHours(e.target.value)}
              className="pl-10 w-28 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
              min="0"
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground/60 tracking-tight">horas antes</span>
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function PaymentsSection({
  isMPConnected,
  mpTokenValid,
  mpUserId,
  depositPercentage,
  businessId
}: {
  isMPConnected: boolean
  mpTokenValid?: boolean
  mpUserId?: string
  depositPercentage: number
  businessId?: string
}) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [depositPercent, setDepositPercent] = useState(depositPercentage)
  const [savingDeposit, setSavingDeposit] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleConnectMP = () => {
    window.location.href = '/api/mercadopago/connect'
  }

  const handleDisconnectMP = async () => {
    setDisconnecting(true)
    try {
      const result = await disconnectMercadoPago()
      if (result.success) {
        showSuccess('Desconectado', 'Mercado Pago ha sido desvinculado')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo desconectar')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSaveDeposit = async () => {
    if (!businessId) return
    setSavingDeposit(true)
    const result = await updateBusinessPaymentConfig(businessId, depositPercent)
    if (result.success) {
      showSuccess('Guardado', 'Porcentaje de seña actualizado')
    } else {
      showError('Error', result.error || 'No se pudo guardar')
    }
    setSavingDeposit(false)
  }

  return (
    <div className="space-y-8">
      {/* MercadoPago Connection */}
      <div className="flex items-start gap-5 pb-8 border-b border-border/40">
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-2.5 shadow-sm">
          <img
            src="/integrations/mercadopago.png"
            alt="Mercado Pago"
            className="w-12 h-12 rounded-xl object-contain drop-shadow-sm"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">Mercado Pago</h3>
          <p className="text-sm font-medium text-muted-foreground/80 mt-1">
            Recibí pagos directamente en tu cuenta
          </p>
          {isMPConnected && mpTokenValid === false && (
            <div className="mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                La conexión con Mercado Pago expiró o fue revocada. Reconectá tu cuenta para seguir recibiendo pagos.
              </p>
            </div>
          )}
          <div className="mt-5 flex items-center gap-3">
            {isMPConnected ? (
              <>
                {mpTokenValid === false ? (
                  <Button size="sm" onClick={handleConnectMP} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm hover:-translate-y-0.5 transition-all">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Reconectar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl shadow-inner">
                    <Check className="w-4 h-4" />
                    Conectado {mpUserId && <span className="opacity-60 font-semibold tracking-tight">({mpUserId})</span>}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleDisconnectMP} disabled={disconnecting} className="rounded-xl border border-white/5 hover:bg-secondary/40 shadow-sm transition-all hover:text-destructive">
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
                  <span>Desconectar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectMP} className="rounded-xl px-5 hover:-translate-y-0.5 shadow transition-all duration-300">
                <ExternalLink className="w-4 h-4 mr-2" />
                Vincular Mercado Pago
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Percentage */}
      {isMPConnected && businessId && (
        <div className="bg-card/20 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <Percent className="w-4 h-4 text-primary" />
            <span className="font-semibold tracking-tight text-[15px] text-foreground">Porcentaje de seña</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground/80 mb-5">
            Este porcentaje del total se cobra al momento de reservar
          </p>
          <div className="flex items-center gap-3">
            <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all flex items-center">
              <Input
                type="number"
                min="10"
                max="100"
                step="5"
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-20 text-center border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-semibold"
              />
              <span className="text-muted-foreground/60 font-semibold pr-3">%</span>
            </div>
            
            <Button
              variant="outline"
              onClick={handleSaveDeposit}
              disabled={savingDeposit || depositPercent === depositPercentage}
              className="rounded-xl border border-white/5 bg-secondary/20 hover:bg-secondary hover:shadow-sm transition-all"
            >
              {savingDeposit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar porcentaje'}
            </Button>
          </div>
          <p className="text-[13px] font-medium text-muted-foreground/60 mt-4 bg-background/30 p-3 rounded-xl border border-white/5 inline-block">
            <span className="text-foreground/80">Ejemplo:</span> Servicio de $10,000 → Se cobrará una seña de <strong className="text-primary">${Math.round(10000 * depositPercent / 100).toLocaleString()}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

function IntegrationsSection({ isGoogleConnected }: { isGoogleConnected: boolean }) {
  const [disconnecting, setDisconnecting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleConnect = () => {
    window.location.href = '/api/auth/google'
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const result = await disconnectGoogleCalendar()
      if (result.success) {
        showSuccess('Desconectado', 'Google Calendar ha sido desvinculado')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo desconectar')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Google Calendar */}
      <div className="flex items-start gap-5">
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-2.5 shadow-sm bg-white dark:bg-card/40">
          <img
            src="/integrations/google-calendar.svg"
            alt="Google Calendar"
            className="w-12 h-12 rounded-xl object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">Google Calendar</h3>
          <p className="text-sm font-medium text-muted-foreground/80 mt-1">
            Sincronizá citas automáticamente con tu calendario personal o de trabajo
          </p>
          <div className="mt-5 flex items-center gap-3">
            {isGoogleConnected ? (
              <>
                <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl shadow-inner">
                  <Check className="w-4 h-4" />
                  Conectado
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="rounded-xl border border-white/5 hover:bg-secondary/40 shadow-sm transition-all hover:text-destructive">
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
                  <span>Desconectar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} className="rounded-xl px-5 hover:-translate-y-0.5 shadow transition-all duration-300">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar con Google
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Future integrations placeholder */}
      <div className="pt-6 border-t border-border/40">
        <div className="bg-secondary/20 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold tracking-tight text-[15px]">Próximamente</h4>
            <p className="text-sm font-medium text-muted-foreground/80 mt-1">
              Integraciones con WhatsApp Business, Microsoft Outlook y Zoom.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationsSection({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  const handleSave = async () => {
    if (!email || !email.includes('@')) {
      showError('Error', 'Ingresá un email válido')
      return
    }
    setSaving(true)
    try {
      const { updateAdminNotificationEmail } = await import('@/app/actions')
      const result = await updateAdminNotificationEmail(email)
      if (result.success) {
        showSuccess('Guardado', 'Email de notificaciones actualizado')
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Email para notificaciones administrativas</label>
        <p className="text-sm font-medium text-muted-foreground/80 mb-4">
          Acá vas a recibir avisos inmediatos cuando un cliente reserve o cancele un turno
        </p>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
            />
          </div>
        </div>
        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            Guardar email
          </Button>
        </div>
      </div>

      <div className="pt-6 border-t border-border/40">
        <div className="bg-secondary/20 border border-white/5 rounded-2xl p-5">
          <h4 className="font-semibold tracking-tight text-[15px] mb-1">Recordatorios automáticos a clientes</h4>
          <p className="text-sm font-medium text-muted-foreground/80">
            Esta función te permitirá configurar recordatorios automáticos por WhatsApp y Email para reducir el ausentismo corporativo. (Próximamente)
          </p>
        </div>
      </div>
    </div>
  )
}

function AccountSection({ businessName }: { businessName?: string }) {
  const [sendingReset, setSendingReset] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [requestingDelete, setRequestingDelete] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  const handleSendResetEmail = async () => {
    setSendingReset(true)
    try {
      const result = await sendPasswordResetEmail()
      if (result.success) {
        showSuccess('Email enviado', 'Revisá tu casilla de correo para restablecer tu contraseña')
      } else {
        showError('Error', result.error || 'No se pudo enviar el email')
      }
    } catch {
      showError('Error', 'No se pudo enviar el email')
    } finally {
      setSendingReset(false)
    }
  }

  const expectedName = businessName?.trim() || ''
  const isConfirmMatch =
    expectedName.length > 0 && confirmName.trim().toLowerCase() === expectedName.toLowerCase()

  const handleRequestDeletion = async () => {
    if (!isConfirmMatch) {
      showError('Error', 'El nombre no coincide')
      return
    }

    setRequestingDelete(true)
    try {
      const result = await requestAccountDeletion({ confirmationName: confirmName })
      if (result.success) {
        showSuccess('Solicitud enviada', 'Vamos a contactarte para continuar el proceso')
        setShowDeleteDialog(false)
        setConfirmName('')
      } else {
        showError('Error', result.error || 'No se pudo enviar la solicitud')
      }
    } catch {
      showError('Error', 'No se pudo enviar la solicitud')
    } finally {
      setRequestingDelete(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h4 className="font-semibold tracking-tight text-[15px] text-foreground mb-2">Seguridad y acceso</h4>
        <p className="text-sm font-medium text-muted-foreground/80 mb-5">
          Te enviaremos un email seguro para que puedas establecer una nueva contraseña de administrador
        </p>
        <Button variant="outline" onClick={handleSendResetEmail} disabled={sendingReset} className="rounded-xl border border-white/5 hover:bg-secondary/40 shadow-sm transition-all focus-visible:ring-primary/40">
          {sendingReset ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2 text-muted-foreground" />}
          Enviar email de recuperación
        </Button>
      </div>

      <div className="pt-6 border-t border-border/40">
        <h4 className="font-semibold tracking-tight text-[15px] text-destructive mb-2 flex items-center gap-2">
          <AlertTriangle size={16} /> Zona de peligro
        </h4>
        <p className="text-sm font-medium text-muted-foreground/80 mb-6">
          Eliminar tu cuenta borrará todos tus datos visuales, clientes y reservas de manera permanente e irreversible.
        </p>
        
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5">
          <Button
            variant="destructive"
            className="rounded-xl px-6 font-semibold shadow-sm hover:bg-destructive/90 w-full sm:w-auto"
            onClick={() => setShowDeleteDialog(true)}
            disabled={!expectedName}
          >
            Eliminar cuenta permanentemente
          </Button>
          {!expectedName && (
            <p className="text-xs font-semibold text-destructive mt-3 opacity-80">
              Debes completar el perfil básico de tu negocio (Nombre) para poder realizar esta acción administrativa.
            </p>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Para continuar, escribí el nombre del negocio tal como aparece.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Nombre esperado: <span className="font-medium text-foreground">{expectedName || '-'}</span>
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Escribí el nombre del negocio"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={requestingDelete}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={!isConfirmMatch || requestingDelete}
            >
              {requestingDelete && <Loader2 size={16} className="animate-spin mr-2" />}
              Solicitar eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
