'use client'

import { useCallback, useState, type InputHTMLAttributes } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, Loader2, CreditCard,
  ChevronDown, ChevronUp, Check, Landmark, User, Mail, Phone
} from 'lucide-react'
import { createAppointment } from '@/app/actions'
import { getActiveTeamMembersForBusiness } from '@/app/actions/team'
import { createPendingBookingPreference } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { SelectedAddon, ServiceAddon, Service } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  validateBookingForm,
  isFormValid,
  formatArgentinePhone,
  FormValidationState
} from '@/lib/utils/validation'

type PaymentMethod = 'full' | 'deposit'
type PaymentFlowMode = 'mercadopago' | 'manual_transfer'

type PaymentConfig = {
  depositPercentage: number
  hasMPConnected: boolean
  paymentFlowMode: PaymentFlowMode
  manualTransfer: {
    enabled: boolean
    alias: string | null
    cvu: string | null
    accountHolder: string | null
    message: string | null
    isReady: boolean
  }
}

interface ConfirmFormProps {
  slug: string
  serviceId: string
  service: Service
  addons: ServiceAddon[]
  paymentConfig: PaymentConfig
  date: string | null
  time: string | null
  memberParam: string | null
  accentColor?: string
}

// Campo de texto con ícono a la izquierda — mismo trato en mobile y desktop
function IconInput({
  icon: Icon,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: typeof User; error?: string }) {
  return (
    <div className="space-y-1">
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" aria-hidden="true" />
        <input
          {...props}
          className={cn(
            'h-[46px] w-full pl-10 pr-3.5 rounded-[11px] border border-border text-sm',
            'placeholder:text-muted-foreground/60 focus:outline-none focus:border-muted-foreground/60 transition-colors',
            error && 'border-destructive',
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-destructive font-medium ml-1">{error}</p>}
    </div>
  )
}

export default function ConfirmForm({
  slug,
  serviceId,
  service,
  addons,
  paymentConfig,
  date,
  time,
  memberParam,
  accentColor = '#f97316',
}: ConfirmFormProps) {
  const router = useRouter()
  const { error: showError } = useToast()

  const specificMemberId = memberParam && memberParam !== 'any' ? memberParam : null

  const [loading, setLoading] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [showAddons, setShowAddons] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false
  })

  const validation: FormValidationState = validateBookingForm(name.trim(), email.trim(), phone.trim())

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const addonsDuration = selectedAddons.reduce((sum, a) => sum + a.duration_minutes, 0)
  const totalPrice = (service.price || 0) + addonsTotal
  const totalDuration = (service.duration_minutes || 0) + addonsDuration

  const depositPercentage = paymentConfig.depositPercentage || 30
  const depositAmount = Math.round(totalPrice * depositPercentage / 100)
  const isManualTransferFlow =
    paymentConfig.paymentFlowMode === 'manual_transfer' &&
    paymentConfig.manualTransfer.enabled &&
    paymentConfig.manualTransfer.isReady
  const amountToPay = paymentConfig.hasMPConnected && !isManualTransferFlow
    ? (paymentMethod === 'full' ? totalPrice : depositAmount)
    : 0
  const remainingInLocal = totalPrice - amountToPay

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatShortDate = (value?: string | null) => {
    if (!value) return ''
    const dateObj = parseISO(value)
    const formatted = format(dateObj, 'EEE d MMM', { locale: es })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const formatLongDate = (value?: string | null) => {
    if (!value) return ''
    const dateObj = parseISO(value)
    const formatted = format(dateObj, "EEEE d 'de' MMMM", { locale: es })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const handleToggleAddon = (addon: ServiceAddon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id)
      if (exists) {
        return prev.filter(a => a.id !== addon.id)
      }
      return [...prev, {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        duration_minutes: addon.duration_minutes
      }]
    })
  }

  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatArgentinePhone(value)
    setPhone(formatted)
  }, [])

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async () => {
    setTouched({ name: true, email: true, phone: true })

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    const currentValidation = validateBookingForm(trimmedName, trimmedEmail, trimmedPhone)

    if (!isFormValid(currentValidation)) {
      showError('Error', 'Por favor completá todos los campos correctamente')
      return
    }

    if (!date || !time) return

    setLoading(true)

    let resolvedTeamMemberId: string | null = specificMemberId
    if (!resolvedTeamMemberId && service.business_id) {
      const membersResult = await getActiveTeamMembersForBusiness(service.business_id)
      if (membersResult.success && membersResult.data && membersResult.data.length > 0) {
        resolvedTeamMemberId = membersResult.data[0].id
      }
    }

    const startDateTime = `${date}T${time}:00`
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + totalDuration)

    if (isManualTransferFlow) {
      const result = await createAppointment({
        service_id: serviceId,
        start_time: new Date(startDateTime).toISOString(),
        end_time: endDateTime.toISOString(),
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        status: 'confirmed',
        payment_status: 'pending',
        addons: selectedAddons,
        team_member_id: resolvedTeamMemberId,
      })

      if (!result.success || !result.data) {
        showError('Error', result.error || 'Intenta nuevamente')
        setLoading(false)
        return
      }

      router.push(`/${slug}/booking/success?id=${result.data.id}&status=pending`)
      return
    }

    if (paymentConfig.hasMPConnected && amountToPay > 0) {
      const preferenceResult = await createPendingBookingPreference({
        serviceId,
        startTime: new Date(startDateTime).toISOString(),
        endTime: endDateTime.toISOString(),
        clientName: name.trim(),
        clientPhone: phone.trim(),
        clientEmail: email.trim(),
        addons: selectedAddons,
        paymentAmount: amountToPay,
        paymentMethod,
      })

      if (preferenceResult.success && preferenceResult.data?.initPoint) {
        window.location.assign(preferenceResult.data.initPoint)
        return
      } else {
        if (preferenceResult.error === 'mp_token_invalid') {
          showError('Mercado Pago no disponible', 'El negocio necesita reconectar su cuenta de Mercado Pago.')
        } else {
          showError('Error al crear pago', preferenceResult.error || 'Intenta nuevamente')
        }
        setLoading(false)
        return
      }
    }

    const result = await createAppointment({
      service_id: serviceId,
      start_time: new Date(startDateTime).toISOString(),
      end_time: endDateTime.toISOString(),
      client_name: name.trim(),
      client_phone: phone.trim(),
      client_email: email.trim(),
      status: 'confirmed',
      addons: selectedAddons,
      team_member_id: resolvedTeamMemberId,
    })

    if (!result.success || !result.data) {
      showError('Error', result.error || 'Intenta nuevamente')
      setLoading(false)
      return
    }

    router.push(`/${slug}/booking/success?id=${result.data.id}`)
  }

  const allFieldsValid = isFormValid(validation)

  const ctaLabel = loading
    ? 'Procesando...'
    : isManualTransferFlow
      ? 'Reservar y ver datos de transferencia'
      : paymentConfig.hasMPConnected
        ? `Pagar ${formatPrice(amountToPay)} y reservar`
        : 'Confirmar reserva'

  const renderAddons = () => (
    addons.length > 0 ? (
      <div>
        <button
          type="button"
          onClick={() => setShowAddons(!showAddons)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-sm font-semibold">Extras opcionales</span>
          {showAddons ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showAddons && (
          <div className="flex flex-col gap-2 mt-3.5">
            {addons.map(addon => {
              const isSelected = selectedAddons.some(a => a.id === addon.id)
              return (
                <button
                  type="button"
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon)}
                  className="border border-border rounded-xl px-3.5 py-3 flex items-center gap-3 text-left hover:border-muted-foreground/40 transition-colors"
                >
                  {isSelected ? (
                    <span
                      className="h-[18px] w-[18px] rounded-[5px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-[18px] w-[18px] rounded-[5px] border-[1.5px] border-muted-foreground/40 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 text-sm font-medium">
                    {addon.name} <span className="font-normal text-muted-foreground/70">· +{addon.duration_minutes} min</span>
                  </span>
                  <span className="text-sm font-semibold shrink-0">+{formatPrice(addon.price)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    ) : null
  )

  const renderPayment = () => {
    if (isManualTransferFlow) {
      return (
        <div className="border border-border rounded-2xl p-[18px] flex gap-3.5 items-start">
          <Landmark className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold mb-1">Transferencia bancaria</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vas a ver el alias o CVU para transferir en el paso siguiente, después de reservar.
            </p>
          </div>
        </div>
      )
    }

    if (!paymentConfig.hasMPConnected) return null

    return (
      <div>
        <span className="text-sm font-semibold">¿Cómo pagás?</span>
        <div className="flex flex-col gap-2.5 mt-3.5">
          <button
            type="button"
            onClick={() => setPaymentMethod('full')}
            className={cn(
              'border rounded-xl px-4 py-3.5 flex items-center justify-between transition-colors',
              paymentMethod === 'full' ? 'border-foreground' : 'border-border hover:border-muted-foreground/40'
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-[18px] w-[18px] rounded-full border-[1.5px] shrink-0 flex items-center justify-center"
                style={{ borderColor: paymentMethod === 'full' ? accentColor : undefined }}
              >
                {paymentMethod === 'full' && <span className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: accentColor }} />}
              </span>
              <div className="text-left">
                <div className="text-sm font-semibold">Pagar todo</div>
                <div className="text-xs text-muted-foreground">Tarjeta de crédito o débito</div>
              </div>
            </div>
            <span className={cn('text-base font-bold', paymentMethod !== 'full' && 'text-muted-foreground')}>{formatPrice(totalPrice)}</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('deposit')}
            className={cn(
              'border rounded-xl px-4 py-3.5 flex items-center justify-between transition-colors',
              paymentMethod === 'deposit' ? 'border-foreground' : 'border-border hover:border-muted-foreground/40'
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-[18px] w-[18px] rounded-full border-[1.5px] shrink-0 flex items-center justify-center"
                style={{ borderColor: paymentMethod === 'deposit' ? accentColor : undefined }}
              >
                {paymentMethod === 'deposit' && <span className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: accentColor }} />}
              </span>
              <div className="text-left">
                <div className="text-sm font-semibold">Seña + local</div>
                <div className="text-xs text-muted-foreground">Resto: {formatPrice(remainingInLocal)} en el local</div>
              </div>
            </div>
            <span className={cn('text-base font-bold', paymentMethod !== 'deposit' && 'text-muted-foreground')}>{formatPrice(depositAmount)}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col">
        <header className="border-b px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-1 -ml-1 hover:bg-secondary rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-semibold text-sm truncate">{service.name}</h1>
            <p className="text-xs text-muted-foreground">{formatShortDate(date)} · {time}</p>
          </div>
          <span className="text-xs text-muted-foreground">Paso 2 de 2</span>
        </header>

        <main className="flex-1 p-4 space-y-6 pb-28">
          <div className="rounded-2xl border border-border p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span>{service.name}</span>
              <span className="font-medium">{formatPrice(service.price)}</span>
            </div>
            {selectedAddons.map((addon) => (
              <div key={addon.id} className="flex justify-between text-sm text-muted-foreground">
                <span>+ {addon.name}</span>
                <span>+{formatPrice(addon.price)}</span>
              </div>
            ))}
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold">Total <span className="font-normal text-muted-foreground text-xs">({totalDuration} min)</span></span>
              <span className="text-lg font-bold">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {renderAddons()}

          <div>
            <span className="text-sm font-semibold">Tus datos</span>
            <div className="flex flex-col gap-2.5 mt-3.5">
              <IconInput
                icon={User}
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                error={touched.name && !validation.name.isValid ? validation.name.error : undefined}
              />
              <IconInput
                icon={Mail}
                type="email"
                placeholder="Tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                error={touched.email && !validation.email.isValid ? validation.email.error : undefined}
              />
              <IconInput
                icon={Phone}
                type="tel"
                placeholder="Teléfono (ej: 11 1234-5678)"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => handleBlur('phone')}
                error={touched.phone && !validation.phone.isValid ? validation.phone.error : undefined}
              />
            </div>
          </div>

          {renderPayment()}
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !allFieldsValid}
            className="w-full h-12 text-base rounded-[11px]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && paymentConfig.hasMPConnected && !isManualTransferFlow && <CreditCard className="mr-2 h-4 w-4" />}
            {ctaLabel}
          </Button>
          {!allFieldsValid && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Completá todos los campos requeridos correctamente
            </p>
          )}
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex flex-col items-center bg-background min-h-[calc(100vh-5rem)] px-4 py-10">
        {/* Top bar */}
        <div className="w-full max-w-[720px] flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <span className="text-sm font-semibold">
            {service.name} <span className="font-normal text-muted-foreground">· {formatLongDate(date)} · {time}</span>
          </span>
          <span className="text-xs text-muted-foreground">Paso 2 de 2</span>
        </div>

        {/* Box */}
        <div className="w-full max-w-[720px] border border-border rounded-[20px] p-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-7">

            {/* Summary */}
            <div className="flex flex-col gap-3.5">
              <h1 className="text-lg font-bold tracking-tight">{service.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatLongDate(date)}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {time}</span>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex justify-between text-sm">
                  <span>{service.name}</span>
                  <span className="font-medium">{formatPrice(service.price)}</span>
                </div>
                {selectedAddons.map((addon) => (
                  <div key={addon.id} className="flex justify-between text-sm text-muted-foreground">
                    <span>+ {addon.name}</span>
                    <span>+{formatPrice(addon.price)}</span>
                  </div>
                ))}
                <div className="h-px bg-border my-1.5" />
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold">Total <span className="font-normal text-muted-foreground text-xs">({totalDuration} min)</span></span>
                  <span className="text-xl font-bold">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {renderAddons()}

            {addons.length > 0 && <div className="h-px bg-border" />}

            <div>
              <span className="text-sm font-semibold">Tus datos</span>
              <div className="flex flex-col gap-2.5 mt-3.5">
                <IconInput
                  icon={User}
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  error={touched.name && !validation.name.isValid ? validation.name.error : undefined}
                />
                <IconInput
                  icon={Mail}
                  type="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  error={touched.email && !validation.email.isValid ? validation.email.error : undefined}
                />
                <IconInput
                  icon={Phone}
                  type="tel"
                  placeholder="Teléfono (ej: 11 1234-5678)"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  error={touched.phone && !validation.phone.isValid ? validation.phone.error : undefined}
                />
              </div>
            </div>

            {(isManualTransferFlow || paymentConfig.hasMPConnected) && (
              <>
                <div className="h-px bg-border" />
                {renderPayment()}
              </>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !allFieldsValid}
              className="w-full h-[50px] text-base rounded-[11px]"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {!loading && paymentConfig.hasMPConnected && !isManualTransferFlow && <CreditCard className="mr-2 h-5 w-5" />}
              {ctaLabel}
            </Button>
            {!allFieldsValid && (
              <p className="text-xs text-muted-foreground text-center -mt-4">
                Completá todos los campos requeridos correctamente
              </p>
            )}
          </form>
        </div>
      </div>
    </>
  )
}
