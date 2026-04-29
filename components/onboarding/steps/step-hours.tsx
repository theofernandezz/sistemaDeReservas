'use client'

import Switch from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Timer, Info } from 'lucide-react'

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
      {/* Interval Selector Card */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Timer size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Intervalo entre turnos</h3>
              <p className="text-sm text-muted-foreground">
                Cada cuánto pueden agendar tus clientes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {INTERVAL_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleIntervalChange(option.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${data.slotInterval === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
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
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Horarios por día</h3>
            <p className="text-sm text-muted-foreground">Activá los días que atendés y definí los horarios</p>
          </div>
        </div>

        {data.schedule.map((day) => (
          <div
            key={day.dayOfWeek}
            className={`bg-card border border-border/60 rounded-xl p-4 transition-all shadow-sm ${!day.isOpen ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Day Toggle */}
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:w-40">
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
                  <span className="sm:hidden text-sm text-muted-foreground italic">Cerrado</span>
                )}
              </div>

              {/* Time Selectors */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  <Select
                    value={day.startTime}
                    onValueChange={(value) => handleTimeChange(day.dayOfWeek, 'startTime', value)}
                  >
                    <SelectTrigger className="w-28 h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm font-medium">a</span>
                  <Select
                    value={day.endTime}
                    onValueChange={(value) => handleTimeChange(day.dayOfWeek, 'endTime', value)}
                  >
                    <SelectTrigger className="w-28 h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getEndTimeOptions(day.startTime).map(time => (
                        <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="hidden sm:inline-block text-sm text-muted-foreground italic">Cerrado</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Estos son tus horarios base. Podrás bloquear días específicos
          (vacaciones, feriados) desde el panel de control.
        </p>
      </div>
    </div>
  )
}
