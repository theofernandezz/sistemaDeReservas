'use client'

import { useState } from 'react'
import { Clock, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Switch from '@/components/ui/switch'

interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isOpen: boolean
  startTime: string
  endTime: string
}

interface AvailabilityConfig {
  schedule: DaySchedule[]
  slotInterval: number // in minutes
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, dayName: 'Martes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, startTime: '10:00', endTime: '14:00' },
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, startTime: '10:00', endTime: '14:00' },
]

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
]

interface AvailabilityManagerProps {
  initialSchedule?: DaySchedule[]
  initialInterval?: number
  onSave: (config: AvailabilityConfig) => Promise<boolean>
}

export default function AvailabilityManager({ initialSchedule, initialInterval = 30, onSave }: AvailabilityManagerProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule || DEFAULT_SCHEDULE)
  const [slotInterval, setSlotInterval] = useState<number>(initialInterval)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek ? { ...day, isOpen: !day.isOpen } : day
    ))
    setSaved(false)
  }

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    ))
    setSaved(false)
  }

  const handleIntervalChange = (value: number) => {
    setSlotInterval(value)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const success = await onSave({ schedule, slotInterval })
    setSaving(false)
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const timeOptions: string[] = []
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      timeOptions.push(time)
    }
  }

  return (
    <div className="space-y-6">
      {/* Slot Interval Selector */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-medium text-foreground">Intervalo entre turnos</h3>
            <p className="text-sm text-muted-foreground">
              Cada cuánto tiempo se puede agendar una cita
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {INTERVAL_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleIntervalChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${slotInterval === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Horarios por día</h3>
        {schedule.map((day) => (
          <div
            key={day.dayOfWeek}
            className={`bg-card p-4 rounded-xl border border-border shadow-sm transition-opacity ${!day.isOpen ? 'opacity-50' : ''
              }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Day toggle */}
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:min-w-37.5">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={() => handleToggleDay(day.dayOfWeek)}
                  />
                  <span className={`font-medium ${day.isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {day.dayName}
                  </span>
                </div>
                {/* Mobile status indicator for closed days */}
                {!day.isOpen && (
                  <span className="sm:hidden text-xs text-muted-foreground italic">Cerrado</span>
                )}
              </div>

              {/* Time selectors */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 pl-13 sm:pl-0">
                  <Clock size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2">
                    <select
                      value={day.startTime}
                      onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                      className="px-2 sm:px-3 py-1.5 rounded-lg bg-secondary/30 border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {timeOptions.map(time => (
                        <option key={`start-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                    <span className="text-muted-foreground text-sm">a</span>
                    <select
                      value={day.endTime}
                      onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                      className="px-2 sm:px-3 py-1.5 rounded-lg bg-secondary/30 border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {timeOptions.map(time => (
                        <option key={`end-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <span className="hidden sm:inline-block text-sm text-muted-foreground italic">Cerrado</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-35"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              ✓ Guardado
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Info */}
      <div className="bg-secondary/30 rounded-xl p-4 text-sm text-muted-foreground">
        <p>
          <strong>💡 Tip:</strong> El intervalo entre turnos determina cada cuánto mostrar opciones de horario.
          Por ejemplo, con 30 minutos verás: 9:00, 9:30, 10:00, etc. Los días cerrados no mostrarán ningún horario.
        </p>
      </div>
    </div>
  )
}
