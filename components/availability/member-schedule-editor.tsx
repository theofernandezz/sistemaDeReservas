'use client'

import { TeamMember, WeeklySchedule, DaySchedule, DayBreak } from '@/types/database.types'
import { Sun, Clock, Coffee, Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AVATAR_COLORS } from './team-member-list'

interface MemberScheduleEditorProps {
  member: TeamMember
  memberIndex: number
  onUpdate: (memberId: string, updates: Partial<TeamMember>) => void
  onToggleStatus: (memberId: string) => void
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

const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0'] // Lunes a Domingo

const INTERVAL_OPTIONS = [15, 30, 45, 60, 90]
const BUFFER_OPTIONS = [0, 5, 10, 15]

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Calculate stats
function calculateStats(schedule: WeeklySchedule, interval: number): { activeDays: number; slotsPerDay: number; weeklyCapacity: number } {
  let activeDays = 0
  let totalMinutes = 0

  DAY_ORDER.forEach(day => {
    const daySchedule = schedule[day]
    if (daySchedule?.isOpen) {
      activeDays++
      const start = daySchedule.startTime.split(':').map(Number)
      const end = daySchedule.endTime.split(':').map(Number)
      let dayMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
      
      // Subtract break times
      daySchedule.breaks?.forEach(b => {
        const bStart = b.start.split(':').map(Number)
        const bEnd = b.end.split(':').map(Number)
        dayMinutes -= (bEnd[0] * 60 + bEnd[1]) - (bStart[0] * 60 + bStart[1])
      })
      
      totalMinutes += dayMinutes
    }
  })

  const avgMinutesPerDay = activeDays > 0 ? totalMinutes / activeDays : 0
  const slotsPerDay = Math.floor(avgMinutesPerDay / interval)
  const weeklyCapacity = Math.floor(totalMinutes / interval)

  return { activeDays, slotsPerDay, weeklyCapacity }
}

export default function MemberScheduleEditor({
  member,
  memberIndex,
  onUpdate,
  onToggleStatus,
}: MemberScheduleEditorProps) {
  const schedule = member.weekly_schedule
  const stats = calculateStats(schedule, member.slot_interval)

  const handleScheduleChange = (day: string, field: keyof DaySchedule, value: boolean | string | DayBreak[]) => {
    const newSchedule = { ...schedule }
    newSchedule[day] = { ...newSchedule[day], [field]: value }
    onUpdate(member.id, { weekly_schedule: newSchedule })
  }

  const handleAddBreak = (day: string) => {
    const newSchedule = { ...schedule }
    const daySchedule = newSchedule[day]
    const newBreak: DayBreak = { name: 'Descanso', start: '13:00', end: '14:00' }
    newSchedule[day] = {
      ...daySchedule,
      breaks: [...(daySchedule.breaks || []), newBreak]
    }
    onUpdate(member.id, { weekly_schedule: newSchedule })
  }

  const handleUpdateBreak = (day: string, breakIndex: number, field: keyof DayBreak, value: string) => {
    const newSchedule = { ...schedule }
    const daySchedule = newSchedule[day]
    const newBreaks = [...(daySchedule.breaks || [])]
    newBreaks[breakIndex] = { ...newBreaks[breakIndex], [field]: value }
    newSchedule[day] = { ...daySchedule, breaks: newBreaks }
    onUpdate(member.id, { weekly_schedule: newSchedule })
  }

  const handleRemoveBreak = (day: string, breakIndex: number) => {
    const newSchedule = { ...schedule }
    const daySchedule = newSchedule[day]
    const newBreaks = (daySchedule.breaks || []).filter((_, i) => i !== breakIndex)
    newSchedule[day] = { ...daySchedule, breaks: newBreaks }
    onUpdate(member.id, { weekly_schedule: newSchedule })
  }

  const handleCopyToAll = (day: string) => {
    const sourceDay = schedule[day]
    const newSchedule = { ...schedule }
    DAY_ORDER.forEach(d => {
      if (d !== day) {
        newSchedule[d] = { ...sourceDay, breaks: sourceDay.breaks ? [...sourceDay.breaks] : [] }
      }
    })
    onUpdate(member.id, { weekly_schedule: newSchedule })
  }

  return (
    <div className="space-y-8">
      {/* Header with member info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0',
            member.avatar_color || AVATAR_COLORS[memberIndex % AVATAR_COLORS.length]
          )}>
            {getInitials(member.name)}
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{member.name}</h2>
            {member.role && (
              <p className="text-sm text-muted-foreground">{member.role}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggleStatus(member.id)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            member.is_active
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {member.is_active ? 'Activo' : 'Inactivo'}
        </button>
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
                onClick={() => onUpdate(member.id, { slot_interval: opt })}
                className={cn(
                  'py-1.5 rounded-lg text-[13px] font-medium transition-colors text-center border',
                  opt === member.slot_interval 
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
                onClick={() => onUpdate(member.id, { buffer_time: opt })}
                className={cn(
                  'py-1.5 rounded-lg text-[13px] font-medium transition-colors text-center border',
                  opt === member.buffer_time 
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
              <span className="text-muted-foreground text-xs font-medium">Slots/día</span>
              <span className="font-semibold text-foreground">{stats.slotsPerDay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="mb-5">
          <h3 className="font-semibold text-foreground text-base">Horarios de atención</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Configura los horarios de {member.name}. El horario de fin es el <strong className="text-foreground">último turno disponible</strong> del día, no el cierre del local.</p>
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
    </div>
  )
}
