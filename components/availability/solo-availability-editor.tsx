'use client'

import { useState } from 'react'
import { Sun, Clock, Coffee, Copy, Trash2, Save, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WeeklySchedule, DaySchedule, DayBreak } from '@/types/database.types'

interface SoloAvailabilityEditorProps {
  initialSchedule: WeeklySchedule
  initialInterval: number
  initialBuffer: number
  onSave: (data: { schedule: WeeklySchedule; interval: number; buffer: number }) => Promise<boolean>
}

const DAY_NAMES: Record<string, string> = {
  '0': 'Domingo',
  '1': 'Lunes',
  '2': 'Martes',
  '3': 'Miércoles',
  '4': 'Jueves',
  '5': 'Viernes',
  '6': 'Sábado',
}

const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0']
const INTERVAL_OPTIONS = [15, 30, 45, 60, 90]
const BUFFER_OPTIONS = [0, 5, 10, 15]

// Calculate stats
function calculateStats(schedule: WeeklySchedule, interval: number): { activeDays: number; slotsPerDay: number; weeklyCapacity: number; weeklyHours: number } {
  let activeDays = 0
  let totalMinutes = 0

  DAY_ORDER.forEach(day => {
    const daySchedule = schedule[day]
    if (daySchedule?.isOpen) {
      activeDays++
      const start = daySchedule.startTime.split(':').map(Number)
      const end = daySchedule.endTime.split(':').map(Number)
      let dayMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
      
      daySchedule.breaks?.forEach(b => {
        const bStart = b.start.split(':').map(Number)
        const bEnd = b.end.split(':').map(Number)
        dayMinutes -= (bEnd[0] * 60 + bEnd[1]) - (bStart[0] * 60 + bStart[1])
      })
      
      totalMinutes += Math.max(0, dayMinutes)
    }
  })

  const avgMinutesPerDay = activeDays > 0 ? totalMinutes / activeDays : 0
  const slotsPerDay = Math.floor(avgMinutesPerDay / interval)
  const weeklyCapacity = Math.floor(totalMinutes / interval)
  const weeklyHours = Math.round(totalMinutes / 60)

  return { activeDays, slotsPerDay, weeklyCapacity, weeklyHours }
}

export default function SoloAvailabilityEditor({
  initialSchedule,
  initialInterval,
  initialBuffer,
  onSave,
}: SoloAvailabilityEditorProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule)
  const [interval, setInterval] = useState(initialInterval)
  const [buffer, setBuffer] = useState(initialBuffer)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const stats = calculateStats(schedule, interval)

  const handleScheduleChange = (day: string, field: keyof DaySchedule, value: boolean | string | DayBreak[]) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
    setSaved(false)
    setHasChanges(true)
  }

  const handleAddBreak = (day: string) => {
    const daySchedule = schedule[day]
    const newBreak: DayBreak = { name: 'Descanso', start: '13:00', end: '14:00' }
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...daySchedule,
        breaks: [...(daySchedule.breaks || []), newBreak]
      }
    }))
    setSaved(false)
    setHasChanges(true)
  }

  const handleUpdateBreak = (day: string, breakIndex: number, field: keyof DayBreak, value: string) => {
    const daySchedule = schedule[day]
    const newBreaks = [...(daySchedule.breaks || [])]
    newBreaks[breakIndex] = { ...newBreaks[breakIndex], [field]: value }
    setSchedule(prev => ({
      ...prev,
      [day]: { ...daySchedule, breaks: newBreaks }
    }))
    setSaved(false)
    setHasChanges(true)
  }

  const handleRemoveBreak = (day: string, breakIndex: number) => {
    const daySchedule = schedule[day]
    const newBreaks = (daySchedule.breaks || []).filter((_, i) => i !== breakIndex)
    setSchedule(prev => ({
      ...prev,
      [day]: { ...daySchedule, breaks: newBreaks }
    }))
    setSaved(false)
    setHasChanges(true)
  }

  const handleCopyToAll = (day: string) => {
    const sourceDay = schedule[day]
    const newSchedule = { ...schedule }
    DAY_ORDER.forEach(d => {
      if (d !== day) {
        newSchedule[d] = { ...sourceDay, breaks: sourceDay.breaks ? [...sourceDay.breaks] : [] }
      }
    })
    setSchedule(newSchedule)
    setSaved(false)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const success = await onSave({ schedule, interval, buffer })
    setSaving(false)
    if (success) {
      setSaved(true)
      setHasChanges(false)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Tu disponibilidad</h2>
          <p className="text-sm text-muted-foreground mt-1">Configura tus horarios de atención semanales.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || (!hasChanges && !saved)}
          className={cn(
            'min-w-28',
            !hasChanges && !saved && 'opacity-60 bg-secondary text-muted-foreground hover:bg-secondary'
          )}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <Check size={16} className="mr-2 text-emerald-600" />
              Guardado
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Interval Card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
              <Clock size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Intervalo</p>
              <p className="text-xs text-muted-foreground">Entre turnos</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setInterval(opt); setSaved(false); setHasChanges(true) }}
                className={cn(
                  'py-1.5 rounded-lg text-[13px] font-medium transition-colors text-center border',
                  opt === interval
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground border-transparent'
                )}
              >
                {opt}m
              </button>
            ))}
          </div>
        </div>

        {/* Buffer Card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
              <Coffee size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Buffer</p>
              <p className="text-xs text-muted-foreground">Tiempo extra</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {BUFFER_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setBuffer(opt); setSaved(false); setHasChanges(true) }}
                className={cn(
                  'py-1.5 rounded-lg text-[13px] font-medium transition-colors text-center border',
                  opt === buffer
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground border-transparent'
                )}
              >
                {opt === 0 ? 'Sin' : `${opt}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
              <Sun size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Resumen</p>
              <p className="text-xs text-muted-foreground">Estadísticas semanales</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-secondary rounded-md px-3 py-1.5">
              <span className="text-muted-foreground text-xs font-medium">Días activos</span>
              <span className="font-semibold text-foreground">{stats.activeDays}/7</span>
            </div>
            <div className="flex justify-between items-center bg-secondary rounded-md px-3 py-1.5">
              <span className="text-muted-foreground text-xs font-medium">Horas/semana</span>
              <span className="font-semibold text-foreground">{stats.weeklyHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="mb-5">
          <h3 className="font-semibold text-foreground text-base">Días de trabajo</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Configura qué días y horarios trabajas</p>
        </div>

        <div className="space-y-2">
          {DAY_ORDER.map(day => {
            const daySchedule = schedule[day]
            const isOpen = daySchedule?.isOpen ?? false
            const hasBreaks = (daySchedule?.breaks?.length ?? 0) > 0

            return (
              <div
                key={day}
                className={cn(
                  'group border rounded-lg p-3 sm:px-4 transition-colors',
                  isOpen
                    ? 'bg-card border-border'
                    : 'bg-muted/50 border-border/50'
                )}
              >
                {/* Main row */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {/* Day Info & Toggle */}
                  <div className="flex items-center gap-3 min-w-[130px]">
                    <button
                      onClick={() => handleScheduleChange(day, 'isOpen', !isOpen)}
                      className={cn(
                        'h-9 w-9 rounded-md flex items-center justify-center transition-colors shrink-0 border',
                        isOpen
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      <Sun size={16} />
                    </button>

                    <div>
                      <p className="font-medium text-foreground text-sm">{DAY_NAMES[day]}</p>
                      <p className={cn(
                        "text-xs font-medium",
                        isOpen ? "text-muted-foreground" : "text-muted-foreground/60"
                      )}>
                        {isOpen ? 'Disponible' : 'Cerrado'}
                      </p>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="flex-1 flex flex-wrap items-center justify-between gap-3">
                      {/* Time inputs */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-secondary rounded-lg px-3 py-1.5 border border-input focus-within:ring-1 focus-within:ring-ring transition-colors">
                          <input
                            type="time"
                            value={daySchedule.startTime}
                            onChange={(e) => handleScheduleChange(day, 'startTime', e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground focus:outline-none w-[95px] cursor-pointer"
                          />
                        </div>
                        <span className="text-muted-foreground text-sm">a</span>
                        <div className="flex items-center bg-secondary rounded-lg px-3 py-1.5 border border-input focus-within:ring-1 focus-within:ring-ring transition-colors">
                          <input
                            type="time"
                            value={daySchedule.endTime}
                            onChange={(e) => handleScheduleChange(day, 'endTime', e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground focus:outline-none w-[95px] cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddBreak(day)}
                          className="h-8 px-2.5 rounded-md bg-secondary flex items-center gap-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          title="Agregar descanso"
                        >
                          <Coffee size={14} className="text-muted-foreground" />
                          <span className="hidden sm:inline text-xs">Pausa</span>
                        </button>
                        <button
                          onClick={() => handleCopyToAll(day)}
                          className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Copiar horario a todos los días"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Breaks Section */}
                {isOpen && hasBreaks && (
                  <div className="mt-3 pt-3 border-t border-border pl-12 space-y-2">
                    {daySchedule.breaks?.map((brk, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-secondary px-2.5 py-1 rounded-md border border-input">
                          <Coffee size={13} className="text-muted-foreground" />
                          <input
                            type="text"
                            value={brk.name}
                            onChange={(e) => handleUpdateBreak(day, idx, 'name', e.target.value)}
                            className="w-20 bg-transparent text-xs font-medium focus:outline-none rounded-sm px-1 placeholder-muted-foreground"
                            placeholder="Descanso"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="bg-secondary rounded-md px-2 py-1 border border-input">
                            <input
                              type="time"
                              value={brk.start}
                              onChange={(e) => handleUpdateBreak(day, idx, 'start', e.target.value)}
                              className="bg-transparent text-sm font-medium text-foreground focus:outline-none w-[90px] cursor-pointer"
                            />
                          </div>
                          <span className="text-muted-foreground text-xs">-</span>
                          <div className="bg-secondary rounded-md px-2 py-1 border border-input">
                            <input
                              type="time"
                              value={brk.end}
                              onChange={(e) => handleUpdateBreak(day, idx, 'end', e.target.value)}
                              className="bg-transparent text-sm font-medium text-foreground focus:outline-none w-[90px] cursor-pointer"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveBreak(day, idx)}
                          className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-auto sm:ml-0"
                          title="Eliminar descanso"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-3">
        <div className="h-7 w-7 rounded-md bg-secondary flex shrink-0 items-center justify-center mt-0.5">
          <Sun size={14} className="text-muted-foreground" />
        </div>
        <p>
          <strong className="text-foreground">Tip:</strong> Usa el botón de copiar para aplicar el mismo horario a todos los días.
          Agrega descansos para bloquear rápidamente la hora de la comida u otras pausas diarias.
        </p>
      </div>
    </div>
  )
}
