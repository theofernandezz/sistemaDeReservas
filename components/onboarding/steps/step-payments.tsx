'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, Landmark, HandCoins, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaymentData {
  mode: 'none' | 'mercadopago' | 'manual_transfer'
  manualTransfer: {
    alias: string
    cvu: string
    accountHolder: string
  }
}

interface StepPaymentsProps {
  data: PaymentData
  onChange: (data: PaymentData) => void
}

const OPTIONS = [
  {
    id: 'none' as const,
    icon: HandCoins,
    title: 'Sin cobro online',
    description: 'Los clientes pagan en el local. Los turnos se confirman automáticamente al reservar.',
    badge: null,
  },
  {
    id: 'mercadopago' as const,
    icon: CreditCard,
    title: 'Mercado Pago',
    description: 'El cliente paga online antes de confirmar la reserva. Requiere vincular tu cuenta.',
    badge: 'Comisión por transacción',
  },
  {
    id: 'manual_transfer' as const,
    icon: Landmark,
    title: 'Transferencia manual',
    description: 'El cliente ve tu Alias/CVU y sube el comprobante. Vos lo confirmás desde el panel.',
    badge: null,
  },
]

export default function StepPayments({ data, onChange }: StepPaymentsProps) {
  const updateMode = (mode: PaymentData['mode']) => {
    onChange({ ...data, mode })
  }

  const updateTransfer = (field: keyof PaymentData['manualTransfer'], value: string) => {
    onChange({ ...data, manualTransfer: { ...data.manualTransfer, [field]: value } })
  }

  const cvuLength = data.manualTransfer.cvu.length

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {OPTIONS.map((option, index) => {
          const Icon = option.icon
          const isSelected = data.mode === option.id

          return (
            <motion.button
              key={option.id}
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              onClick={() => updateMode(option.id)}
              className={cn(
                'w-full p-5 rounded-xl border-2 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:bg-accent/30'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'bg-primary/15' : 'bg-primary/10'
                )}>
                  <Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{option.title}</span>
                    {option.badge && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className="ml-auto shrink-0"
                      >
                        <Check size={16} className="text-primary" />
                      </motion.span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* MercadoPago disclaimer */}
      <AnimatePresence>
        {data.mode === 'mercadopago' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">Antes de elegir esta opción, tené en cuenta:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                  <li>Necesitás una cuenta de Mercado Pago activa (personal o empresa)</li>
                  <li>Comisión del ~4.98% al 6.99% por transacción según el método del cliente</li>
                  <li>La vinculación OAuth se hace desde el panel de configuración, no acá</li>
                  <li>Las reservas solo se confirman si el pago se aprueba</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual transfer fields */}
      <AnimatePresence>
        {data.mode === 'manual_transfer' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <p className="text-sm font-medium text-foreground">Datos de tu cuenta bancaria</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transfer-alias">Alias</Label>
                  <Input
                    id="transfer-alias"
                    placeholder="ejemplo.negocio"
                    value={data.manualTransfer.alias}
                    onChange={e => updateTransfer('alias', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-cvu">
                    CVU <span className="text-muted-foreground font-normal">(22 dígitos)</span>
                  </Label>
                  <Input
                    id="transfer-cvu"
                    placeholder="0000003100000000000000"
                    value={data.manualTransfer.cvu}
                    onChange={e => updateTransfer('cvu', e.target.value.replace(/\D/g, '').slice(0, 22))}
                    className="h-11"
                  />
                  {cvuLength > 0 && cvuLength < 22 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {cvuLength}/22 dígitos
                    </p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="transfer-holder">Titular de la cuenta</Label>
                  <Input
                    id="transfer-holder"
                    placeholder="Nombre y apellido o razón social"
                    value={data.manualTransfer.accountHolder}
                    onChange={e => updateTransfer('accountHolder', e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Podés cambiar la configuración de pagos en cualquier momento desde el panel de control
        </p>
      </motion.div>
    </div>
  )
}
