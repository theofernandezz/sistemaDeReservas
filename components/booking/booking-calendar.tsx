'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Clock, CalendarIcon, Check, ChevronRight, Sparkles } from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { TimeSlot } from '@/types/database.types'
import { getAvailableSlots } from '@/app/actions'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  // Always start with today's date
  const [date, setDate] = useState<Date | undefined>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots)
  const [loading, setLoading] = useState(false)

  // Helper to capitalize first letter
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  // Function to get business hours from localStorage
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
      // Go to addons page first (then to confirm)
      router.push(`/booking/${serviceId}/addons?date=${dateStr}&time=${selectedTime}`)
    }
  }

  const morningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) < 12)
  const afternoonSlots = slots.filter(s => parseInt(s.time.split(':')[0]) >= 12)

  return (
    <Card className="border-none shadow-2xl shadow-stone-200/50 dark:shadow-none overflow-hidden bg-card/50 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row">

        {/* Left Panel: Service Info & Calendar (Fixed Width) */}
        <div className="w-full lg:w-[400px] bg-secondary/30 p-6 md:p-8 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-border/50">

          {/* Back & Title */}
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>

            <div>
              <Badge variant="outline" className="mb-2 border-primary/20 bg-primary/5 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                Servicio Premium
              </Badge>
              <h1 className="font-serif font-bold text-3xl text-primary leading-tight">
                {service.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-foreground/80">
                <span className="font-semibold">${service.price}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{service.durationMin} minutos</span>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Calendar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 block">Seleccionar Fecha</span>
              <div className="bg-background rounded-2xl p-4 shadow-sm border border-border/40 w-fit mx-auto relative">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Time Selection (Flexible) */}
        <div className="flex-1 p-6 md:p-10 bg-background flex flex-col min-h-[500px]">

          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif font-bold text-2xl text-primary capitalize">
              {date ? `${capitalize(format(date, "EEEE", { locale: es }))}, ${format(date, "d", { locale: es })} de ${capitalize(format(date, "MMMM", { locale: es }))}` : 'Selecciona una fecha'}
            </h2>
            {loading && <span className="text-xs text-muted-foreground animate-pulse font-medium">Actualizando...</span>}
          </div>

          {slots.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-secondary rounded-xl opacity-60">
              <Clock className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Sin horarios disponibles.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Morning */}
              {morningSlots.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Mañana <span className="h-px w-full bg-border flex-1 inline-block opacity-50" />
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {morningSlots.map(slot => (
                      <TimeSlotButton
                        key={slot.time}
                        slot={slot}
                        selected={selectedTime === slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Afternoon */}
              {afternoonSlots.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Tarde <span className="h-px w-full bg-border flex-1 inline-block opacity-50" />
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {afternoonSlots.map(slot => (
                      <TimeSlotButton
                        key={slot.time}
                        slot={slot}
                        selected={selectedTime === slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Continue Action */}
          <div className="mt-auto pt-10 flex justify-end">
            <Button
              size="lg"
              className={cn(
                "rounded-full px-8 h-12 text-base shadow-lg transition-all duration-300",
                selectedTime ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
              )}
              onClick={handleContinue}
            >
              Confirmar Reserva <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

        </div>
      </div>
    </Card>
  )
}

function TimeSlotButton({ slot, selected, onClick }: { slot: TimeSlot, selected: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!slot.available}
      className={cn(
        "relative h-12 w-full rounded-xl border text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.05] z-10"
          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-secondary/30",
        !slot.available && "opacity-30 cursor-not-allowed bg-secondary/50 border-transparent hover:border-transparent hover:bg-secondary/50"
      )}
    >
      {slot.time}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white shadow-sm">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  )
}
