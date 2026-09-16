import { useEffect, useState } from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// TODO: dominio fijo — hoy todos los negocios mandan mail desde el mismo dominio
// verificado en Resend. Si en el futuro cada negocio necesita su propio dominio,
// hay que agregar verificación de dominio por negocio en Resend, no solo este input.
const SENDING_DOMAIN = 'devora.lat'

interface NotificationsSectionProps {
  initialEmail: string
  initialEmailFrom?: string | null
  initialEmailFromName?: string | null
  businessName?: string
}

function localPartFromEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [localPart, domain] = email.split('@')
  return domain === SENDING_DOMAIN ? localPart : ''
}

export function NotificationsSection({ initialEmail, initialEmailFrom, initialEmailFromName, businessName }: NotificationsSectionProps) {
  const [email, setEmail] = useState(initialEmail)
  const [fromLocalPart, setFromLocalPart] = useState(localPartFromEmail(initialEmailFrom))
  const [fromName, setFromName] = useState(initialEmailFromName || businessName || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  useEffect(() => {
    setFromLocalPart(localPartFromEmail(initialEmailFrom))
    setFromName(initialEmailFromName || businessName || '')
  }, [initialEmailFrom, initialEmailFromName, businessName])

  const handleSave = async () => {
    if (!email || !email.includes('@')) {
      showError('Error', 'Ingresá un email válido')
      return
    }
    if (!fromLocalPart.trim() || /[@\s]/.test(fromLocalPart)) {
      showError('Error', 'El remitente no puede estar vacío ni contener espacios o @')
      return
    }
    if (!fromName.trim()) {
      showError('Error', 'Ingresá el nombre que van a ver tus clientes')
      return
    }
    setSaving(true)
    try {
      const { updateBusinessEmailSettings } = await import('@/app/actions/email-settings')
      const result = await updateBusinessEmailSettings(
        `${fromLocalPart.trim()}@${SENDING_DOMAIN}`,
        fromName.trim(),
        email
      )
      if (result.success) {
        showSuccess('Guardado', 'Configuración de email actualizada')
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const { testBusinessEmailConfiguration } = await import('@/app/actions/email-settings')
      const result = await testBusinessEmailConfiguration()
      if (result.success) {
        showSuccess('Enviado', `Revisá ${email} (puede caer en spam)`)
      } else {
        showError('Error', result.error || 'No se pudo enviar el email de prueba')
      }
    } finally {
      setTesting(false)
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
      </div>

      <div className="pt-6 border-t border-border/40">
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Remitente de tus emails</label>
        <p className="text-sm font-medium text-muted-foreground/80 mb-4">
          El nombre y la casilla que ven tus clientes al recibir la confirmación de su reserva
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Nombre a mostrar</label>
            <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
              <Input
                value={fromName}
                onChange={e => setFromName(e.target.value)}
                placeholder="Mi Negocio"
                className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Casilla de envío</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                <Input
                  value={fromLocalPart}
                  onChange={e => setFromLocalPart(e.target.value.toLowerCase().trim())}
                  placeholder="turnos"
                  className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground/60 shrink-0">@{SENDING_DOMAIN}</span>
            </div>
          </div>
        </div>
        <div className="pt-4 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            Guardar email
          </Button>
          <Button onClick={handleTest} disabled={testing} variant="outline" className="rounded-xl px-6">
            {testing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={14} className="mr-2" />}
            Enviar prueba
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
