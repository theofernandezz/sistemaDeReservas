import { useEffect, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NotificationsSectionProps {
  initialEmail: string
}

export function NotificationsSection({ initialEmail }: NotificationsSectionProps) {
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
