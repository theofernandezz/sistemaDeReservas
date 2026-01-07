'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, Loader2, CreditCard,
  ChevronDown, ChevronUp, Check, Store, Sparkles
} from 'lucide-react'
import { createAppointment, getServiceById, getServiceAddons } from '@/app/actions'
import { getBusinessPaymentConfig, createBookingPaymentPreference } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { SelectedAddon, ServiceAddon } from '@/types/database.types'
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
  const [service, setService] = useState<any>(null)
  const [addons, setAddons] = useState<ServiceAddon[]>([])
  const [paymentConfig, setPaymentConfig] = useState<{ depositPercentage: number; hasMPConnected: boolean } | null>(null)

  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [showAddons, setShowAddons] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

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

  const handleSubmit = async () => {
    if (!service || !date || !time || !name || !phone) return

    setLoading(true)

    const startDateTime = `${date}T${time}:00`
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + totalDuration)

    const result = await createAppointment({
      service_id: serviceId,
      start_time: new Date(startDateTime).toISOString(),
      end_time: endDateTime.toISOString(),
      client_name: name,
      client_phone: phone,
      status: 'pending',
      addons: selectedAddons
    })

    if (!result.success || !result.data) {
      showError('Error', result.error || 'Intenta nuevamente')
      setLoading(false)
      return
    }

    if (paymentConfig?.hasMPConnected && amountToPay > 0) {
      const preferenceResult = await createBookingPaymentPreference(result.data.id, amountToPay)

      if (preferenceResult.success && preferenceResult.data?.initPoint) {
        window.location.href = preferenceResult.data.initPoint
        return
      } else {
        showError('Error al crear pago', preferenceResult.error || 'Intenta nuevamente')
        setLoading(false)
        return
      }
    }

    router.push(`/${slug}/booking/success?id=${result.data.id}`)
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

  // Componentes de addons reutilizables
  const AddonsSection = ({ compact = false }: { compact?: boolean }) => (
    addons.length > 0 ? (
      <div className={`${compact ? 'bg-background/50' : 'bg-card'} border rounded-xl overflow-hidden`}>
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
          <div className={`border-t p-2 space-y-1 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}>
            {addons.map(addon => {
              const isSelected = selectedAddons.some(a => a.id === addon.id)
              return (
                <button
                  type="button"
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
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
          <Button type="button" onClick={handleSubmit} disabled={loading || !name || !phone} className="w-full h-12 text-base">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
              : paymentConfig?.hasMPConnected ? <><CreditCard className="mr-2 h-4 w-4" />Pagar {formatPrice(amountToPay)} y reservar</>
                : 'Confirmar reserva'}
          </Button>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 items-center justify-center p-8">
        <div className="w-full max-w-4xl bg-card rounded-3xl shadow-2xl overflow-hidden border flex">

          {/* Left Column */}
          <div className="w-[380px] bg-secondary/30 p-8 flex flex-col">
            <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>

            <div className="flex-1">
              <h1 className="font-serif text-2xl font-bold text-primary mb-2">{service.name}</h1>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formattedDateLong}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {time}</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>{service.name}</span>
                  <span>{formatPrice(service.price)}</span>
                </div>
                {selectedAddons.map(addon => (
                  <div key={addon.id} className="flex justify-between text-sm text-primary">
                    <span>+ {addon.name}</span>
                    <span>+{formatPrice(addon.price)}</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total ({totalDuration} min)</span>
                  <span className="text-lg">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <AddonsSection compact />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 p-8 flex flex-col">
            <h2 className="text-xl font-semibold mb-6">Completá tu reserva</h2>

            <div className="space-y-6 flex-1">
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Tus datos</div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                  />
                  <Input
                    placeholder="Teléfono"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              {paymentConfig?.hasMPConnected && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Método de pago</div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('full')}
                      className={`p-4 rounded-xl border-2 text-left ${paymentMethod === 'full' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Pagar todo</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Tarjeta de crédito o débito</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('deposit')}
                      className={`p-4 rounded-xl border-2 text-left ${paymentMethod === 'deposit' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Seña + local</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">{formatPrice(depositAmount)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Resto: {formatPrice(remainingInLocal)} en el local</div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !name || !phone}
              className="w-full h-14 text-base mt-8 rounded-xl"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Procesando...</>
              ) : paymentConfig?.hasMPConnected ? (
                <><CreditCard className="mr-2 h-5 w-5" />Pagar {formatPrice(amountToPay)} y reservar</>
              ) : (
                'Confirmar reserva'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
