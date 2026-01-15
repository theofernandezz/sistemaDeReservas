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
const INTERVAL_OPTIONS = [15, 30, 45, 60]
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
          <h2 className="text-xl font-bold text-foreground">Tu disponibilidad</h2>
          <p className="text-sm text-muted-foreground mt-1">Configura tus horarios de atención</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || (!hasChanges && !saved)} 
          className={cn(
            'min-w-32 transition-all',
            !hasChanges && !saved && 'opacity-50'
          )}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <Check size={16} className="mr-2" />
              Guardado
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Interval Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Clock size={16} className="text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Intervalo</p>
              <p className="text-xs text-muted-foreground">Entre turnos</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setInterval(opt); setSaved(false); setHasChanges(true) }}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium transition-all text-center',
                  opt === interval 
                    ? 'bg-purple-500 text-white shadow-md' 
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {opt}m
              </button>
            ))}
          </div>
        </div>

        {/* Buffer Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Coffee size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Buffer</p>
              <p className="text-xs text-muted-foreground">Tiempo extra</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BUFFER_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setBuffer(opt); setSaved(false); setHasChanges(true) }}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium transition-all text-center',
                  opt === buffer 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {opt}m
              </button>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Sun size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Resumen</p>
              <p className="text-xs text-muted-foreground">Stats</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Días activos</span>
              <span className="font-medium text-foreground">{stats.activeDays}/7</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horas/semana</span>
              <span className="font-medium text-pink-500">{stats.weeklyHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cap. semanal</span>
              <span className="font-medium text-primary">~{stats.weeklyCapacity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div>
        <div className="mb-5">
          <h3 className="font-semibold text-foreground text-lg">Horarios de atención</h3>
          <p className="text-sm text-muted-foreground mt-1">Configura qué días y horarios trabajas</p>
        </div>

        <div className="space-y-3">
          {DAY_ORDER.map(day => {
            const daySchedule = schedule[day]
            const isOpen = daySchedule?.isOpen ?? false
            const hasBreaks = (daySchedule?.breaks?.length ?? 0) > 0

            return (
              <div
                key={day}
                className={cn(
                  'bg-card border border-border rounded-xl p-5 transition-opacity',
                  !isOpen && 'opacity-50'
                )}
              >
                {/* Main row */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Day toggle */}
                  <button
                    onClick={() => handleScheduleChange(day, 'isOpen', !isOpen)}
                    className={cn(
                      'h-11 w-11 rounded-full flex items-center justify-center transition-colors shrink-0',
                      isOpen ? 'bg-purple-500/20' : 'bg-secondary'
                    )}
                  >
                    <Sun size={18} className={cn(isOpen ? 'text-purple-500' : 'text-muted-foreground')} />
                  </button>
                  
                  <div className="w-24 shrink-0">
                    <p className="font-medium text-foreground">{DAY_NAMES[day]}</p>
                    <p className="text-xs text-muted-foreground">{isOpen ? 'Activo' : 'Cerrado'}</p>
                  </div>

                  {isOpen && (
                    <>
                      {/* Time inputs */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          value={daySchedule.startTime}
                          onChange={(e) => handleScheduleChange(day, 'startTime', e.target.value)}
                          className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <span className="text-muted-foreground">a</span>
                        <input
                          type="time"
                          value={daySchedule.endTime}
                          onChange={(e) => handleScheduleChange(day, 'endTime', e.target.value)}
                          className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => handleAddBreak(day)}
                          className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Agregar descanso"
                        >
                          <Coffee size={14} />
                        </button>
                        <button
                          onClick={() => handleCopyToAll(day)}
                          className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Copiar a todos los días"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Breaks */}
                {isOpen && hasBreaks && (
                  <div className="mt-3 pl-14 space-y-2">
                    {daySchedule.breaks?.map((brk, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <Coffee size={14} className="text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={brk.name}
                          onChange={(e) => handleUpdateBreak(day, idx, 'name', e.target.value)}
                          className="w-24 px-2 py-1 rounded-md bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex items-center gap-2 bg-secondary/30 rounded-lg px-2 py-1">
                          <input
                            type="time"
                            value={brk.start}
                            onChange={(e) => handleUpdateBreak(day, idx, 'start', e.target.value)}
                            className="bg-transparent text-sm text-foreground focus:outline-none w-20"
                          />
                        </div>
                        <span className="text-muted-foreground text-sm">-</span>
                        <div className="flex items-center gap-2 bg-secondary/30 rounded-lg px-2 py-1">
                          <input
                            type="time"
                            value={brk.end}
                            onChange={(e) => handleUpdateBreak(day, idx, 'end', e.target.value)}
                            className="bg-transparent text-sm text-foreground focus:outline-none w-20"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveBreak(day, idx)}
                          className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                        >
                          <Trash2 size={12} />
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
      <div className="bg-secondary/30 rounded-xl p-4 text-sm text-muted-foreground">
        <p>
          <strong>💡 Tip:</strong> Usa el botón de copiar para aplicar el mismo horario a todos los días. 
          Agrega descansos para bloquear horarios de almuerzo u otras pausas.
        </p>
      </div>
    </div>
  )
}
