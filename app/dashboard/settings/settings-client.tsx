'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Check, X, Loader2, ExternalLink, Mail, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { disconnectGoogleCalendar, disconnectMercadoPago } from '@/app/actions'

interface SettingsClientProps {
  isGoogleConnected: boolean
  initialAdminEmail: string
  isMPConnected: boolean
  mpUserId?: string
}

export default function SettingsClient({
  isGoogleConnected,
  initialAdminEmail,
  isMPConnected,
  mpUserId
}: SettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success: showSuccess, error: showError } = useToast()
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectingMP, setDisconnectingMP] = useState(false)

  // Check for success/error from OAuth callback
  const successParam = searchParams.get('success')
  const errorParam = searchParams.get('error')
  const mpSuccess = searchParams.get('mp_success')
  const mpError = searchParams.get('mp_error')

  // Effect to handle success/error params
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
        no_refresh_token: 'No se pudo obtener el token. Intentá de nuevo.',
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
        invalid_state: 'Sesión expirada. Intentá de nuevo.',
        config: 'Error de configuración',
        token: 'Error obteniendo acceso',
        save: 'Error guardando la conexión',
        no_business: 'No tenés un negocio configurado',
        exception: 'Error inesperado'
      }
      setTimeout(() => {
        showError('Error de Mercado Pago', mpErrorMessages[mpError] || 'Error desconocido')
        router.replace('/dashboard/settings')
      }, 0)
    }
  }, [successParam, errorParam, mpSuccess, mpError, showSuccess, showError, router])

  const handleConnect = () => {
    window.location.href = '/api/auth/google'
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const result = await disconnectGoogleCalendar()
      if (result.success) {
        showSuccess('Google Calendar desconectado', 'Se ha eliminado la vinculación')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo desconectar')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  const handleConnectMP = () => {
    window.location.href = '/api/mercadopago/connect'
  }

  const handleDisconnectMP = async () => {
    setDisconnectingMP(true)
    try {
      const result = await disconnectMercadoPago()
      if (result.success) {
        showSuccess('Mercado Pago desconectado', 'Se ha eliminado la vinculación')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo desconectar')
      }
    } finally {
      setDisconnectingMP(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mercado Pago Integration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-sky-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-lg">Mercado Pago</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Conectá tu cuenta de Mercado Pago para recibir pagos de tus clientes directamente en tu billetera.
            </p>

            <div className="mt-4 flex items-center gap-3">
              {isMPConnected ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    <Check className="w-4 h-4" />
                    Conectado {mpUserId && <span className="text-xs text-green-500">({mpUserId})</span>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectMP}
                    disabled={disconnectingMP}
                  >
                    {disconnectingMP ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <X className="w-4 h-4 mr-1" />
                    )}
                    Desconectar
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
      </div>

      {/* Google Calendar Integration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-lg">Google Calendar</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sincronizá automáticamente las citas con tu Google Calendar.
              Cuando alguien reserve, el turno aparece directamente en tu calendario.
            </p>

            <div className="mt-4 flex items-center gap-3">
              {isGoogleConnected ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    <Check className="w-4 h-4" />
                    Conectado
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <X className="w-4 h-4 mr-1" />
                    )}
                    Desconectar
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
      </div>

      {/* Admin Email Configuration */}
      <AdminEmailSection initialEmail={initialAdminEmail} />
    </div>
  )
}

function AdminEmailSection({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  // Update local state if initial prop changes
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
      // Import dynamically to avoid server component issues if any
      const { updateAdminNotificationEmail } = await import('@/app/actions')
      const result = await updateAdminNotificationEmail(email)

      if (result.success) {
        showSuccess('Guardado', 'Email de notificaciones actualizado')
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch (e) {
      showError('Error', 'Ocurrió un error inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-pink-600" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-lg">Email de Notificaciones</h3>
          <p className="text-sm text-muted-foreground mt-1">
            A esta dirección llegarán los avisos de nuevas reservas y cancelaciones.
          </p>

          <div className="mt-4 flex items-center gap-3 max-w-md">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="bg-background"
            />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

