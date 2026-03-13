'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Plus, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { getServices, createAppointment, getBusinessSettings } from '@/app/actions'
import type { Service, CreateAppointmentInput, AppointmentWithService, BusinessSettings } from '@/types/database.types'

interface AddAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAppointmentCreated?: (appointment: AppointmentWithService) => void
  selectedDate?: Date
}

function generateTimeSlotsForDay(date: Date, settings: BusinessSettings): string[] {
  const dayOfWeek = date.getDay()
  const dayHours = settings.businessHours?.find(h => h.dayOfWeek === dayOfWeek)

  let startMinutes = 8 * 60
  let endMinutes = 20 * 60
  const interval = settings.slotInterval ?? 30

  if (dayHours) {
    if (!dayHours.isOpen) return []
    const [startH, startM = 0] = dayHours.startTime.split(':').map(Number)
    const [endH, endM = 0] = dayHours.endTime.split(':').map(Number)
    startMinutes = startH * 60 + startM
    endMinutes = endH * 60 + endM
  }

  const breaks = (dayHours?.breaks ?? []).map(b => {
    const [bsh, bsm = 0] = b.start.split(':').map(Number)
    const [beh, bem = 0] = b.end.split(':').map(Number)
    return { start: bsh * 60 + bsm, end: beh * 60 + bem }
  })

  const slots: string[] = []
  for (let min = startMinutes; min <= endMinutes; min += interval) {
    const inBreak = breaks.some(b => min >= b.start && min < b.end)
    if (!inBreak) {
      const h = Math.floor(min / 60)
      const m = min % 60
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

export function AddAppointmentDialog({
  open,
  onOpenChange,
  onAppointmentCreated,
  selectedDate: initialDate,
}: AddAppointmentDialogProps) {
  const [services, setServices] = useState<Service[]>([])
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({})
  const [loadingServices, setLoadingServices] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    new Date((initialDate || new Date()).getFullYear(), (initialDate || new Date()).getMonth(), 1)
  )
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  // Time slots derived from business hours for the selected day
  const timeSlots = useMemo(
    () => generateTimeSlotsForDay(selectedDate ?? new Date(), businessSettings),
    [selectedDate, businessSettings]
  )

  // Clear selected time if it's no longer in the available slots
  useEffect(() => {
    if (selectedTime && !timeSlots.includes(selectedTime)) {
      setSelectedTime('')
    }
  }, [timeSlots, selectedTime])

  // Update selectedDate when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      setCalendarMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
    }
  }, [initialDate])

  // Load services and business settings
  useEffect(() => {
    async function loadData() {
      setLoadingServices(true)
      const [servicesResult, settingsResult] = await Promise.all([
        getServices(),
        getBusinessSettings(),
      ])
      if (servicesResult.success && servicesResult.data) {
        setServices(servicesResult.data)
        if (servicesResult.data.length > 0) {
          setSelectedServiceId(servicesResult.data[0].id)
        }
      }
      if (settingsResult.success && settingsResult.data) {
        setBusinessSettings(settingsResult.data)
      }
      setLoadingServices(false)
    }

    if (open) {
      loadData()
    }
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null)
      setClientName('')
      setClientPhone('')
      setClientEmail('')
      setSelectedTime('')
      setSelectedDate(initialDate || new Date())
      const nextDate = initialDate || new Date()
      setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
    }
  }, [open, initialDate])

  const monthLabel = calendarMonth.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric'
  })

  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Get selected service
  const selectedService = services.find(s => s.id === selectedServiceId)

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedServiceId || !selectedDate || !selectedTime || !clientName.trim()) {
      setError('Por favor completá todos los campos requeridos')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Calculate start and end times
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startTime = new Date(selectedDate)
      startTime.setHours(hours, minutes, 0, 0)

      const durationMinutes = selectedService?.duration_minutes || 60
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

      const appointmentData: CreateAppointmentInput = {
        service_id: selectedServiceId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_email: clientEmail.trim() || null,
        status: 'confirmed', // Manual appointments are auto-confirmed
      }

      const result = await createAppointment(appointmentData)

      if (result.success && result.data) {
        // Create the appointment with service for callback
        const appointmentWithService: AppointmentWithService = {
          ...result.data,
          service: selectedService as Service,
          addons: [],
        }
        onAppointmentCreated?.(appointmentWithService)
        onOpenChange(false)
      } else {
        setError(result.error || 'Error al crear el turno')
      }
    } catch (err) {
      setError('Error inesperado al crear el turno')
      console.error('Error creating appointment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-card/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border/50 bg-background/50">
          <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <Plus className="h-5 w-5 text-primary" />
            Nuevo turno manual
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1.5">
            Agendá un turno rápidamente para un cliente seleccionando el servicio y horario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-0 overflow-y-auto max-h-[75vh] space-y-6">
          {/* Section 1: Service Selection */}
          <div className="bg-secondary/20 border border-border/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
              <h3 className="text-sm font-semibold text-foreground">Detalles del Servicio</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service" className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Servicio *</Label>
              {loadingServices ? (
                <div className="h-10 flex items-center justify-center bg-secondary/50 rounded-lg border border-border/50">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedServiceId}
                  onValueChange={setSelectedServiceId}
                >
                  <SelectTrigger id="service" className="h-12 bg-background border-border hover:border-border/80 transition-colors">
                    <SelectValue placeholder="Seleccioná un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-4 w-full pr-2">
                          <span className="font-medium text-foreground">{service.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duration_minutes} min
                            </span>
                            <span className="text-foreground font-medium text-sm">
                              ${service.price.toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Section 2: Date and Time Selection */}
          <div className="bg-secondary/20 border border-border/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</div>
              <h3 className="text-sm font-semibold text-foreground">Fecha y Hora</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Fecha *</Label>
                <div className="border border-border/50 rounded-lg p-2 bg-background shadow-sm">
                  <div className="flex items-center justify-between mb-2 px-1 pt-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="h-7 w-7 flex items-center justify-center rounded-md border border-border/50 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Mes anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium capitalize text-foreground tracking-tight">
                      {monthLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="h-7 w-7 flex items-center justify-center rounded-md border border-border/50 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Mes siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="mx-auto w-full [&_table]:w-full"
                    classNames={{
                      nav: 'hidden',
                      month_caption: 'hidden',
                      caption_label: 'hidden',
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md shadow-primary/20",
                      day_today: "bg-secondary text-foreground"
                    }}
                  />
                </div>
              </div>

              {/* Time */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Hora De Inicio *</Label>
                  {timeSlots.length === 0 ? (
                    <div className="h-12 flex items-center px-3 rounded-md border border-border bg-secondary/30 text-sm text-muted-foreground">
                      Este día no tiene horario de atención configurado
                    </div>
                  ) : (
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger id="time" className="h-12 bg-background border-border hover:border-border/80 transition-colors">
                        <SelectValue placeholder="Seleccioná una hora" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {time}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedTime && selectedDate && selectedService && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-sm font-medium text-primary">Resumen del horario</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                        {selectedDate.toLocaleDateString('es-AR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p className="text-sm text-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                        {selectedTime} a {
                          (() => {
                            const [h, m] = selectedTime.split(':').map(Number);
                            const endD = new Date();
                            endD.setHours(h, m + selectedService.duration_minutes);
                            return `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
                          })()
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Client Information */}
          <div className="bg-secondary/20 border border-border/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</div>
              <h3 className="text-sm font-semibold text-foreground">Datos del Cliente</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Nombre del cliente *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: María García"
                  className="h-11 bg-background border-border"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientPhone" className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Teléfono</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ej: 11 1234-5678"
                    className="h-11 bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientEmail" className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Email <span className="text-muted-foreground/50 lowercase normal-case text-[10px] ml-1">(opcional)</span></Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Ej: maria@email.com"
                    className="h-11 bg-background border-border"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm font-medium text-destructive animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="sticky bottom-0 pt-4 pb-6 items-center border-t border-border/50 bg-background/90 backdrop-blur-xl mt-4 -mx-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="w-full sm:w-auto h-11 px-6 rounded-lg hover:bg-secondary/80 transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingServices}
              className="w-full sm:w-auto h-11 px-8 rounded-lg shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Turno
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
