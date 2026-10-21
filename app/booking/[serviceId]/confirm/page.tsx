'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, Loader2, CreditCard,
  ChevronDown, ChevronUp, Check, Store, Sparkles, AlertCircle
} from 'lucide-react'
import { createAppointment, getServiceById, getServiceAddons } from '@/app/actions'
import { getBusinessPaymentConfig, createBookingPaymentPreference } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { SelectedAddon, ServiceAddon, Service } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  validateBookingForm, 
  isFormValid, 
  formatArgentinePhone,
  FormValidationState
} from '@/lib/utils/validation'
import { cn } from '@/lib/utils'

type PaymentMethod = 'full' | 'deposit'

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FormField({ id, label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

export default function CompactConfirmPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { error: showError } = useToast()

  const serviceId = params.serviceId as string
  const slug = params.slug as string
  const date = searchParams.get('date')
  const time = searchParams.get('time')

  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [service, setService] = useState<Service | null>(null)
  const [addons, setAddons] = useState<ServiceAddon[]>([])
  const [paymentConfig, setPaymentConfig] = useState<{ depositPercentage: number; hasMPConnected: boolean; cancellationHours?: number } | null>(null)

  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [showAddons, setShowAddons] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  
  // Validation state
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false
  })
  
  const [validation, setValidation] = useState<FormValidationState>({
    name: { isValid: false },
    email: { isValid: false },
    phone: { isValid: false }
  })

  // Validate form on change
  useEffect(() => {
    const newValidation = validateBookingForm(name, email, phone)
    setValidation(newValidation)
  }, [name, email, phone])

  useEffect(() => {
    async function fetchData() {
      if (serviceId) {
        const [serviceResult, addonsResult] = await Promise.all([
          getServiceById(serviceId),
          getServiceAddons()
        ])

        if (serviceResult.success && serviceResult.data) {
          setService(serviceResult.data)

          if (serviceResult.data.business_id) {
            const configResult = await getBusinessPaymentConfig(serviceResult.data.business_id)
            if (configResult.success && configResult.data) {
              setPaymentConfig(configResult.data)
            }
          }
        }

        if (addonsResult.success && addonsResult.data) {
          setAddons(addonsResult.data)
        }
      }
      setFetchingData(false)
    }
    fetchData()
  }, [serviceId])

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const addonsDuration = selectedAddons.reduce((sum, a) => sum + a.duration_minutes, 0)
  const totalPrice = (service?.price || 0) + addonsTotal
  const totalDuration = (service?.duration_minutes || 0) + addonsDuration

  const cancellationHours = paymentConfig?.cancellationHours ?? 24
  const depositPercentage = paymentConfig?.depositPercentage || 30
  const depositAmount = Math.round(totalPrice * depositPercentage / 100)
  const amountToPay = paymentConfig?.hasMPConnected
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

  const formattedDate = useMemo(() => {
    if (!date) return ''
    const dateObj = parseISO(date)
    const formatted = format(dateObj, "EEE d MMM", { locale: es })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [date])

  const formattedDateLong = useMemo(() => {
    if (!date) return ''
    const dateObj = parseISO(date)
    const formatted = format(dateObj, "EEEE d 'de' MMMM", { locale: es })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [date])

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
    // Remove non-digits for validation but keep input natural
    const formatted = formatArgentinePhone(value)
    setPhone(formatted)
  }, [])

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async () => {
    // Mark all fields as touched to show errors
    setTouched({ name: true, email: true, phone: true })
    
    // Validate before submit - trim values to ensure clean validation
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    
    const currentValidation = validateBookingForm(trimmedName, trimmedEmail, trimmedPhone)
    setValidation(currentValidation)
    
    console.log('Validation debug:', {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      validation: currentValidation,
      isValid: isFormValid(currentValidation)
    })
    
    if (!isFormValid(currentValidation)) {
      showError('Error', 'Por favor completá todos los campos correctamente')
      return
    }
    
    if (!service || !date || !time) {
      showError('Error', 'Falta información de la reserva')
      return
    }

    setLoading(true)

    const startDateTime = `${date}T${time}:00`

    const result = await createAppointment({
      service_id: serviceId,
      start_time: new Date(startDateTime).toISOString(),
      client_name: name.trim(),
      client_email: email.trim(),
      client_phone: phone.trim(),
      addon_ids: selectedAddons.map((a) => a.id)
    })

    if (!result.success || !result.data) {
      showError('Error', result.error || 'Intenta nuevamente')
      setLoading(false)
      return
    }

    if (paymentConfig?.hasMPConnected && amountToPay > 0) {
      if (!result.data.manage_token) {
        showError('Error al crear pago', 'No pudimos preparar el pago de tu reserva. Intentá de nuevo en unos minutos o contactá al negocio.')
        setLoading(false)
        return
      }
      const preferenceResult = await createBookingPaymentPreference(result.data.manage_token, paymentMethod)

      if (preferenceResult.success && preferenceResult.data?.initPoint) {
        // eslint-disable-next-line react-hooks/immutability -- External redirect to payment gateway
        window.location.href = preferenceResult.data.initPoint
        return
      } else {
        showError('Error al crear pago', preferenceResult.error || 'Intenta nuevamente')
        setLoading(false)
        return
      }
    }

    router.push(
      result.data.manage_token
        ? `/${slug}/booking/success?token=${encodeURIComponent(result.data.manage_token)}`
        : `/${slug}/booking/success`
    )
  }

  if (fetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Servicio no encontrado</p>
      </div>
    )
  }

  const allFieldsValid = isFormValid(validation)

  // Componentes de addons reutilizables
  const AddonsSection = ({ compact = false }: { compact?: boolean }) => (
    addons.length > 0 ? (
      <div className={cn(
        "border rounded-xl overflow-hidden",
        compact ? 'bg-background/50' : 'bg-card'
      )}>
        <button
          type="button"
          onClick={() => setShowAddons(!showAddons)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{compact ? 'Agregar extras' : 'Extras opcionales'}</span>
            {selectedAddons.length > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {selectedAddons.length}
              </span>
            )}
          </div>
          {showAddons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showAddons && (
          <div className={cn(
            "border-t p-2 space-y-1",
            compact && 'max-h-48 overflow-y-auto'
          )}>
            {addons.map(addon => {
              const isSelected = selectedAddons.some(a => a.id === addon.id)
              return (
                <button
                  type="button"
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon)}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between",
                    isSelected 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-secondary'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      isSelected 
                        ? 'bg-primary border-primary' 
                        : 'border-muted-foreground'
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{addon.name}</div>
                      <div className="text-xs text-muted-foreground">+{addon.duration_minutes} min</div>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">+{formatPrice(addon.price)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    ) : null
  )

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-1 -ml-1 hover:bg-secondary rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{service.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{time}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-primary">{formatPrice(totalPrice)}</div>
            <div className="text-xs text-muted-foreground">{totalDuration} min</div>
          </div>
        </header>

        <main className="flex-1 p-4 space-y-4 pb-28">
          <AddonsSection />

          {/* Form */}
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div className="text-sm font-medium">Tus datos <span className="text-destructive">*</span></div>
            
            <div className="space-y-4">
              <FormField 
                id="name-mobile" 
                label="Nombre completo" 
                required
                error={touched.name && !validation.name.isValid ? validation.name.error : undefined}
              >
                <Input
                  id="name-mobile"
                  placeholder="Ej: María González"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={cn(
                    "h-11",
                    touched.name && !validation.name.isValid && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="name"
                />
              </FormField>
              
              <FormField 
                id="email-mobile" 
                label="Email" 
                required
                error={touched.email && !validation.email.isValid ? validation.email.error : undefined}
              >
                <Input
                  id="email-mobile"
                  type="email"
                  placeholder="ejemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={cn(
                    "h-11",
                    touched.email && !validation.email.isValid && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="email"
                />
              </FormField>
              
              <FormField 
                id="phone-mobile" 
                label="Teléfono" 
                required
                error={touched.phone && !validation.phone.isValid ? validation.phone.error : undefined}
              >
                <Input
                  id="phone-mobile"
                  type="tel"
                  placeholder="11 1234-5678"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  className={cn(
                    "h-11",
                    touched.phone && !validation.phone.isValid && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="tel"
                />
              </FormField>
            </div>
          </div>

          {/* Payment */}
          {paymentConfig?.hasMPConnected && (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="text-sm font-medium">¿Cómo pagás?</div>
              <button
                type="button"
                onClick={() => setPaymentMethod('full')}
                className={cn(
                  "w-full p-3 rounded-lg border-2 flex items-center justify-between",
                  paymentMethod === 'full' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    paymentMethod === 'full' 
                      ? 'border-primary bg-primary' 
                      : 'border-muted-foreground'
                  )} />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Pagar todo
                    </div>
                    <div className="text-xs text-muted-foreground">Tarjeta o débito</div>
                  </div>
                </div>
                <span className="font-bold text-primary">{formatPrice(totalPrice)}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('deposit')}
                className={cn(
                  "w-full p-3 rounded-lg border-2 flex items-center justify-between",
                  paymentMethod === 'deposit' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    paymentMethod === 'deposit' 
                      ? 'border-primary bg-primary' 
                      : 'border-muted-foreground'
                  )} />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Store className="h-4 w-4" /> Seña + local
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(depositAmount)} ahora, {formatPrice(remainingInLocal)} después
                    </div>
                  </div>
                </div>
                <span className="font-bold text-primary">{formatPrice(depositAmount)}</span>
              </button>
            </div>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
          <Button 
            type="button" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSubmit()
            }} 
            disabled={loading || !allFieldsValid} 
            className="w-full h-12 text-base"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
            ) : paymentConfig?.hasMPConnected ? (
              <><CreditCard className="mr-2 h-4 w-4" />Pagar {formatPrice(amountToPay)} y reservar</>
            ) : (
              'Confirmar reserva'
            )}
          </Button>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex min-h-screen bg-background">
        {/* Header Bar */}
        <header className="fixed top-0 left-0 right-0 z-10 bg-background border-b border-border/50">
          <div className="max-w-6xl mx-auto px-8 h-20 flex items-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Volver a la selección de horario"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Volver</span>
            </button>

            {/* Progress Steps */}
            <nav aria-label="Progreso de reserva" className="flex-1 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium border border-border/50">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground hidden sm:inline">Servicio</span>
              </div>
              <div className="w-8 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium border border-border/50">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground hidden sm:inline">Horario</span>
              </div>
              <div className="w-8 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium border border-primary">
                  3
                </div>
                <span className="text-sm font-medium">Confirmar</span>
              </div>
            </nav>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto pt-28 pb-16 px-8">
          <div className="grid grid-cols-[400px_1fr] gap-10 items-start">
            {/* Left Column - Order Summary */}
            <aside className="sticky top-28 space-y-6">
              {/* Service Card */}
              <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                <div className="p-8 space-y-6">
                  {/* Service Header */}
                  <div className="space-y-3">
                    <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">{service.name}</h1>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="font-medium">{formattedDateLong}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="font-medium">{time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-4 pt-6 border-t border-border/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{service.name}</span>
                      <span className="font-medium text-foreground">{formatPrice(service.price)}</span>
                    </div>

                    {/* Selected Addons */}
                    <div className="space-y-3">
                      {selectedAddons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-primary flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            {addon.name}
                          </span>
                          <span className="font-medium text-primary">+{formatPrice(addon.price)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border/50 pt-5 mt-5">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Total estimado</span>
                          <p className="text-xs text-muted-foreground">{totalDuration} minutos de duración</p>
                        </div>
                        <span className="text-3xl font-bold text-primary tracking-tight">{formatPrice(totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Addons Section */}
                {addons.length > 0 && (
                  <div className="border-t border-border/50 bg-muted/20">
                    <button
                      type="button"
                      onClick={() => setShowAddons(!showAddons)}
                      aria-expanded={showAddons}
                      aria-controls="desktop-addons-list"
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>
                        <div className="text-left">
                          <span className="font-medium text-sm block">Personalizá tu experiencia</span>
                          <span className="text-xs text-muted-foreground">Agregá extras opcionales</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedAddons.length > 0 && (
                          <span className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-medium">
                            {selectedAddons.length} seleccionado{selectedAddons.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground",
                            showAddons && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                      </div>
                    </button>

                    {/* Addons List - No Animation */}
                    {showAddons && (
                      <div
                        id="desktop-addons-list"
                        className="px-4 pb-4 space-y-2"
                        aria-hidden={!showAddons}
                      >
                        {addons.map((addon) => {
                          const isSelected = selectedAddons.some(a => a.id === addon.id)
                          return (
                            <button
                              type="button"
                              key={addon.id}
                              onClick={() => handleToggleAddon(addon)}
                              aria-pressed={isSelected}
                              className={cn(
                                "w-full p-3.5 rounded-lg flex items-center justify-between",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isSelected
                                  ? 'bg-primary/5 border border-primary/20'
                                  : 'bg-card border border-border/50 hover:border-border hover:bg-accent/50'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center",
                                  isSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-muted-foreground/40'
                                )}>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-sm">{addon.name}</div>
                                  <div className="text-xs text-muted-foreground">+{addon.duration_minutes} min</div>
                                </div>
                              </div>
                              <span className="font-semibold text-sm text-primary">+{formatPrice(addon.price)}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-5 space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                  </div>
                  <span className="font-medium">{cancellationHours > 0 ? `Cancelación gratuita hasta ${cancellationHours}hs antes` : 'Cancelación gratuita hasta el momento del turno'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  </div>
                  <span className="font-medium">Pago seguro encriptado</span>
                </div>
              </div>
            </aside>

            {/* Right Column - Form */}
            <section aria-labelledby="booking-form-title" className="space-y-6">
              <div className="bg-card rounded-xl border border-border/50 shadow-sm">
                <div className="p-10 space-y-10">
                  {/* Section Header */}
                  <div className="space-y-2">
                    <h2 id="booking-form-title" className="font-serif text-2xl font-semibold tracking-tight">
                      Completá tu reserva
                    </h2>
                    <p className="text-muted-foreground">
                      Ingresá tus datos para confirmar el turno
                    </p>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-8">
                    <fieldset className="space-y-5">
                      <legend className="text-sm font-medium text-foreground mb-5 flex items-center gap-2">
                        Tus datos
                        <span className="text-xs text-muted-foreground font-normal" aria-label="Campos requeridos">(todos requeridos)</span>
                      </legend>

                      <div className="space-y-5">
                        <FormField
                          id="name-desktop"
                          label="Nombre completo"
                          required
                          error={touched.name && !validation.name.isValid ? validation.name.error : undefined}
                        >
                          <Input
                            id="name-desktop"
                            placeholder="Ej: María González"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => handleBlur('name')}
                            aria-invalid={touched.name && !validation.name.isValid}
                            aria-describedby={touched.name && !validation.name.isValid ? "name-desktop-error" : undefined}
                            className={cn(
                              "h-12 bg-muted/30 border-border/50",
                              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                              touched.name && !validation.name.isValid && "border-destructive focus-visible:ring-destructive/50"
                            )}
                            autoComplete="name"
                          />
                        </FormField>

                        <div className="grid grid-cols-2 gap-5">
                          <FormField
                            id="email-desktop"
                            label="Email"
                            required
                            error={touched.email && !validation.email.isValid ? validation.email.error : undefined}
                          >
                            <Input
                              id="email-desktop"
                              type="email"
                              placeholder="ejemplo@email.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onBlur={() => handleBlur('email')}
                              aria-invalid={touched.email && !validation.email.isValid}
                              aria-describedby={touched.email && !validation.email.isValid ? "email-desktop-error" : undefined}
                              className={cn(
                                "h-12 bg-muted/30 border-border/50",
                                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                                touched.email && !validation.email.isValid && "border-destructive focus-visible:ring-destructive/50"
                              )}
                              autoComplete="email"
                            />
                          </FormField>

                          <FormField
                            id="phone-desktop"
                            label="Teléfono"
                            required
                            error={touched.phone && !validation.phone.isValid ? validation.phone.error : undefined}
                          >
                            <Input
                              id="phone-desktop"
                              type="tel"
                              placeholder="11 1234-5678"
                              value={phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              onBlur={() => handleBlur('phone')}
                              aria-invalid={touched.phone && !validation.phone.isValid}
                              aria-describedby={touched.phone && !validation.phone.isValid ? "phone-desktop-error" : undefined}
                              className={cn(
                                "h-12 bg-muted/30 border-border/50",
                                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                                touched.phone && !validation.phone.isValid && "border-destructive focus-visible:ring-destructive/50"
                              )}
                              autoComplete="tel"
                            />
                          </FormField>
                        </div>
                      </div>
                    </fieldset>

                    {/* Payment Methods */}
                    {paymentConfig?.hasMPConnected && (
                      <fieldset className="space-y-5 pt-6 border-t border-border/50">
                        <legend className="text-sm font-medium text-foreground mb-5">
                          Seleccioná tu método de pago
                        </legend>

                        <div className="grid grid-cols-2 gap-5" role="radiogroup" aria-label="Métodos de pago">
                          {/* Full Payment Option */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('full')}
                            aria-checked={paymentMethod === 'full'}
                            role="radio"
                            className={cn(
                              "relative p-6 rounded-xl border-2 text-left",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              paymentMethod === 'full'
                                ? 'border-primary bg-primary/5'
                                : 'border-border/50 hover:border-primary/30 bg-card'
                            )}
                          >
                            {paymentMethod === 'full' && (
                              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" aria-hidden="true" />
                              </div>
                            )}
                            <div className="flex items-center gap-3 mb-4">
                              <div className={cn(
                                "w-11 h-11 rounded-lg flex items-center justify-center",
                                paymentMethod === 'full' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                              )}>
                                <CreditCard className="h-5 w-5" aria-hidden="true" />
                              </div>
                              <span className={cn(
                                "font-semibold",
                                paymentMethod === 'full' ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                Pagar todo
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</div>
                              <div className="text-xs text-muted-foreground">Tarjeta de crédito o débito</div>
                            </div>
                          </button>

                          {/* Deposit Payment Option */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('deposit')}
                            aria-checked={paymentMethod === 'deposit'}
                            role="radio"
                            className={cn(
                              "relative p-6 rounded-xl border-2 text-left",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              paymentMethod === 'deposit'
                                ? 'border-primary bg-primary/5'
                                : 'border-border/50 hover:border-primary/30 bg-card'
                            )}
                          >
                            {paymentMethod === 'deposit' && (
                              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" aria-hidden="true" />
                              </div>
                            )}
                            <div className="flex items-center gap-3 mb-4">
                              <div className={cn(
                                "w-11 h-11 rounded-lg flex items-center justify-center",
                                paymentMethod === 'deposit' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                              )}>
                                <Store className="h-5 w-5" aria-hidden="true" />
                              </div>
                              <span className={cn(
                                "font-semibold",
                                paymentMethod === 'deposit' ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                Seña + local
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-primary">{formatPrice(depositAmount)}</div>
                              <div className="text-xs text-muted-foreground">
                                Resto en local: <span className="font-medium text-foreground">{formatPrice(remainingInLocal)}</span>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Payment Info */}
                        <div className="rounded-lg bg-muted/30 border border-border/50 p-4 flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="h-4 w-4 text-blue-600" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Pago procesado por Mercado Pago</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tu pago está protegido. Recibirás confirmación inmediata.
                            </p>
                          </div>
                        </div>
                      </fieldset>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSubmit()
                      }}
                      disabled={loading || !allFieldsValid}
                      aria-busy={loading}
                      className={cn(
                        "w-full h-14 text-base rounded-xl",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        allFieldsValid && !loading && "bg-primary hover:bg-primary/90"
                      )}
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                          <span>Procesando tu reserva...</span>
                        </>
                      ) : paymentConfig?.hasMPConnected ? (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" aria-hidden="true" />
                          <span>Pagar {formatPrice(amountToPay)} y confirmar</span>
                        </>
                      ) : (
                        <span>Confirmar reserva</span>
                      )}
                    </Button>

                    {!allFieldsValid && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Completá todos los campos requeridos para continuar
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
