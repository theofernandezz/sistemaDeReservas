import { useState } from 'react'
import { AlertTriangle, Loader2, Mail } from 'lucide-react'
import { requestAccountDeletion, sendPasswordResetEmail } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

interface AccountSectionProps {
  businessName?: string
}

export function AccountSection({ businessName }: AccountSectionProps) {
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
              onChange={e => setConfirmName(e.target.value)}
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
