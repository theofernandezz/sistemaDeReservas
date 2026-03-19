'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Copy, CheckCheck, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
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

export function TransferDetailsCard({
  alias,
  cvu,
  accountHolder,
  message,
  totalAmount,
  depositAmount,
  depositPercentage
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const TransferCopyRow = ({
    label,
    value,
    field,
  }: {
    label: string
    value: string | null
    field: 'alias' | 'cvu'
  }) => {
    const isCopied = copiedTransferField === field

    return (
      <button
        type="button"
        onClick={() => handleCopyTransferField(field, value)}
        className={cn(
          'w-full rounded-lg border bg-background/70 px-4 py-3 text-left transition-all',
          'hover:border-primary/40 hover:bg-background active:scale-[0.99]',
          'border-primary/20 bg-card shadow-sm'
        )}
        aria-label={`Copiar ${label}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</p>
            <p className="break-all font-semibold text-sm sm:text-base leading-tight">
              {value || '-'}
            </p>
          </div>

          <div className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium shrink-0',
            isCopied ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-primary/10 text-primary'
          )}>
            {isCopied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/30 shadow-sm overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center gap-2">
        <Landmark className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Datos para transferencia</h3>
      </div>
      <CardContent className="p-5 space-y-4">
        <div className="grid gap-3">
          <div className="bg-background/80 rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground mb-2">Podés transferir el total o una seña para asegurar tu turno:</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total del servicio</span>
                <span className="font-bold">{formatPrice(totalAmount)}</span>
              </div>
              {depositPercentage < 100 && (
                <div className="flex items-center justify-between text-primary">
                  <span className="font-medium">Seña ({depositPercentage}%)</span>
                  <span className="font-bold">{formatPrice(depositAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <TransferCopyRow label="Alias" value={alias} field="alias" />
            <TransferCopyRow label="CVU" value={cvu} field="cvu" />
            <div className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Titular</p>
              <p className="break-words text-sm sm:text-base font-semibold text-foreground leading-tight">{accountHolder || '-'}</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-center text-muted-foreground mt-4">
          {message || 'Una vez realizada la transferencia, envianos el comprobante para confirmar tu turno.'}
        </p>
      </CardContent>
    </Card>
  )
}
