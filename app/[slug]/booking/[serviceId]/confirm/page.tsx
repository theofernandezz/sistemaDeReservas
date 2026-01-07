'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Loader2, Plus, CreditCard, Banknote, CircleDollarSign, Store } from 'lucide-react'
import { createAppointment, getServiceById } from '@/app/actions'
import { getBusinessPaymentConfig, createBookingPaymentPreference } from '@/app/actions/payments'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { SelectedAddon } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type PaymentMethod = 'full' | 'deposit'

export default function ConfirmationPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { error: showError } = useToast()

  const serviceId = params.serviceId as string
  const date = searchParams.get('date')
  const time = searchParams.get('time')
  const addonsParam = searchParams.get('addons')

  const [loading, setLoading] = useState(false)
  const [fetchingService, setFetchingService] = useState(true)
  const [service, setService] = useState<any>(null)
  const [paymentConfig, setPaymentConfig] = useState<{ depositPercentage: number; hasMPConnected: boolean } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full')

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  })

  // Parse addons from URL
  const selectedAddons: SelectedAddon[] = useMemo(() => {
    if (!addonsParam) return []
    try {
      return JSON.parse(decodeURIComponent(addonsParam))
    } catch {
      return []
    }
  }, [addonsParam])

  // Fetch Service Details and Payment Config
  useEffect(() => {
    async function fetchData() {
      if (serviceId) {
        const result = await getServiceById(serviceId)
        if (result.success && result.data) {
          setService(result.data)

          // Get payment config for the business
          if (result.data.business_id) {
            const configResult = await getBusinessPaymentConfig(result.data.business_id)
            if (configResult.success && configResult.data) {
              setPaymentConfig(configResult.data)
            }
          }
        }
      }
      setFetchingService(false)
    }
    fetchData()
  }, [serviceId])

  // Calculate totals
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const addonsDuration = selectedAddons.reduce((sum, a) => sum + a.duration_minutes, 0)
  const totalPrice = (service?.price || 0) + addonsTotal
  const totalDuration = (service?.duration_minutes || 60) + addonsDuration

  // Deposit percentage for cash payments (minimum deposit)
  const depositPercentage = paymentConfig?.depositPercentage || 30
  const depositAmount = Math.round(totalPrice * depositPercentage / 100)

  // Calculate actual amount to pay based on selected method
  const amountToPay = paymentConfig?.hasMPConnected
    ? (paymentMethod === 'full' ? totalPrice : depositAmount)
    : 0
  const remainingAmount = totalPrice - amountToPay

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!date) return ''
    const dateObj = parseISO(date)
    const formatted = format(dateObj, "EEEE d 'de' MMMM", { locale: es })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!service || !date || !time) {
      setLoading(false)
      return
    }

    // Create appointment with total duration (service + addons)
    const startDateTime = `${date}T${time}:00`
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + totalDuration)

    const result = await createAppointment({
      service_id: serviceId,
      start_time: new Date(startDateTime).toISOString(),
      end_time: endDateTime.toISOString(),
      client_name: formData.name,
      client_phone: formData.phone,
      client_email: formData.email,
      status: paymentConfig?.hasMPConnected ? 'pending' : 'pending',
      addons: selectedAddons
    })

    if (!result.success || !result.data) {
      showError('Error al reservar', result.error || 'Intenta nuevamente')
      setLoading(false)
      return
    }

    // If MP is connected, create payment preference and redirect
    if (paymentConfig?.hasMPConnected && amountToPay > 0) {
      const preferenceResult = await createBookingPaymentPreference(result.data.id, amountToPay)

      if (preferenceResult.success && preferenceResult.data?.initPoint) {
        // Redirect to Mercado Pago
        window.location.href = preferenceResult.data.initPoint
        return
      } else {
        showError('Error al crear pago', preferenceResult.error || 'Intenta nuevamente')
        setLoading(false)
        return
      }
    }

    // No payment required, go to success page
    router.push(`/booking/success?id=${result.data.id}`)
    setLoading(false)
  }

  if (fetchingService) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-xl font-bold">Servicio No Encontrado</h1>
          <Button onClick={() => router.push('/')} className="mt-4">Ir al Inicio</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="container max-w-lg px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Confirmar Reserva</h1>
        </div>
      </header>

      <main className="flex-1 container max-w-lg px-4 py-8 space-y-6">

        {/* Summary Card */}
        <Card className="bg-secondary/20 border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">{service.name}</CardTitle>
            <CardDescription>
              Resumen de tu cita
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> Fecha</span>
              <span className="font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Hora</span>
              <span className="font-medium">{time}</span>
            </div>

            <Separator className="my-2" />

            {/* Price Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{service.name}</span>
                <span>{formatPrice(service.price)}</span>
              </div>

              {selectedAddons.map(addon => (
                <div key={addon.id} className="flex items-center justify-between text-primary">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {addon.name}
                  </span>
                  <span>{formatPrice(addon.price)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between font-semibold">
              <span>Total ({totalDuration} min)</span>
              <span className="text-lg">{formatPrice(totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection - Only show if MP connected */}
        {paymentConfig?.hasMPConnected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CircleDollarSign className="h-4 w-4" />
              ¿Cómo querés pagar?
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Full Payment */}
              <button
                type="button"
                onClick={() => setPaymentMethod('full')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'full'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${paymentMethod === 'full' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                    {paymentMethod === 'full' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Pagar todo ahora
                      </span>
                      <span className="font-bold text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tarjeta de crédito, débito o dinero en cuenta
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Deposit for Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('deposit')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'deposit'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${paymentMethod === 'deposit' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                    {paymentMethod === 'deposit' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Seña + pagar en local
                      </span>
                      <span className="font-bold text-primary">{formatPrice(depositAmount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pagá {formatPrice(depositAmount)} ahora (Rapipago/Pago Fácil) y {formatPrice(remainingAmount)} en el local
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                required
                placeholder="María García"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                required
                placeholder="+54 11 1234 5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="maria@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={loading || !formData.name || !formData.phone}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {paymentConfig?.hasMPConnected ? 'Procesando...' : 'Confirmando...'}
              </>
            ) : paymentConfig?.hasMPConnected && amountToPay > 0 ? (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pagar {formatPrice(amountToPay)} y Reservar
              </>
            ) : (
              'Confirmar Reserva'
            )}
          </Button>
        </form>

      </main>
    </div>
  )
}
