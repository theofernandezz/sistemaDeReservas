'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { resendManageLink } from '@/app/actions/manage-appointment'
import { Button } from '@/components/ui/button'

const STATUSES = {
  Idle: 'idle',
  Sending: 'sending',
  Sent: 'sent',
  Error: 'error',
} as const

type Status = (typeof STATUSES)[keyof typeof STATUSES]

export default function ResendLinkButton({ appointmentId }: { appointmentId: string }) {
  const [status, setStatus] = useState<Status>(STATUSES.Idle)

  const handleResend = async () => {
    setStatus(STATUSES.Sending)
    try {
      // The server answers the same way whether or not the appointment exists, so the
      // outcome is deliberately not inspected: the user always sees the same message.
      await resendManageLink({ appointmentId })
      setStatus(STATUSES.Sent)
    } catch {
      setStatus(STATUSES.Error)
    }
  }

  if (status === STATUSES.Sent) {
    return (
      <div
        role="status"
        className="p-4 bg-green-50 text-green-800 text-sm rounded-lg flex items-start gap-2 border border-green-100 animate-in fade-in"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Si la reserva existe y sigue vigente, te enviamos un mail con el link nuevo al email con el que la hiciste.
          Revisá también la carpeta de spam.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {status === STATUSES.Error && (
        <div
          role="alert"
          className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          No pudimos procesar la solicitud. Intentá de nuevo en unos minutos.
        </div>
      )}
      <Button
        className="w-full h-12 text-base font-medium"
        onClick={handleResend}
        disabled={status === STATUSES.Sending}
      >
        {status === STATUSES.Sending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
        ) : (
          <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
        )}
        Enviarme el link por mail
      </Button>
    </div>
  )
}
