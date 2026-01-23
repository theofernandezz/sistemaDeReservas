'use client'

import { useState, useEffect } from 'react'
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
import { getServices, createAppointment } from '@/app/actions'
import type { Service, CreateAppointmentInput, AppointmentWithService } from '@/types/database.types'

interface AddAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAppointmentCreated?: (appointment: AppointmentWithService) => void
  selectedDate?: Date
}

// Generate time slots from 8:00 to 20:00 with 30 minute intervals
function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 8; hour < 20; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
    slots.push(`${String(hour).padStart(2, '0')}:30`)
  }
  slots.push('20:00')
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function AddAppointmentDialog({
  open,
  onOpenChange,
  onAppointmentCreated,
  selectedDate: initialDate,
}: AddAppointmentDialogProps) {
  const [services, setServices] = useState<Service[]>([])
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

  // Update selectedDate when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      setCalendarMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
    }
  }, [initialDate])

  // Load services
  useEffect(() => {
    async function loadServices() {
      setLoadingServices(true)
      const result = await getServices()
      if (result.success && result.data) {
        setServices(result.data)
        if (result.data.length > 0) {
          setSelectedServiceId(result.data[0].id)
        }
      }
      setLoadingServices(false)
    }

    if (open) {
      loadServices()
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
      <DialogContent className="sm:max-w-125 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo turno manual
          </DialogTitle>
          <DialogDescription>
            Agregá un turno manualmente para un cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Servicio *</Label>
            {loadingServices ? (
              <div className="h-9 flex items-center justify-center bg-secondary/50 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Seleccioná un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {service.duration_minutes} min • ${service.price.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedService && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Duración: {selectedService.duration_minutes} minutos
              </p>
            )}
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <div className="border border-input rounded-md p-2 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary transition-colors"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium capitalize text-foreground">
                    {monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary transition-colors"
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
                  className="mx-auto"
                  classNames={{
                    nav: 'hidden',
                    month_caption: 'hidden',
                    caption_label: 'hidden'
                  }}
                />
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Seleccioná una hora" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDate && (
                <p className="text-xs text-muted-foreground">
                  {selectedDate.toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del cliente *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej: María García"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Ej: maria@email.com"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingServices}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear turno
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
