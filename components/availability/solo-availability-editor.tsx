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
          <h2 className="text-xl font-bold tracking-tight text-foreground">Tu disponibilidad</h2>
          <p className="text-sm text-muted-foreground/80 mt-1">Configura tus horarios de atención semanales.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || (!hasChanges && !saved)} 
          className={cn(
            'min-w-32 transition-all shadow-sm',
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
              <Check size={16} className="mr-2 text-emerald-500" />
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

      {/* Settings Cards (Glassmorphic) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Interval Card */}
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
              <Clock size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm tracking-tight">Intervalo</p>
              <p className="text-xs text-muted-foreground/80">Entre turnos</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setInterval(opt); setSaved(false); setHasChanges(true) }}
                className={cn(
                  'py-2 rounded-xl text-[13px] font-semibold transition-all text-center border',
                  opt === interval 
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-inner' 
                    : 'bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent'
                )}
              >
                {opt}m
              </button>
            ))}
          </div>
        </div>

        {/* Buffer Card */}
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <Coffee size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm tracking-tight">Buffer</p>
              <p className="text-xs text-muted-foreground/80">Tiempo extra</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {BUFFER_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setBuffer(opt); setSaved(false); setHasChanges(true) }}
                className={cn(
                  'py-2 rounded-xl text-[13px] font-semibold transition-all text-center border',
                  opt === buffer 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-inner' 
                    : 'bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent'
                )}
              >
                {opt === 0 ? 'Sin' : `${opt}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
              <Sun size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm tracking-tight">Resumen</p>
              <p className="text-xs text-muted-foreground/80">Estadísticas semanales</p>
            </div>
          </div>
          <div className="space-y-2 text-sm mt-auto">
            <div className="flex justify-between items-center bg-background/50 rounded-md px-2.5 py-1.5 border border-white/5">
              <span className="text-muted-foreground/80 text-xs font-medium">Días activos</span>
              <span className="font-semibold text-foreground">{stats.activeDays}/7</span>
            </div>
            <div className="flex justify-between items-center bg-background/50 rounded-md px-2.5 py-1.5 border border-white/5">
              <span className="text-muted-foreground/80 text-xs font-medium">Horas/semana</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">{stats.weeklyHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="bg-card/20 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-lg tracking-tight">Días de trabajo</h3>
            <p className="text-sm text-muted-foreground/80 mt-1">Configura qué días y horarios trabajas</p>
          </div>
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
                  'relative group overflow-hidden border rounded-2xl p-4 sm:px-6 transition-all duration-300',
                  isOpen 
                    ? 'bg-card/60 backdrop-blur-xl border-primary/20 hover:border-primary/40 shadow-sm hover:shadow-md' 
                    : 'bg-secondary/20 border-border/40 opacity-70 hover:opacity-100 hover:bg-secondary/30'
                )}
              >
                {/* Highlight strip for active days */}
                {isOpen && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-2xl" />
                )}

                {/* Main row */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  {/* Day Info & Toggle */}
                  <div className="flex items-center gap-4 min-w-[140px]">
                    <button
                      onClick={() => handleScheduleChange(day, 'isOpen', !isOpen)}
                      className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 shadow-inner border',
                        isOpen 
                          ? 'bg-primary/20 border-primary/30' 
                          : 'bg-secondary/80 border-border/50 hover:bg-secondary'
                      )}
                    >
                      <Sun size={20} className={cn(
                        'transition-transform duration-500',
                        isOpen ? 'text-primary rotate-180' : 'text-muted-foreground'
                      )} />
                    </button>
                    
                    <div>
                      <p className="font-semibold text-foreground tracking-tight text-[15px]">{DAY_NAMES[day]}</p>
                      <p className={cn(
                        "text-[11px] font-medium tracking-wide uppercase mt-0.5",
                        isOpen ? "text-primary" : "text-muted-foreground/60"
                      )}>
                        {isOpen ? 'Disponible' : 'Cerrado'}
                      </p>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="flex-1 flex flex-wrap items-center justify-between gap-4">
                      {/* Time inputs */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-background/50 rounded-xl px-3 py-1.5 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                          <input
                            type="time"
                            value={daySchedule.startTime}
                            onChange={(e) => handleScheduleChange(day, 'startTime', e.target.value)}
                            className="bg-transparent text-[15px] font-medium text-foreground focus:outline-none w-[110px] cursor-pointer"
                          />
                        </div>
                        <span className="text-muted-foreground/60 font-medium px-1">a</span>
                        <div className="flex items-center bg-background/50 rounded-xl px-3 py-1.5 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                          <input
                            type="time"
                            value={daySchedule.endTime}
                            onChange={(e) => handleScheduleChange(day, 'endTime', e.target.value)}
                            className="bg-transparent text-[15px] font-medium text-foreground focus:outline-none w-[110px] cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Action buttons (Appear on hover) */}
                      <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleAddBreak(day)}
                          className="h-9 px-3 rounded-lg bg-secondary/60 flex items-center gap-2 text-sm font-medium text-foreground hover:bg-secondary hover:shadow-sm transition-all"
                          title="Agregar descanso"
                        >
                          <Coffee size={14} className="text-amber-500" />
                          <span className="hidden sm:inline">Pausa</span>
                        </button>
                        <button
                          onClick={() => handleCopyToAll(day)}
                          className="h-9 w-9 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-sm transition-all"
                          title="Copiar horario a todos los días"
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Breaks Section */}
                {isOpen && hasBreaks && (
                  <div className="mt-4 pt-4 border-t border-border/30 pl-[76px] space-y-2.5">
                    {daySchedule.breaks?.map((brk, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2.5 py-1.5 rounded-md border border-amber-500/20">
                          <Coffee size={13} strokeWidth={2.5} />
                          <input
                            type="text"
                            value={brk.name}
                            onChange={(e) => handleUpdateBreak(day, idx, 'name', e.target.value)}
                            className="w-20 bg-transparent text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded-sm px-1 placeholder-amber-500/50"
                            placeholder="Descanso"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="bg-background/50 rounded-lg px-2 py-1.5 border border-white/5 shadow-inner">
                            <input
                              type="time"
                              value={brk.start}
                              onChange={(e) => handleUpdateBreak(day, idx, 'start', e.target.value)}
                              className="bg-transparent text-sm font-medium text-foreground focus:outline-none w-[100px] cursor-pointer"
                            />
                          </div>
                          <span className="text-muted-foreground/50 text-xs">-</span>
                          <div className="bg-background/50 rounded-lg px-2 py-1.5 border border-white/5 shadow-inner">
                            <input
                              type="time"
                              value={brk.end}
                              onChange={(e) => handleUpdateBreak(day, idx, 'end', e.target.value)}
                              className="bg-transparent text-sm font-medium text-foreground focus:outline-none w-[100px] cursor-pointer"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveBreak(day, idx)}
                          className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0 ml-auto sm:ml-0"
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
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-sm text-muted-foreground flex items-start gap-4 shadow-sm">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex flex-shrink-0 items-center justify-center mt-0.5">
          <Sun size={15} className="text-primary" />
        </div>
        <p className="leading-relaxed">
          <strong className="text-foreground">Tip:</strong> Usa el botón de copiar para aplicar el mismo horario a todos los días. 
          Agrega descansos para bloquear rápidamente la hora de la comida u otras pausas diarias.
        </p>
      </div>
    </div>
  )
}
