'use client'

import { useState, useEffect } from 'react'
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
  memberId?: string // "any" or specific team member ID
}

// Extracted outside to avoid remounting (which caused animations to replay on every select)
const TimeSlotBtn = ({ 
  slot, 
  index = 0, 
  selectedTime, 
  onSelect 
}: { 
  slot: TimeSlot
  index?: number
  selectedTime: string | null
  onSelect: (time: string) => void
}) => (
  <button
    onClick={() => slot.available && onSelect(slot.time)}
    disabled={!slot.available}
    style={{ animationDelay: `${index * 30}ms` }}
    className={cn(
      "h-12 px-5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
      "animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
      selectedTime === slot.time
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02] ring-1 ring-primary/30"
        : slot.available
          ? "bg-secondary/30 hover:bg-secondary/70 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] border border-transparent hover:border-border/50"
          : "opacity-40 cursor-not-allowed bg-muted/20 text-muted-foreground line-through"
    )}
  >
    <span className="relative z-10 w-full text-center">{slot.time}</span>
  </button>
)

export default function BookingCalendar({
  service,
  serviceId,
  initialDate,
  initialSlots,
  memberId,
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

  useEffect(() => {
    if (!initialDate) return
    const nextDate = new Date(`${initialDate}T00:00:00`)
    if (!Number.isNaN(nextDate.getTime())) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(nextDate)
      setMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
    }
  }, [initialDate])

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  const handleDateSelect = async (newDate: Date | undefined) => {
    if (!newDate) return
    setDate(newDate)
    setSelectedTime(null)
    setLoading(true)
    const dateStr = format(newDate, 'yyyy-MM-dd')
    const result = await getAvailableSlots(serviceId, dateStr, undefined, memberId)
    if (result.success && result.data) {
      setSlots(result.data)
    }
    setLoading(false)
  }

  const handleContinue = () => {
    if (selectedTime && date) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const basePath = slug ? `/${slug}/booking` : '/booking'
      const memberParam = memberId ? `&member=${memberId}` : ''
      router.push(`${basePath}/${serviceId}/confirm?date=${dateStr}&time=${selectedTime}${memberParam}`)
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
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
            Paso 1 de 2
          </span>
        </header>

        <div className="px-4 pt-4">
          <div className="rounded-xl border border-border bg-card/60 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Fecha seleccionada</p>
              <p className="text-sm font-medium">
                {formattedDateLong || 'Elegí una fecha'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Horario</p>
              <p className="text-sm font-semibold">
                {selectedTime || 'Sin elegir'}
              </p>
            </div>
          </div>
        </div>

        {/* Calendar with custom navigation */}
        <div className="p-4 flex flex-col items-center border-b bg-secondary/20">
          {/* Month Navigation */}
          <div className="flex items-center justify-between w-full max-w-70 mb-3">
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
          <div className="flex items-center justify-between mb-4 animate-in fade-in duration-500">
            <div className="text-sm font-medium">{formattedDateLong}</div>
            <span className="text-xs text-muted-foreground">Elegí un horario</span>
          </div>

          <div className="min-h-[200px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center animate-in fade-in duration-300">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
              </div>
            ) : slots.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground animate-in fade-in duration-500">
                Sin horarios disponibles
              </div>
            ) : (
              <div className="space-y-6">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-[10px] font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Mañana</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {morningSlots.length > 0 ? (
                      morningSlots.map((slot, i) => (
                        <TimeSlotBtn key={slot.time} slot={slot} index={i} selectedTime={selectedTime} onSelect={setSelectedTime} />
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-6 text-sm text-muted-foreground animate-in fade-in duration-300">
                        <p>No hay turnos mañana</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Tarde</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {afternoonSlots.length > 0 ? (
                      afternoonSlots.map((slot, i) => (
                        <TimeSlotBtn key={slot.time} slot={slot} index={i + morningSlots.length} selectedTime={selectedTime} onSelect={setSelectedTime} />
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-6 text-sm text-muted-foreground animate-in fade-in duration-300">
                        <p>No hay turnos tarde</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
      <div className="hidden lg:flex min-h-[calc(100vh-5rem)] bg-linear-to-br from-background via-background to-secondary/20">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reserva</p>
              <h2 className="text-3xl font-bold tracking-tight">Elegí fecha y horario</h2>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/80 text-muted-foreground">
              Paso 1 de 2
            </span>
          </div>

          <div className="w-full bg-card/60 rounded-3xl shadow-2xl shadow-black/10 overflow-hidden border border-border/50 flex gap-0 backdrop-blur-sm">
            {/* Left Column - Calendar (40%) */}
            <div className="w-2/5 bg-linear-to-br from-secondary/50 to-secondary/30 backdrop-blur-sm p-6 flex flex-col border-r border-border/30">
              <button
                onClick={() => router.back()}
                className={cn(
                  "flex items-center gap-2 text-muted-foreground rounded-lg px-2 py-1 -ml-2 mb-6 text-sm",
                  "transition-all duration-200",
                  "hover:text-foreground hover:bg-secondary/80 hover:-translate-x-1"
                )}
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>

              <div className="flex-1 flex flex-col space-y-6">
                {/* Service Info */}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">{service.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      {formatPrice(service.price)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {service.durationMin} min
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />

                {/* Calendar */}
                <div className="flex-1 flex flex-col space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Seleccioná una fecha</h3>
                  
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between w-full">
                    <button
                      type="button"
                      onClick={() => setMonth(subMonths(month, 1))}
                      className={cn(
                        "p-2 rounded-lg border bg-background/60 backdrop-blur-sm",
                        "transition-all duration-200",
                        "hover:bg-background hover:shadow-md hover:-translate-y-0.5"
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-medium capitalize text-sm">
                      {format(month, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMonth(addMonths(month, 1))}
                      className={cn(
                        "p-2 rounded-lg border bg-background/60 backdrop-blur-sm",
                        "transition-all duration-200",
                        "hover:bg-background hover:shadow-md hover:-translate-y-0.5"
                      )}
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
                    className={cn(
                      "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm w-full p-4",
                      "transition-all duration-200",
                      "hover:shadow-sm"
                    )}
                    classNames={{
                      month_grid: "w-full",
                      day: "h-12 w-12 text-sm",
                      day_button: "h-12 w-12 text-sm",
                      weekday: "w-12 text-xs"
                    }}
                    hideNavigation
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Time Slots (60%) */}
            <div className="flex-1 p-8 flex flex-col bg-background/40">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-xl font-semibold tracking-tight">{formattedDateLong}</div>
                  <p className="text-sm text-muted-foreground mt-1">Seleccioná un horario disponible</p>
                </div>
                {selectedTime && (
                  <div className={cn(
                    "px-4 py-2 rounded-lg bg-primary/10 border border-primary/20",
                    "transition-all duration-200",
                    "animate-in fade-in slide-in-from-top-2"
                  )}>
                    <p className="text-xs text-muted-foreground">Horario seleccionado</p>
                    <p className="text-lg font-bold text-primary">{selectedTime}</p>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center animate-in fade-in duration-500">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">Buscando horarios...</p>
                  </div>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                    <Clock className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Sin horarios disponibles</p>
                    <p className="text-sm mt-1 opacity-70">Probá seleccionando otra fecha</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-8 overflow-y-auto pr-2 pb-4 scrollbar-thin">
                  {morningSlots.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <div className="text-[11px] font-semibold text-muted-foreground/70 mb-4 uppercase tracking-widest">
                        Turno Mañana
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {morningSlots.map((slot, i) => <TimeSlotBtn key={slot.time} slot={slot} index={i} selectedTime={selectedTime} onSelect={setSelectedTime} />)}
                      </div>
                    </div>
                  )}
                  {afternoonSlots.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both" style={{ animationDelay: '150ms' }}>
                      <div className="text-[11px] font-semibold text-muted-foreground/70 mb-4 uppercase tracking-widest">
                        Turno Tarde
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {afternoonSlots.map((slot, i) => <TimeSlotBtn key={slot.time} slot={slot} index={i + morningSlots.length} selectedTime={selectedTime} onSelect={setSelectedTime} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Continue Button */}
              <Button
                onClick={handleContinue}
                disabled={!selectedTime}
                className={cn(
                  "w-full h-14 text-base mt-8 rounded-xl",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-lg",
                  "active:scale-[0.98]"
                )}
                size="lg"
              >
                Continuar <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
