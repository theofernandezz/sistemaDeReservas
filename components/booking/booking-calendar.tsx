'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Clock, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { TimeSlot } from '@/types/database.types'
import { getAvailableSlots } from '@/app/actions'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BookingCalendarProps {
  service: FrontendService
  serviceId: string
  initialDate: string
  initialSlots: TimeSlot[]
}

export default function BookingCalendar({
  service,
  serviceId,
  initialDate,
  initialSlots
}: BookingCalendarProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string | undefined

  const [date, setDate] = useState<Date | undefined>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [month, setMonth] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots)
  const [loading, setLoading] = useState(false)

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  const getBusinessHours = (): string | undefined => {
    if (typeof window === 'undefined') return undefined
    try {
      return localStorage.getItem('luxenail_business_hours') || undefined
    } catch {
      return undefined
    }
  }

  const handleDateSelect = async (newDate: Date | undefined) => {
    if (!newDate) return
    setDate(newDate)
    setSelectedTime(null)
    setLoading(true)
    const dateStr = format(newDate, 'yyyy-MM-dd')
    const businessHours = getBusinessHours()
    const result = await getAvailableSlots(serviceId, dateStr, businessHours)
    if (result.success && result.data) {
      setSlots(result.data)
    }
    setLoading(false)
  }

  const handleContinue = () => {
    if (selectedTime && date) {
      const dateStr = format(date, 'yyyy-MM-dd')
      // Use slug if available (multi-tenant route), otherwise fallback
      const basePath = slug ? `/${slug}/booking` : '/booking'
      router.push(`${basePath}/${serviceId}/confirm?date=${dateStr}&time=${selectedTime}`)
    }
  }

  const morningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) < 12)
  const afternoonSlots = slots.filter(s => parseInt(s.time.split(':')[0]) >= 12)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formattedDate = date
    ? capitalize(format(date, "EEE d", { locale: es }))
    : ''

  const formattedDateLong = date
    ? `${capitalize(format(date, "EEEE", { locale: es }))}, ${format(date, "d", { locale: es })} de ${capitalize(format(date, "MMMM", { locale: es }))}`
    : 'Selecciona una fecha'

  // Time slot button component
  const TimeSlotBtn = ({ slot }: { slot: TimeSlot }) => (
    <button
      onClick={() => slot.available && setSelectedTime(slot.time)}
      disabled={!slot.available}
      className={cn(
        "h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200 relative",
        selectedTime === slot.time
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02] ring-2 ring-primary/20"
          : slot.available
            ? "bg-card border border-border/60 hover:border-primary/40 hover:shadow-md hover:bg-secondary/20"
            : "opacity-40 cursor-not-allowed bg-muted/50 text-muted-foreground"
      )}
    >
      {slot.time}
      {selectedTime === slot.time && (
        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md border-2 border-background">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-card border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 hover:bg-secondary rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{service.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatPrice(service.price)}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{service.durationMin} min</span>
            </div>
          </div>
        </header>

        {/* Calendar with custom navigation */}
        <div className="p-4 flex flex-col items-center border-b bg-secondary/20">
          {/* Month Navigation */}
          <div className="flex items-center justify-between w-full max-w-[280px] mb-3">
            <button
              type="button"
              onClick={() => setMonth(subMonths(month, 1))}
              className="p-2 hover:bg-secondary rounded-lg border bg-background shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium capitalize">
              {format(month, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              className="p-2 hover:bg-secondary rounded-lg border bg-background shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            className="rounded-xl border bg-card p-3 shadow-sm"
            hideNavigation
          />
        </div>

        {/* Time Slots */}
        <div className="flex-1 p-4 pb-28 overflow-y-auto">
          <div className="text-sm font-medium mb-3">{formattedDateLong}</div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Sin horarios disponibles
            </div>
          ) : (
            <div className="space-y-4">
              {morningSlots.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Mañana</div>
                  <div className="grid grid-cols-4 gap-2">
                    {morningSlots.map(slot => <TimeSlotBtn key={slot.time} slot={slot} />)}
                  </div>
                </div>
              )}
              {afternoonSlots.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Tarde</div>
                  <div className="grid grid-cols-4 gap-2">
                    {afternoonSlots.map(slot => <TimeSlotBtn key={slot.time} slot={slot} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Button */}
        <div className={cn(
          "fixed bottom-0 left-0 right-0 bg-card border-t p-4 transition-all duration-300",
          selectedTime ? "translate-y-0" : "translate-y-full"
        )}>
          <Button onClick={handleContinue} className="w-full h-12 text-base">
            Continuar <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20 items-start justify-center pt-20 px-4">
        <div className="w-full max-w-5xl bg-card rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[calc(100vh-2rem)]">

          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">{service.title}</h1>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold text-primary">{formatPrice(service.price)}</span>
                  <span>•</span>
                  <span>{service.durationMin} minutos</span>
                </div>
              </div>
            </div>
            {selectedTime && (
              <Button onClick={handleContinue} size="lg" className="rounded-full px-8">
                Continuar <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Calendar */}
            <div className="w-[320px] p-4 border-r bg-secondary/20 flex flex-col items-center shrink-0">
              {/* Month Navigation */}
              <div className="flex items-center justify-between w-full max-w-[280px] mb-2">
                <button
                  type="button"
                  onClick={() => setMonth(subMonths(month, 1))}
                  className="p-2 hover:bg-secondary rounded-lg border bg-background shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium capitalize">
                  {format(month, 'MMMM yyyy', { locale: es })}
                </span>
                <button
                  type="button"
                  onClick={() => setMonth(addMonths(month, 1))}
                  className="p-2 hover:bg-secondary rounded-lg border bg-background shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                month={month}
                onMonthChange={setMonth}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-xl border bg-card p-4 shadow-sm"
                hideNavigation
              />
            </div>

            {/* Right: Time Slots */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="text-lg font-semibold mb-4">{formattedDateLong}</div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : slots.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Sin horarios disponibles</p>
                    <p className="text-sm">Probá otra fecha</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {morningSlots.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        Mañana <span className="h-px flex-1 bg-border" />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {morningSlots.map(slot => <TimeSlotBtn key={slot.time} slot={slot} />)}
                      </div>
                    </div>
                  )}
                  {afternoonSlots.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        Tarde <span className="h-px flex-1 bg-border" />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {afternoonSlots.map(slot => <TimeSlotBtn key={slot.time} slot={slot} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
