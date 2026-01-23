'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, Loader2, CreditCard,
  ChevronDown, ChevronUp, Check, Store, Sparkles
} from 'lucide-react'
import { createAppointment, getServiceById, getServiceAddons } from '@/app/actions'
import { getBusinessPaymentConfig, createPendingBookingPreference } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { SelectedAddon, ServiceAddon, Service } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type PaymentMethod = 'full' | 'deposit'

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
  const [fetchingPaymentConfig, setFetchingPaymentConfig] = useState(true)
  const [service, setService] = useState<Service | null>(null)
  const [addons, setAddons] = useState<ServiceAddon[]>([])
  const [paymentConfig, setPaymentConfig] = useState<{ depositPercentage: number; hasMPConnected: boolean } | null>(null)

  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [showAddons, setShowAddons] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Ref para prevenir race conditions en mobile
  const isMountedRef = useRef(true)
  const paymentConfigLoadedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    paymentConfigLoadedRef.current = false

    async function fetchData() {
      const startTime = Date.now()
      const sessionId = Math.random().toString(36).substring(7)

      console.log(`[${sessionId}] 🔄 START fetchData - mounted: ${isMountedRef.current}`)

      if (!isMountedRef.current) {
        console.log(`[${sessionId}] ⚠️ Component unmounted before fetch started`)
        return
      }

      setFetchingPaymentConfig(true)

      if (serviceId) {
        console.log(`[${sessionId}] 📡 Fetching service and addons...`)
        const [serviceResult, addonsResult] = await Promise.all([
          getServiceById(serviceId),
          getServiceAddons()
        ])

        if (!isMountedRef.current) {
          console.log(`[${sessionId}] ⚠️ Component unmounted after service fetch`)
          return
        }

        console.log(`[${sessionId}] [DEBUG] serviceResult:`, serviceResult)

        if (serviceResult.success && serviceResult.data) {
          setService(serviceResult.data)

          console.log(`[${sessionId}] [DEBUG] service.business_id:`, serviceResult.data.business_id)

          if (serviceResult.data.business_id) {
            const businessId = serviceResult.data.business_id
            console.log(`[${sessionId}] 💳 Fetching payment config for business:`, businessId)
            const configResult = await getBusinessPaymentConfig(businessId)
            const loadTime = Date.now() - startTime

            // CRÍTICO: Loggear la RAW response completa
            console.log(`[${sessionId}] 📦 RAW configResult:`, JSON.stringify(configResult, null, 2))
            console.log(`[${sessionId}] 🔍 configResult.success type:`, typeof configResult.success)
            console.log(`[${sessionId}] 🔍 configResult.data:`, configResult.data)

            if (configResult.data) {
              console.log(`[${sessionId}] 🔍 hasMPConnected value:`, configResult.data.hasMPConnected)
              console.log(`[${sessionId}] 🔍 hasMPConnected type:`, typeof configResult.data.hasMPConnected)
              console.log(`[${sessionId}] 🔍 depositPercentage value:`, configResult.data.depositPercentage)
              console.log(`[${sessionId}] 🔍 depositPercentage type:`, typeof configResult.data.depositPercentage)
            }

            if (!isMountedRef.current) {
              console.log(`[${sessionId}] ⚠️ Component unmounted after payment config fetch`)
              return
            }

            console.log(`[${sessionId}] [DEBUG] paymentConfig result:`, configResult)

            if (configResult.success && configResult.data) {
              paymentConfigLoadedRef.current = true
              setPaymentConfig(configResult.data)

            } else {
              // CRÍTICO: Si falla la carga, NO usar fallback
              console.error('Payment config failed:', configResult.error)
              // Dejar paymentConfig en null para que las validaciones bloqueen el submit
            }
          } else {
            // Si no hay business_id, es un servicio legacy sin negocio asociado
            if (isMountedRef.current) {
              setPaymentConfig({ depositPercentage: 100, hasMPConnected: false })
            }
          }
        }

        if (addonsResult.success && addonsResult.data) {
          if (isMountedRef.current) {
            setAddons(addonsResult.data)
          }
        }
      }

      if (isMountedRef.current) {
        setFetchingData(false)
        setFetchingPaymentConfig(false)
      }

      console.log(`[${sessionId}] ✅ END fetchData - paymentConfigLoaded: ${paymentConfigLoadedRef.current}`)
    }

    fetchData()

    // Cleanup function
    return () => {
      console.log('🧹 Cleanup: Setting isMountedRef to false')
      isMountedRef.current = false
    }
  }, [serviceId])

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const addonsDuration = selectedAddons.reduce((sum, a) => sum + a.duration_minutes, 0)
  const totalPrice = (service?.price || 0) + addonsTotal
  const totalDuration = (service?.duration_minutes || 0) + addonsDuration

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

  const handleSubmit = async () => {
    if (!service || !date || !time || !name || !phone) return

    // Validar que paymentConfig esté cargado
    if (paymentConfig === null) {
      showError('Error', 'Cargando configuración de pago. Por favor espera un momento.')
      return
    }

    // Si MP está conectado, validar método de pago
    if (paymentConfig.hasMPConnected && !paymentMethod) {
      showError('Error', 'Selecciona un método de pago')
      return
    }

    setLoading(true)

    const startDateTime = `${date}T${time}:00`
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + totalDuration)

    // If MP is connected, use deferred flow (create appointment AFTER payment)
    if (paymentConfig?.hasMPConnected && amountToPay > 0) {
      const preferenceResult = await createPendingBookingPreference({
        serviceId,
        startTime: new Date(startDateTime).toISOString(),
        endTime: endDateTime.toISOString(),
        clientName: name,
        clientPhone: phone,
        addons: selectedAddons,
        paymentAmount: amountToPay,
        paymentMethod,
      })

      if (preferenceResult.success && preferenceResult.data?.initPoint) {
        window.location.href = preferenceResult.data.initPoint
        return
      } else {
        showError('Error al crear pago', preferenceResult.error || 'Intenta nuevamente')
        setLoading(false)
        return
      }
    }

    // No MP connected - create appointment directly
    const result = await createAppointment({
      service_id: serviceId,
      start_time: new Date(startDateTime).toISOString(),
      end_time: endDateTime.toISOString(),
      client_name: name,
      client_phone: phone,
      status: 'confirmed',
      addons: selectedAddons
    })

    if (!result.success || !result.data) {
      showError('Error', result.error || 'Intenta nuevamente')
      setLoading(false)
      return
    }

    router.push(`/${slug}/booking/success?id=${result.data.id}`)
  }

  if (fetchingData || fetchingPaymentConfig) {
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

  // Componentes de addons reutilizables
  const AddonsSection = ({ compact = false }: { compact?: boolean }) => (
    addons.length > 0 ? (
      <div className={`${compact ? 'bg-background/60' : 'bg-card'} border border-border/70 rounded-2xl overflow-hidden`}>
        <button
          type="button"
          onClick={() => setShowAddons(!showAddons)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
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
          <div className="border-t p-3 space-y-2">
            {addons.map(addon => {
              const isSelected = selectedAddons.some(a => a.id === addon.id)
              return (
                <button
                  type="button"
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/60'
                      }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{addon.name}</div>
                      <div className="text-xs text-muted-foreground">+{addon.duration_minutes} min</div>
                    </div>
                  </div>
                  <span className="font-semibold text-sm flex-shrink-0 ml-3">+{formatPrice(addon.price)}</span>
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
              <span>{formatShortDate(date)}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{time}</span>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
            Paso 2 de 2
          </span>
          <div className="text-right">
            <div className="font-bold text-primary">{formatPrice(totalPrice)}</div>
            <div className="text-xs text-muted-foreground">{totalDuration} min</div>
          </div>
        </header>

        <main className="flex-1 p-4 space-y-4 pb-28">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Reserva</p>
                <p className="text-sm font-medium">
                  {formatLongDate(date)} · {time}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold text-primary">{formatPrice(totalPrice)}</p>
              </div>
            </div>
          </div>

          <AddonsSection />

          {/* Form */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium">Tus datos</div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
              <Input
                placeholder="Teléfono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Payment */}
          {paymentConfig?.hasMPConnected && (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="text-sm font-medium">¿Cómo pagás?</div>
              <button
                type="button"
                onClick={() => setPaymentMethod('full')}
                className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${paymentMethod === 'full' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'full' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pagar todo</div>
                    <div className="text-xs text-muted-foreground">Tarjeta o débito</div>
                  </div>
                </div>
                <span className="font-bold text-primary">{formatPrice(totalPrice)}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('deposit')}
                className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${paymentMethod === 'deposit' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'deposit' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-2"><Store className="h-4 w-4" /> Seña + local</div>
                    <div className="text-xs text-muted-foreground">{formatPrice(depositAmount)} ahora, {formatPrice(remainingInLocal)} después</div>
                  </div>
                </div>
                <span className="font-bold text-primary">{formatPrice(depositAmount)}</span>
              </button>
            </div>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
          <Button type="button" onClick={handleSubmit} disabled={loading || !name || !phone || fetchingPaymentConfig} className="w-full h-12 text-base">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
              : paymentConfig?.hasMPConnected ? <><CreditCard className="mr-2 h-4 w-4" />Pagar {formatPrice(amountToPay)} y reservar</>
                : 'Confirmar reserva'}
          </Button>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="w-full max-w-[1400px] mx-auto px-12 py-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reserva</p>
              <h2 className="text-3xl font-bold tracking-tight">Confirmá tu reserva</h2>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/80 text-muted-foreground">
              Paso 2 de 2
            </span>
          </div>

          <div className="w-full bg-card/60 rounded-3xl shadow-2xl shadow-black/10 overflow-hidden border border-border/50 flex gap-0 backdrop-blur-sm">
            {/* Left Column - Summary & Addons (40%) */}
            <div className="w-2/5 bg-gradient-to-br from-secondary/50 to-secondary/30 backdrop-blur-sm p-8 flex flex-col border-r border-border/30">
              <button
                type="button"
                onClick={() => router.back()}
                className={cn(
                  "flex items-center gap-2 text-muted-foreground rounded-lg px-2 py-1 -ml-2 mb-8 text-sm",
                  "transition-all duration-200",
                  "hover:text-foreground hover:bg-secondary/80 hover:-translate-x-1"
                )}
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>

              <div className="flex-1 space-y-8">
                {/* Service Info */}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">{service.name}</h1>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {formatLongDate(date)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {time}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Price Summary */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm tabular-nums">
                    <span className="text-foreground">{service.name}</span>
                    <span className="font-medium text-foreground">{formatPrice(service.price)}</span>
                  </div>
                  {selectedAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-sm text-primary tabular-nums">
                      <span>+ {addon.name}</span>
                      <span className="font-medium">+{formatPrice(addon.price)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-gradient-to-r from-border/50 via-border to-border/50 my-4" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total ({totalDuration} min)</span>
                    <span className="text-xl tabular-nums text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Addons Inline - Always visible */}
                {addons.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Extras disponibles
                    </h3>
                    <div className="space-y-3">
                      {addons.map((addon) => {
                        const isSelected = selectedAddons.some((a) => a.id === addon.id)
                        return (
                          <button
                            type="button"
                            key={addon.id}
                            onClick={() => handleToggleAddon(addon)}
                            className={cn(
                              "w-full p-4 rounded-xl flex items-center justify-between",
                              "transition-all duration-200",
                              "hover:-translate-y-0.5 hover:shadow-md",
                              isSelected
                                ? "bg-primary/10 border-2 border-primary/40 shadow-sm"
                                : "bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card/60"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200",
                                  isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-sm">{addon.name}</div>
                                <div className="text-xs text-muted-foreground">+{addon.duration_minutes} min</div>
                              </div>
                            </div>
                            <span className="font-semibold text-primary tabular-nums">+{formatPrice(addon.price)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Form & Payment (60%) */}
            <div className="flex-1 p-8 flex flex-col bg-background/40">
              <h2 className="text-xl font-semibold mb-8 tracking-tight">Completá tu reserva</h2>

              <div className="space-y-8 flex-1">
                {/* User Data */}
                <div className={cn(
                  "bg-card/60 border border-border/50 rounded-2xl p-8 space-y-6",
                  "transition-all duration-200",
                  "hover:border-border/70 hover:shadow-sm"
                )}>
                  <div className="text-sm font-medium text-foreground">Tus datos</div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={cn(
                        "h-12",
                        "transition-all duration-200",
                        "hover:border-border/80",
                        "focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                    <Input
                      placeholder="Teléfono"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(
                        "h-12",
                        "transition-all duration-200",
                        "hover:border-border/80",
                        "focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                </div>

                {/* Payment Method */}
                {paymentConfig?.hasMPConnected && (
                  <div className={cn(
                    "bg-card/60 border border-border/50 rounded-2xl p-8 space-y-6",
                    "transition-all duration-200",
                    "hover:border-border/70 hover:shadow-sm"
                  )}>
                    <div className="text-sm font-medium text-foreground">Método de pago</div>
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('full')}
                        className={cn(
                          "w-full px-6 py-5 rounded-xl border-2",
                          "transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-md",
                          "active:scale-[0.98]",
                          paymentMethod === 'full'
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/50 hover:border-primary/60 hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                "transition-colors duration-200",
                                paymentMethod === 'full' ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                            >
                              {paymentMethod === 'full' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="text-left flex-1 min-w-0">
                              <div className="font-semibold text-base">Pagar todo</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Tarjeta de crédito o débito
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-bold text-primary tabular-nums flex-shrink-0">
                            {formatPrice(totalPrice)}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('deposit')}
                        className={cn(
                          "w-full px-6 py-5 rounded-xl border-2",
                          "transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-md",
                          "active:scale-[0.98]",
                          paymentMethod === 'deposit'
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/50 hover:border-primary/60 hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                "transition-colors duration-200",
                                paymentMethod === 'deposit' ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                            >
                              {paymentMethod === 'deposit' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <Store className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="text-left flex-1 min-w-0">
                              <div className="font-semibold text-base">Seña + local</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Resto: {formatPrice(remainingInLocal)} en el local
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-bold text-primary tabular-nums flex-shrink-0">
                            {formatPrice(depositAmount)}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !name || !phone || fetchingPaymentConfig}
                className={cn(
                  "w-full h-14 text-base mt-8 rounded-xl",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-lg",
                  "active:scale-[0.98]"
                )}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : paymentConfig?.hasMPConnected ? (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pagar {formatPrice(amountToPay)} y reservar
                  </>
                ) : (
                  'Confirmar reserva'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
