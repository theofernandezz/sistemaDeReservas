'use client'

import Switch from '@/components/ui/switch'
import { Clock } from 'lucide-react'

interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isOpen: boolean
  startTime: string
  endTime: string
}

export interface HoursData {
  schedule: DaySchedule[]
  slotInterval: number
}

interface StepHoursProps {
  data: HoursData
  onChange: (data: HoursData) => void
}

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
]

export default function StepHours({ data, onChange }: StepHoursProps) {
  const handleToggleDay = (dayOfWeek: number) => {
    onChange({
      ...data,
      schedule: data.schedule.map(day =>
        day.dayOfWeek === dayOfWeek ? { ...day, isOpen: !day.isOpen } : day
      ),
    })
  }

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    onChange({
      ...data,
      schedule: data.schedule.map(day =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      ),
    })
  }

  const handleIntervalChange = (value: number) => {
    onChange({ ...data, slotInterval: value })
  }

  // Generate time options
  const timeOptions: string[] = []
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }

  // Filter end time options to only show times after start time
  const getEndTimeOptions = (startTime: string): string[] => {
    const [startH, startM] = startTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM

    return timeOptions.filter(time => {
      const [h, m] = time.split(':').map(Number)
      const timeMinutes = h * 60 + m
      return timeMinutes > startMinutes
    })
  }

  return (
    <div className="space-y-6">
      {/* Interval Selector */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-medium text-foreground">Intervalo entre turnos</h3>
            <p className="text-sm text-muted-foreground">
              Cada cuánto pueden agendar tus clientes
            </p>
          </div>
          <div className="flex gap-2">
            {INTERVAL_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleIntervalChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${data.slotInterval === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
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

        {data.schedule.map((day) => (
          <div
            key={day.dayOfWeek}
            className={`bg-card border rounded-xl p-4 transition-opacity ${!day.isOpen ? 'opacity-50' : ''}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Day Toggle */}
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:min-w-[140px]">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={() => handleToggleDay(day.dayOfWeek)}
                  />
                  <span className={`font-medium ${day.isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {day.dayName}
                  </span>
                </div>
                {!day.isOpen && (
                  <span className="sm:hidden text-xs text-muted-foreground italic">Cerrado</span>
                )}
              </div>

              {/* Time Selectors */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  <Clock size={16} className="text-muted-foreground shrink-0" />
                  <select
                    value={day.startTime}
                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-muted/50 border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {timeOptions.map(time => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-sm">a</span>
                  <select
                    value={day.endTime}
                    onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-muted/50 border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {getEndTimeOptions(day.startTime).map(time => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="hidden sm:inline-block text-sm text-muted-foreground italic">Cerrado</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground">
        <p>
          💡 <strong>Tip:</strong> Estos son tus horarios base. Podrás bloquear días específicos
          (vacaciones, feriados) desde el panel de control.
        </p>
      </div>
    </div>
  )
}
