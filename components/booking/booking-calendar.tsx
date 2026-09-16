'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format, addDays, differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { TimeSlot, BusinessSettings } from '@/types/database.types'
import { getAvailableSlots } from '@/app/actions'
import { isDayOpen } from '@/lib/business-hours'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface BookingCalendarProps {
  service: FrontendService
  serviceId: string
  initialDate: string
  initialSlots: TimeSlot[]
  memberId?: string // "any" or specific team member ID
  maxAdvanceDays?: number
  businessHours?: BusinessSettings['businessHours']
  accentColor?: string
}

// Extracted outside to avoid remounting (which caused animations to replay on every select)
const TimeSlotBtn = ({
  slot,
  selectedTime,
  accentColor,
  onSelect,
}: {
  slot: TimeSlot
  selectedTime: string | null
  accentColor: string
  onSelect: (time: string) => void
}) => {
  const isSelected = selectedTime === slot.time

  if (isSelected) {
    return (
      <button
        onClick={() => onSelect(slot.time)}
        style={{ backgroundColor: accentColor }}
        className="h-12 px-5 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98]"
      >
        {slot.time}
      </button>
    )
  }

  if (!slot.available) {
    return (
      <button
        disabled
        className="h-12 px-5 rounded-xl text-sm text-muted-foreground/50 line-through cursor-not-allowed"
      >
        {slot.time}
      </button>
    )
  }

  return (
    <button
      onClick={() => onSelect(slot.time)}
      className={cn(
        'h-12 px-5 rounded-xl text-sm font-medium border border-border flex items-center justify-center gap-2',
        'transition-colors hover:border-muted-foreground/50 active:scale-[0.98]'
      )}
    >
      {slot.time}
      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" aria-hidden="true" />
    </button>
  )
}

const SlotSkeleton = ({ cols }: { cols: 2 | 4 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="space-y-6"
  >
    {[0, 1].map((group) => (
      <div key={group}>
        <div className="h-3 w-16 rounded bg-muted/40 animate-pulse mb-3" />
        <div className={cn('grid gap-3', cols === 4 ? 'grid-cols-4' : 'grid-cols-2')}>
          {Array.from({ length: cols === 4 ? 8 : 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-muted/30 animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    ))}
  </motion.div>
)

export default function BookingCalendar({
  service,
  serviceId,
  initialDate,
  initialSlots,
  memberId,
  maxAdvanceDays = 21,
  businessHours,
  accentColor = '#f97316',
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
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots)
  const [loading, setLoading] = useState(false)
  const minBookableDate = startOfDay(new Date())
  const maxBookableDate = addDays(minBookableDate, Math.max(1, maxAdvanceDays))

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

  const fetchSlotsFor = async (newDate: Date) => {
    setSelectedTime(null)
    setLoading(true)
    const dateStr = format(newDate, 'yyyy-MM-dd')
    const result = await getAvailableSlots(serviceId, dateStr, undefined, memberId)
    if (result.success && result.data) {
      setSlots(result.data)
    }
    setLoading(false)
  }

  const handleDateSelect = async (newDate: Date | undefined) => {
    if (!newDate) return
    if (newDate < minBookableDate || newDate > maxBookableDate) return
    setDate(newDate)
    setWeekOffset(Math.max(0, Math.floor(differenceInCalendarDays(newDate, minBookableDate) / 7)))
    await fetchSlotsFor(newDate)
  }

  const handleStripDaySelect = async (newDate: Date) => {
    if (newDate < minBookableDate || newDate > maxBookableDate) return
    if (!isDayOpen(businessHours, newDate.getDay())) return
    setDate(newDate)
    await fetchSlotsFor(newDate)
  }

  const handlePopoverSelect = async (newDate: Date | undefined) => {
    await handleDateSelect(newDate)
    setMonthPickerOpen(false)
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

  const formattedDateLong = date
    ? `${capitalize(format(date, "EEEE", { locale: es }))}, ${format(date, "d", { locale: es })} de ${capitalize(format(date, "MMMM", { locale: es }))}`
    : 'Selecciona una fecha'

  // Ventana de 7 días para la tira (respeta el rango máximo de reserva)
  const windowStart = addDays(minBookableDate, weekOffset * 7)
  const stripDays = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i))
  const prevWeekDisabled = weekOffset === 0
  const nextWeekDisabled = addDays(windowStart, 7) > maxBookableDate

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
          <span className="text-xs text-muted-foreground">Paso 1 de 2</span>
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
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={(d) => d < minBookableDate || d > maxBookableDate}
            className="rounded-xl border bg-card p-3 shadow-sm"
          />
        </div>

        {/* Time Slots */}
        <div className="flex-1 p-4 pb-28 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">{formattedDateLong}</div>
            <span className="text-xs text-muted-foreground">Elegí un horario</span>
          </div>

          <div className="min-h-[200px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <SlotSkeleton key="skeleton-mobile" cols={2} />
              ) : slots.length === 0 ? (
                <motion.div
                  key="empty-mobile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center py-16 text-muted-foreground text-sm"
                >
                  Sin horarios disponibles
                </motion.div>
              ) : (
                <motion.div
                  key={date?.toISOString()}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <div className="text-xs text-muted-foreground mb-3">Mañana</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {morningSlots.length > 0 ? (
                        morningSlots.map((slot) => (
                          <TimeSlotBtn key={slot.time} slot={slot} selectedTime={selectedTime} accentColor={accentColor} onSelect={setSelectedTime} />
                        ))
                      ) : (
                        <p className="col-span-3 text-center py-6 text-sm text-muted-foreground">No hay turnos mañana</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-3">Tarde</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {afternoonSlots.length > 0 ? (
                        afternoonSlots.map((slot) => (
                          <TimeSlotBtn key={slot.time} slot={slot} selectedTime={selectedTime} accentColor={accentColor} onSelect={setSelectedTime} />
                        ))
                      ) : (
                        <p className="col-span-3 text-center py-6 text-sm text-muted-foreground">No hay turnos tarde</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
      <div className="hidden lg:flex flex-col items-center bg-background min-h-[calc(100vh-5rem)] px-4 py-10">
        {/* Top bar */}
        <div className="w-full max-w-[720px] flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <span className="text-sm font-semibold">
            {service.title} <span className="font-normal text-muted-foreground">· {formatPrice(service.price)} · {service.durationMin} min</span>
          </span>
          <span className="text-xs text-muted-foreground">Paso 1 de 2</span>
        </div>

        {/* Box */}
        <div className="w-full max-w-[720px] border border-border rounded-[20px] p-8">
          {/* Box header */}
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm text-muted-foreground">Seleccioná una fecha</span>
            <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Ver mes completo
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1 hover:bg-secondary rounded-md">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold capitalize">{format(month, 'MMMM yyyy', { locale: es })}</span>
                  <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1 hover:bg-secondary rounded-md">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handlePopoverSelect}
                  month={month}
                  onMonthChange={setMonth}
                  disabled={(d) => d < minBookableDate || d > maxBookableDate}
                  hideNavigation
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Podés reservar hasta {maxAdvanceDays} días por adelantado
                </p>
              </PopoverContent>
            </Popover>
          </div>

          {/* Day strip */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={prevWeekDisabled}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center shrink-0 hover:border-muted-foreground/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex-1 grid grid-cols-7 gap-2">
              {stripDays.map((day) => {
                const outOfRange = day > maxBookableDate
                const open = !outOfRange && isDayOpen(businessHours, day.getDay())
                const isSelected = date && isSameDay(date, day)
                const isToday = isSameDay(day, minBookableDate)

                if (outOfRange) {
                  return <div key={day.toISOString()} className="h-[62px]" />
                }

                if (!open) {
                  return (
                    <div key={day.toISOString()} className="h-[62px] flex flex-col items-center justify-center gap-0.5">
                      <span className="text-[10px] uppercase text-muted-foreground/50">{capitalize(format(day, 'EEE', { locale: es }))}</span>
                      <span className="text-[15px] font-bold text-muted-foreground/50">{format(day, 'd')}</span>
                      <span className="text-[8px] text-muted-foreground/50">Cerrado</span>
                    </div>
                  )
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleStripDaySelect(day)}
                    className="h-[62px] flex flex-col items-center justify-center gap-0.5 group"
                  >
                    <span className="text-[10px] uppercase text-muted-foreground">{capitalize(format(day, 'EEE', { locale: es }))}</span>
                    <span
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-[15px] font-bold transition-colors',
                        !isSelected && 'group-hover:bg-secondary'
                      )}
                      style={isSelected ? { backgroundColor: accentColor, color: 'white' } : undefined}
                    >
                      {format(day, 'd')}
                    </span>
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: isToday && !isSelected ? 'currentColor' : 'transparent' }}
                    />
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={nextWeekDisabled}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center shrink-0 hover:border-muted-foreground/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-px bg-border my-6" />

          {/* Selected date heading */}
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-bold tracking-tight">{formattedDateLong}</h2>
            {selectedTime && (
              <span className="text-sm text-muted-foreground">{selectedTime} seleccionado</span>
            )}
          </div>

          {/* Time slots */}
          <AnimatePresence mode="wait">
            {loading ? (
              <SlotSkeleton key="skeleton-desktop" cols={4} />
            ) : slots.length === 0 ? (
              <motion.div
                key="empty-desktop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="py-12 text-center text-muted-foreground text-sm"
              >
                Sin horarios disponibles para este día
              </motion.div>
            ) : (
              <motion.div
                key={date?.toISOString()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {morningSlots.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2.5">Mañana</div>
                    <div className="grid grid-cols-4 gap-2">
                      {morningSlots.map((slot) => (
                        <TimeSlotBtn key={slot.time} slot={slot} selectedTime={selectedTime} accentColor={accentColor} onSelect={setSelectedTime} />
                      ))}
                    </div>
                  </div>
                )}
                {afternoonSlots.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2.5">Tarde</div>
                    <div className="grid grid-cols-4 gap-2">
                      {afternoonSlots.map((slot) => (
                        <TimeSlotBtn key={slot.time} slot={slot} selectedTime={selectedTime} accentColor={accentColor} onSelect={setSelectedTime} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleContinue}
            disabled={!selectedTime}
            className="w-full h-[50px] text-base mt-7 rounded-[11px]"
          >
            Continuar <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
