'use client'

import { useState } from 'react'
import { AlertTriangle, Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react'
import { getRescheduleSlotsByToken } from '@/app/actions/manage-slots'
import { rescheduleAppointmentByToken } from '@/app/actions/manage-appointment'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RescheduleDateOption } from './manage-actions'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.'

interface ReschedulePanelProps {
  token: string
  dateOptions: RescheduleDateOption[]
  onDone: () => void
  onBack: () => void
}

export default function ReschedulePanel({ token, dateOptions, onDone, onBack }: ReschedulePanelProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    setSelectedTime('')
    setSlots([])
    setError('')
    setLoadingSlots(true)
    try {
      const result = await getRescheduleSlotsByToken({ token, date })
      if (result.success) {
        setSlots(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError(UNEXPECTED_ERROR)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return
    setConfirming(true)
    setError('')
    try {
      const result = await rescheduleAppointmentByToken({ token, date: selectedDate, time: selectedTime })
      if (result.success) {
        onDone()
        return
      }
      setError(result.error)
      // The slot may have just been taken: refresh the list so the user can pick another.
      if (result.code === 'SLOT_UNAVAILABLE') {
        void handleDateSelect(selectedDate).then(() => setError(result.error))
      }
    } catch {
      setError(UNEXPECTED_ERROR)
    } finally {
      setConfirming(false)
    }
  }

  const busy = loadingSlots || confirming

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={confirming}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Volver atrás
      </Button>

      {error && (
        <div
          role="alert"
          className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-medium flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" aria-hidden="true" />
          Elegí una fecha
        </h2>
        <div role="group" aria-label="Fechas disponibles" className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleDateSelect(option.value)}
              disabled={busy}
              aria-pressed={selectedDate === option.value}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                'hover:border-primary hover:bg-primary/5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selectedDate === option.value && 'bg-primary text-primary-foreground border-primary hover:bg-primary'
              )}
            >
              <span className="text-xs capitalize opacity-80">{option.weekday}</span>
              <span className="font-medium capitalize">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
            Elegí un horario
          </h2>

          {loadingSlots ? (
            <div className="flex items-center justify-center p-8" role="status" aria-label="Cargando horarios">
              <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-center p-6 text-sm text-muted-foreground">
              No hay horarios disponibles para esta fecha. Probá con otro día.
            </p>
          ) : (
            <div role="group" aria-label="Horarios disponibles" className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
              {slots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    setSelectedTime(time)
                    setError('')
                  }}
                  disabled={confirming}
                  aria-pressed={selectedTime === time}
                  className={cn(
                    'p-3 rounded-lg border transition-all font-medium',
                    'hover:border-primary hover:bg-primary/5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    selectedTime === time && 'bg-primary text-primary-foreground border-primary hover:bg-primary'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full h-12 text-base font-medium"
        onClick={handleConfirm}
        disabled={!selectedDate || !selectedTime || busy}
      >
        {confirming && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
        {confirming ? 'Confirmando...' : 'Confirmar nuevo horario'}
      </Button>
    </div>
  )
}
