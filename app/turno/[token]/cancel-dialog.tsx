'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cancelAppointmentByToken } from '@/app/actions/manage-appointment'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_REASON_LENGTH = 300
const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.'

interface CancelDialogProps {
  token: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled: () => void
  hasPayment: boolean
  businessName: string
}

export default function CancelDialog({
  token,
  open,
  onOpenChange,
  onCancelled,
  hasPayment,
  businessName,
}: CancelDialogProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (loading) return
    if (!next) setError('')
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await cancelAppointmentByToken({ token, reason: reason.trim() || undefined })
      if (result.success) {
        onCancelled()
      } else {
        setError(result.error)
      }
    } catch {
      setError(UNEXPECTED_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar este turno?</DialogTitle>
          <DialogDescription>
            Esta acción libera el horario y no se puede deshacer.
            {hasPayment && ` La devolución de tu pago la gestiona directamente ${businessName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={MAX_REASON_LENGTH}
            disabled={loading}
            placeholder="Contanos por qué cancelás"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Volver
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
            Sí, cancelar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
