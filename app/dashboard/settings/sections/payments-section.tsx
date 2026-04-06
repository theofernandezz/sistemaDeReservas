import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Percent,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { disconnectMercadoPago } from '@/app/actions'
import {
  updateBusinessManualTransferConfig,
  updateBusinessPaymentConfig,
} from '@/app/actions/payments'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SettingsProps } from '../settings-types'

interface PaymentsSectionProps {
  isMPConnected: boolean
  mpTokenValid?: boolean
  mpUserId?: string
  depositPercentage: number
  businessId?: string
  paymentSettings?: SettingsProps['paymentSettings']
}

export function PaymentsSection({
  isMPConnected,
  mpTokenValid,
  mpUserId,
  depositPercentage,
  businessId,
  paymentSettings,
}: PaymentsSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [depositPercent, setDepositPercent] = useState(depositPercentage)
  const [savingDeposit, setSavingDeposit] = useState(false)
  const [savingTransferConfig, setSavingTransferConfig] = useState(false)
  const [manualTransferEnabled, setManualTransferEnabled] = useState(
    paymentSettings?.manualTransfer.enabled ?? false
  )
  const [paymentFlowMode, setPaymentFlowMode] = useState<'mercadopago' | 'manual_transfer'>(
    paymentSettings?.paymentFlowMode ?? 'mercadopago'
  )
  const [transferAlias, setTransferAlias] = useState(paymentSettings?.manualTransfer.alias ?? '')
  const [transferCvu, setTransferCvu] = useState(paymentSettings?.manualTransfer.cvu ?? '')
  const [transferAccountHolder, setTransferAccountHolder] = useState(
    paymentSettings?.manualTransfer.accountHolder ?? ''
  )
  const [transferMessage, setTransferMessage] = useState(
    paymentSettings?.manualTransfer.message ||
      'Realiza la transferencia y guarda el comprobante. Nuestro equipo se contactará con vos para solicitarlo y confirmar la reserva.'
  )
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

  const isManualTransferReady =
    transferAlias.trim().length > 0 &&
    transferCvu.replace(/\s+/g, '').length === 22 &&
    transferAccountHolder.trim().length > 0

  const handleSaveManualTransfer = async () => {
    if (!businessId) return
    setSavingTransferConfig(true)

    const result = await updateBusinessManualTransferConfig(businessId, {
      enabled: manualTransferEnabled,
      paymentFlowMode,
      alias: transferAlias,
      cvu: transferCvu,
      accountHolder: transferAccountHolder,
      message: transferMessage,
    })

    if (result.success) {
      showSuccess('Guardado', 'Configuración de transferencia manual actualizada')
      router.refresh()
    } else {
      showError('Error', result.error || 'No se pudo guardar la transferencia manual')
    }

    setSavingTransferConfig(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-5 pb-8 border-b border-border/40">
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-2.5 shadow-sm">
          <Image
            src="/integrations/mercadopago.png"
            alt="Mercado Pago"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-contain drop-shadow-sm"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">Mercado Pago</h3>
          <p className="text-sm font-medium text-muted-foreground/80 mt-1">
            Recibí pagos directamente en tu cuenta
          </p>
          {isMPConnected && mpTokenValid === false && (
            <div className="mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                La conexión con Mercado Pago expiró o fue revocada. Reconectá tu cuenta para seguir recibiendo pagos.
              </p>
            </div>
          )}
          <div className="mt-5 flex items-center gap-3">
            {isMPConnected ? (
              <>
                {mpTokenValid === false ? (
                  <Button size="sm" onClick={handleConnectMP} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm hover:-translate-y-0.5 transition-all">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Reconectar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl shadow-inner">
                    <Check className="w-4 h-4" />
                    Conectado {mpUserId && <span className="opacity-60 font-semibold tracking-tight">({mpUserId})</span>}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleDisconnectMP} disabled={disconnecting} className="rounded-xl border border-white/5 hover:bg-secondary/40 shadow-sm transition-all hover:text-destructive">
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
                  <span>Desconectar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectMP} className="rounded-xl px-5 hover:-translate-y-0.5 shadow transition-all duration-300">
                <ExternalLink className="w-4 h-4 mr-2" />
                Vincular Mercado Pago
              </Button>
            )}
          </div>
        </div>
      </div>

      {isMPConnected && businessId && (
        <div className="bg-card/20 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <Percent className="w-4 h-4 text-primary" />
            <span className="font-semibold tracking-tight text-[15px] text-foreground">Porcentaje de seña</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground/80 mb-5">
            Este porcentaje del total se cobra al momento de reservar
          </p>
          <div className="flex items-center gap-3">
            <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all flex items-center">
              <Input
                type="number"
                min="10"
                max="100"
                step="5"
                value={depositPercent}
                onChange={e => setDepositPercent(Number(e.target.value))}
                className="w-20 text-center border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-semibold"
              />
              <span className="text-muted-foreground/60 font-semibold pr-3">%</span>
            </div>

            <Button
              variant="outline"
              onClick={handleSaveDeposit}
              disabled={savingDeposit || depositPercent === depositPercentage}
              className="rounded-xl border border-white/5 bg-secondary/20 hover:bg-secondary hover:shadow-sm transition-all"
            >
              {savingDeposit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar porcentaje'}
            </Button>
          </div>
          <p className="text-[13px] font-medium text-muted-foreground/60 mt-4 bg-background/30 p-3 rounded-xl border border-white/5 inline-block">
            <span className="text-foreground/80">Ejemplo:</span> Servicio de $10,000 → Se cobrará una seña de <strong className="text-primary">${Math.round(10000 * depositPercent / 100).toLocaleString()}</strong>
          </p>
        </div>
      )}

      {businessId && (
        <div className="bg-card/20 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-sm space-y-5">
          <div>
            <h4 className="font-semibold tracking-tight text-[15px] text-foreground">Transferencia manual</h4>
            <p className="text-sm font-medium text-muted-foreground/80 mt-1">
              Mostrá Alias/CVU en la reserva para cobrar por transferencia fuera de la pasarela.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Habilitar transferencia manual</p>
              <p className="text-xs text-muted-foreground mt-1">
                Si está activa, podés usar este método en el checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManualTransferEnabled(!manualTransferEnabled)}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${manualTransferEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${manualTransferEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Alias</label>
              <Input
                value={transferAlias}
                onChange={e => setTransferAlias(e.target.value)}
                placeholder="ejemplo.negocio"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">CVU (22 dígitos)</label>
              <Input
                value={transferCvu}
                onChange={e => setTransferCvu(e.target.value.replace(/[^0-9\s]/g, ''))}
                placeholder="0000003100000000000000"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Titular de la cuenta</label>
              <Input
                value={transferAccountHolder}
                onChange={e => setTransferAccountHolder(e.target.value)}
                placeholder="Nombre y apellido o razón social"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Mensaje para el cliente</label>
              <Input
                value={transferMessage}
                onChange={e => setTransferMessage(e.target.value)}
                placeholder="Indicaciones para enviar comprobante"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-background/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Modo de cobro en checkout</p>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentFlowMode('mercadopago')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  paymentFlowMode === 'mercadopago'
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-semibold">Mercado Pago</p>
                <p className="text-xs text-muted-foreground mt-1">Checkout Pro con redirección.</p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentFlowMode('manual_transfer')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  paymentFlowMode === 'manual_transfer'
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-semibold">Transferencia manual</p>
                <p className="text-xs text-muted-foreground mt-1">Muestra Alias/CVU y deja la reserva pendiente.</p>
              </button>
            </div>
          </div>

          {manualTransferEnabled && !isManualTransferReady && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Para activar correctamente la transferencia manual, completá Alias, CVU de 22 dígitos y titular.
            </p>
          )}

          <Button
            variant="outline"
            onClick={handleSaveManualTransfer}
            disabled={savingTransferConfig || (manualTransferEnabled && !isManualTransferReady)}
            className="rounded-xl border border-white/5 bg-secondary/20 hover:bg-secondary hover:shadow-sm transition-all"
          >
            {savingTransferConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar transferencia manual'}
          </Button>
        </div>
      )}
    </div>
  )
}
