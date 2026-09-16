'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface TransferDetailsCardProps {
  alias: string | null
  cvu: string | null
  accountHolder: string | null
  message?: string | null
  totalAmount: number
  depositAmount: number
  depositPercentage: number
}

function TransferCopyRow({
  label,
  value,
  isCopied,
  onCopy,
}: {
  label: string
  value: string | null
  isCopied: boolean
  onCopy: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        'w-full rounded-xl border border-border px-4 py-3 text-left transition-colors',
        'hover:border-muted-foreground/40'
      )}
      aria-label={`Copiar ${label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] text-muted-foreground mb-0.5">{label}</p>
          <p className="break-all font-semibold text-sm leading-tight">
            {value || '-'}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
        </div>
      </div>
    </button>
  )
}

export function TransferDetailsCard({
  alias,
  cvu,
  accountHolder,
  message,
}: TransferDetailsCardProps) {
  const { error: showError } = useToast()
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copiedTransferField, setCopiedTransferField] = useState<'alias' | 'cvu' | null>(null)

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  const handleCopyTransferField = useCallback(
    async (field: 'alias' | 'cvu', value: string | null) => {
      if (!value) return

      try {
        await navigator.clipboard.writeText(value)
        setCopiedTransferField(field)

        if (copyResetTimeoutRef.current) {
          clearTimeout(copyResetTimeoutRef.current)
        }

        copyResetTimeoutRef.current = setTimeout(() => {
          setCopiedTransferField(null)
        }, 1400)
      } catch {
        showError('No se pudo copiar', 'Copiá el dato manualmente')
      }
    },
    [showError]
  )

  return (
    <div className="flex flex-col gap-2.5">
      <TransferCopyRow
        label="Alias"
        value={alias}
        isCopied={copiedTransferField === 'alias'}
        onCopy={() => handleCopyTransferField('alias', alias)}
      />
      <TransferCopyRow
        label="CVU"
        value={cvu}
        isCopied={copiedTransferField === 'cvu'}
        onCopy={() => handleCopyTransferField('cvu', cvu)}
      />
      <div className="w-full rounded-xl border border-border px-4 py-3 text-left">
        <p className="text-[10.5px] text-muted-foreground mb-0.5">Titular</p>
        <p className="break-words text-sm font-semibold leading-tight">{accountHolder || '-'}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-1">
        {message || 'Una vez realizada la transferencia, envianos el comprobante para confirmar tu turno.'}
      </p>
    </div>
  )
}
