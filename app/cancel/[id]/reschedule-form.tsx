'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { rescheduleAppointment, getAvailableSlots } from '@/app/actions'
import { Loader2, AlertTriangle, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TimeSlot } from '@/types/database.types'

interface RescheduleFormProps {
  appointmentId: string
  serviceId: string
  serviceDuration: number
  teamMemberId?: string
}

const STATUSES = {
  Idle: 'idle',
  SelectingDate: 'selecting-date',
  SelectingTime: 'selecting-time',
  Confirming: 'confirming',
  Success: 'success',
  Error: 'error'
} as const

type Status = typeof STATUSES[keyof typeof STATUSES]

export default function RescheduleForm({
  appointmentId,
  serviceId,
  serviceDuration,
  teamMemberId
}: RescheduleFormProps) {
  const [status, setStatus] = useState<Status>(STATUSES.Idle)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Generate next 30 days for selection
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i + 1) // Start from tomorrow
    return date
  })

  const handleDateSelect = async (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setSelectedTime('')
    setError('')
    setLoadingSlots(true)
    setStatus(STATUSES.SelectingTime)

    try {
      const result = await getAvailableSlots(serviceId, dateStr, undefined, teamMemberId ?? 'any')
      if (result.success && result.data) {
        setAvailableSlots(result.data)
      } else {
        setError(result.error || 'Error al cargar horarios disponibles')
        setStatus(STATUSES.Error)
      }
    } catch {
      setError('Ocurrió un error inesperado')
      setStatus(STATUSES.Error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setError('')
  }

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Por favor seleccioná fecha y horario')
      return
    }

    setIsConfirming(true)
    setError('')

    try {
      // Calculate start and end times
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = selectedTime.split(':').map(Number)

      const startTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
      const endTime = new Date(startTime.getTime() + serviceDuration * 60 * 1000)

      const result = await rescheduleAppointment(
        appointmentId,
        startTime.toISOString(),
        endTime.toISOString()
      )

      if (result.success) {
        setStatus(STATUSES.Success)
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setError(result.error || 'Error al reprogramar')
        setStatus(STATUSES.Error)
      }
    } catch {
      setError('Ocurrió un error inesperado')
      setStatus(STATUSES.Error)
    } finally {
      setIsConfirming(false)
    }
  }

  if (status === STATUSES.Success) {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-serif font-bold">¡Turno Reprogramado!</h3>
            <p className="text-muted-foreground">
              Tu turno fue reprogramado exitosamente para el {new Date(selectedDate).toLocaleDateString('es-AR')} a las {selectedTime}hs
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === STATUSES.Idle) {
    return (
      <div className="space-y-4">
        <Button
          variant="default"
          className="w-full h-12 text-base font-medium shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
          onClick={() => setStatus(STATUSES.SelectingDate)}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Seleccionar Nueva Fecha
        </Button>
        <p className="text-xs text-center text-muted-foreground/80">
          Podés reprogramar tu turno sin cargo
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Date Selection */}
      {status === STATUSES.SelectingDate && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Seleccioná una fecha
            </h3>
            <p className="text-sm text-muted-foreground">
              Elegí el día para tu nuevo turno
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {availableDates.map((date) => {
              const dateStr = date.toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short'
              })
              const dayName = date.toLocaleDateString('es-AR', { weekday: 'short' })

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateSelect(date)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <span className="text-xs text-muted-foreground capitalize">{dayName}</span>
                  <span className="font-medium capitalize">{dateStr}</span>
                </button>
              )
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setStatus(STATUSES.Idle)}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Time Selection */}
      {status === STATUSES.SelectingTime && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Seleccioná un horario
              </h3>
              <Badge variant="outline" className="text-xs">
                {new Date(selectedDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Horarios disponibles para el día seleccionado
            </p>
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No hay horarios disponibles para esta fecha
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {availableSlots
                .filter(slot => slot.available)
                .map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleTimeSelect(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      "p-3 rounded-lg border transition-all font-medium",
                      "hover:border-primary hover:bg-primary/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedTime === slot.time && "bg-primary text-primary-foreground border-primary"
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatus(STATUSES.SelectingDate)
                setSelectedTime('')
              }}
              disabled={isConfirming}
              className="flex-1"
            >
              Volver
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmReschedule}
              disabled={!selectedTime || isConfirming}
              className="flex-1"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Confirmando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
