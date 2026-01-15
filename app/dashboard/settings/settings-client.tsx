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
  AtSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { disconnectGoogleCalendar, disconnectMercadoPago, updateBusiness, updateBusinessSettings } from '@/app/actions'
import { updateBusinessPaymentConfig } from '@/app/actions/payments'
import { sendPasswordResetEmail } from '@/app/actions/auth'

// Types
interface SettingsProps {
  isGoogleConnected: boolean
  initialAdminEmail: string
  isMPConnected: boolean
  mpUserId?: string
  depositPercentage: number
  businessId?: string
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
}

type SectionId = 'profile' | 'contact' | 'reservations' | 'payments' | 'integrations' | 'notifications' | 'account'

interface Section {
  id: SectionId
  label: string
  icon: React.ReactNode
  description: string
}

const sections: Section[] = [
  { id: 'profile', label: 'Perfil', icon: <Building2 size={18} />, description: 'Nombre, logo y descripción' },
  { id: 'contact', label: 'Contacto', icon: <Phone size={18} />, description: 'Teléfono, email y redes' },
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
  mpUserId,
  depositPercentage: initialDeposit,
  businessId,
  business
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('profile')
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
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
      setTimeout(() => {
        showSuccess('Google Calendar conectado', 'Tu calendario ha sido vinculado correctamente')
        router.replace('/dashboard/settings')
      }, 0)
    }
    if (mpSuccess === 'true') {
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
      case 'reservations':
        return <ReservationsSection business={business} />
      case 'payments':
        return (
          <PaymentsSection
            isMPConnected={isMPConnected}
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
        return <AccountSection />
      default:
        return null
    }
  }

  // Mobile: show section list or content
  if (isMobile) {
    return (
      <div className="p-4">
        {activeSection ? (
          <div>
            <button
              onClick={() => setActiveSection('profile')}
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
            <h1 className="text-2xl font-bold mb-6">Configuración</h1>
            <div className="space-y-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{section.icon}</div>
                    <div className="text-left">
                      <div className="font-medium">{section.label}</div>
                      <div className="text-xs text-muted-foreground">{section.description}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
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
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1 sticky top-6">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeSection === section.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
              >
                {section.icon}
                <span className="text-sm">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
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
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Nombre del negocio</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Mi Negocio"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">URL pública (slug)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">reservar.app/</span>
          <Input
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))}
            placeholder="mi-negocio"
            className="flex-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Descripción</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Contá brevemente de qué se trata tu negocio..."
          rows={3}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
        />
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={saving}>
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
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Teléfono / WhatsApp</label>
        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 11 1234-5678"
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Email del negocio</label>
        <div className="relative">
          <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contacto@minegocio.com"
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Instagram</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            placeholder="mi_negocio"
            className="pl-7"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Dirección (opcional)</label>
        <div className="relative">
          <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Av. Corrientes 1234, CABA"
            className="pl-9"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function ReservationsSection({ business }: { business?: SettingsProps['business'] }) {
  // These settings would come from business.settings but for now use defaults
  const [minAdvance, setMinAdvance] = useState('2')
  const [cancelHours, setCancelHours] = useState('24')
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateBusinessSettings({
        minAdvanceHours: parseInt(minAdvance) || 2,
        cancellationHours: parseInt(cancelHours) || 24
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
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Anticipación mínima</label>
        <p className="text-xs text-muted-foreground mb-2">
          Cuántas horas antes del turno se puede reservar
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              value={minAdvance}
              onChange={e => setMinAdvance(e.target.value)}
              className="pl-9 w-24"
              min="0"
            />
          </div>
          <span className="text-sm text-muted-foreground">horas</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Cancelación permitida hasta</label>
        <p className="text-xs text-muted-foreground mb-2">
          Hasta cuántas horas antes se puede cancelar sin penalidad
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              value={cancelHours}
              onChange={e => setCancelHours(e.target.value)}
              className="pl-9 w-24"
              min="0"
            />
          </div>
          <span className="text-sm text-muted-foreground">horas antes</span>
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function PaymentsSection({
  isMPConnected,
  mpUserId,
  depositPercentage,
  businessId
}: {
  isMPConnected: boolean
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
    <div className="space-y-6">
      {/* MercadoPago Connection */}
      <div className="flex items-start gap-4 pb-6 border-b border-border">
        <img
          src="/integrations/mercadopago.png"
          alt="Mercado Pago"
          className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
        />
        <div className="flex-1">
          <h3 className="font-medium">Mercado Pago</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recibí pagos directamente en tu cuenta
          </p>
          <div className="mt-3 flex items-center gap-3">
            {isMPConnected ? (
              <>
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                  <Check className="w-4 h-4" />
                  Conectado {mpUserId && <span className="text-xs opacity-75">({mpUserId})</span>}
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnectMP} disabled={disconnecting}>
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  <span className="ml-1">Desconectar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectMP}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Vincular Mercado Pago
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Percentage */}
      {isMPConnected && businessId && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Porcentaje de seña</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Este porcentaje del total se cobra al momento de reservar
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="10"
              max="100"
              step="5"
              value={depositPercent}
              onChange={(e) => setDepositPercent(Number(e.target.value))}
              className="w-20 text-center"
            />
            <span className="text-muted-foreground">%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDeposit}
              disabled={savingDeposit || depositPercent === depositPercentage}
            >
              {savingDeposit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ej: Servicio de $10,000 → Seña de ${Math.round(10000 * depositPercent / 100).toLocaleString()}
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
    <div className="space-y-6">
      {/* Google Calendar */}
      <div className="flex items-start gap-4">
        <img
          src="/integrations/google-calendar.svg"
          alt="Google Calendar"
          className="w-10 h-10 rounded-lg flex-shrink-0"
        />
        <div className="flex-1">
          <h3 className="font-medium">Google Calendar</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sincronizá citas automáticamente con tu calendario
          </p>
          <div className="mt-3 flex items-center gap-3">
            {isGoogleConnected ? (
              <>
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                  <Check className="w-4 h-4" />
                  Conectado
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  <span className="ml-1">Desconectar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Future integrations placeholder */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Próximamente: WhatsApp Business, Outlook, y más...
        </p>
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
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Email para notificaciones</label>
        <p className="text-xs text-muted-foreground mb-2">
          Acá recibirás avisos de nuevas reservas y cancelaciones
        </p>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="pl-9"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h4 className="font-medium mb-2">Recordatorios automáticos</h4>
        <p className="text-sm text-muted-foreground">
          Próximamente: Configurá recordatorios por WhatsApp o email para tus clientes
        </p>
      </div>
    </div>
  )
}

function AccountSection() {
  const [sendingReset, setSendingReset] = useState(false)
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

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-2">Cambiar contraseña</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Te enviaremos un email para restablecer tu contraseña
        </p>
        <Button variant="outline" onClick={handleSendResetEmail} disabled={sendingReset}>
          {sendingReset && <Loader2 size={16} className="animate-spin mr-2" />}
          Enviar email de recuperación
        </Button>
      </div>

      <div className="pt-4 border-t border-border">
        <h4 className="font-medium text-destructive mb-2">Zona de peligro</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Eliminar tu cuenta borrará todos tus datos permanentemente
        </p>
        <Button
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={() => showError('Función no disponible', 'Contactanos para eliminar tu cuenta')}
        >
          Eliminar cuenta
        </Button>
      </div>
    </div>
  )
}
