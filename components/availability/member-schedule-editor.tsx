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

const INTERVAL_OPTIONS = [15, 30, 45, 60]
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
        <div className="flex items-center gap-4">
          <div className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-lg',
            member.avatar_color || AVATAR_COLORS[memberIndex % AVATAR_COLORS.length]
          )}>
            {getInitials(member.name)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{member.name}</h2>
            {member.role && (
              <p className="text-sm text-muted-foreground">{member.role}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggleStatus(member.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            member.is_active
              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          )}
        >
          {member.is_active ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Interval Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
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
                onClick={() => onUpdate(member.id, { slot_interval: opt })}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium transition-all text-center',
                  opt === member.slot_interval 
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
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
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
                onClick={() => onUpdate(member.id, { buffer_time: opt })}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium transition-all text-center',
                  opt === member.buffer_time 
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
            <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
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
              <span className="text-muted-foreground">Slots/día</span>
              <span className="font-medium text-foreground">{stats.slotsPerDay}</span>
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
          <p className="text-sm text-muted-foreground mt-1">Configura los horarios de {member.name}</p>
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
                <div className="flex items-center gap-4">
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
                  
                  <div className="w-24">
                    <p className="font-medium text-foreground">{DAY_NAMES[day]}</p>
                    <p className="text-xs text-muted-foreground">{isOpen ? 'Activo' : 'Cerrado'}</p>
                  </div>

                  {isOpen && (
                    <>
                      {/* Time inputs */}
                      <div className="flex items-center gap-2">
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
                      <div key={idx} className="flex items-center gap-2">
                        <Coffee size={14} className="text-muted-foreground" />
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
                          className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
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
    </div>
  )
}
