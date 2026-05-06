'use client'

import { useState } from 'react'
import { Check, X, Clock, FileText, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { approvePaymentProof, rejectPaymentProof } from '@/app/actions/proof'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface ProofReviewCardProps {
  appointmentId: string
  clientName: string
  serviceName: string
  startTime: string
  proofUrl: string
  autoApproveAt: string | null
  onAction: () => void
}

export function ProofReviewCard({
  appointmentId,
  clientName,
  serviceName,
  startTime,
  proofUrl,
  autoApproveAt,
  onAction,
}: ProofReviewCardProps) {
  const { success: showSuccess, error: showError } = useToast()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPdf = proofUrl.toLowerCase().endsWith('.pdf') || proofUrl.includes('application%2Fpdf')

  const autoApproveDate = autoApproveAt ? new Date(autoApproveAt) : null
  const isFutureAutoApprove = autoApproveDate && autoApproveDate > new Date()

  const startDate = new Date(startTime)

  async function handleApprove() {
    setIsApproving(true)
    try {
      const result = await approvePaymentProof(appointmentId)
      if (result.success) {
        showSuccess('Comprobante aprobado', `El turno de ${clientName} fue confirmado.`)
        onAction()
      } else {
        showError('Error al aprobar', result.error ?? 'Intentá de nuevo.')
      }
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    if (!showRejectReason) {
      setShowRejectReason(true)
      return
    }
    setIsRejecting(true)
    try {
      const result = await rejectPaymentProof(appointmentId, rejectReason.trim() || undefined)
      if (result.success) {
        showSuccess('Comprobante rechazado', 'El cliente fue notificado.')
        onAction()
      } else {
        showError('Error al rechazar', result.error ?? 'Intentá de nuevo.')
      }
    } finally {
      setIsRejecting(false)
    }
  }

  const isBusy = isApproving || isRejecting

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{clientName}</p>
          <p className="text-sm text-muted-foreground truncate">{serviceName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(startDate, "EEEE d 'de' MMMM, HH:mm 'hs'", { locale: es })}
          </p>
        </div>
        {isFutureAutoApprove && autoApproveDate && (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium px-2.5 py-1 border border-amber-200 dark:border-amber-500/30">
            <Clock className="w-3 h-3" />
            Auto-aprueba en{' '}
            {formatDistanceToNow(autoApproveDate, { locale: es, addSuffix: false })}
          </span>
        )}
      </div>

      {/* Proof */}
      <div className="p-4 border-b border-border/40 bg-secondary/20">
        {isPdf ? (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm font-medium text-foreground hover:bg-background transition-colors"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            Ver PDF del comprobante
          </a>
        ) : (
          // Using <img> intentionally — URL is from Supabase Storage (external, dynamic)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proofUrl}
            alt={`Comprobante de pago de ${clientName}`}
            className="rounded-xl max-h-64 w-full object-contain bg-background/50 border border-border/40"
          />
        )}
      </div>

      {/* Reject reason textarea */}
      {showRejectReason && (
        <div className="px-4 pt-4">
          <label htmlFor={`reject-reason-${appointmentId}`} className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Motivo del rechazo (opcional)
          </label>
          <textarea
            id={`reject-reason-${appointmentId}`}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ej: El comprobante no corresponde al monto indicado."
            rows={3}
            className={cn(
              'w-full rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm',
              'placeholder:text-muted-foreground/60 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'transition-all duration-150'
            )}
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-4 flex gap-3">
        <Button
          onClick={handleApprove}
          disabled={isBusy}
          className={cn(
            'flex-1 h-11 rounded-xl font-semibold transition-all',
            'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
            'active:scale-[0.98]'
          )}
          aria-label={`Aprobar comprobante de ${clientName}`}
        >
          {isApproving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              Aprobar
            </>
          )}
        </Button>

        <Button
          onClick={handleReject}
          disabled={isBusy}
          variant="outline"
          className={cn(
            'flex-1 h-11 rounded-xl font-semibold transition-all',
            'border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60',
            'active:scale-[0.98]'
          )}
          aria-label={`Rechazar comprobante de ${clientName}`}
        >
          {isRejecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <X className="w-4 h-4 mr-1.5" />
              {showRejectReason ? 'Confirmar rechazo' : 'Rechazar'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
