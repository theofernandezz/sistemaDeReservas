'use client'

import { TeamMember, WeeklySchedule } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { AVATAR_COLORS } from './team-member-list'

interface TeamConsolidatedViewProps {
  members: TeamMember[]
}

const DAY_NAMES_SHORT: Record<string, string> = {
  '1': 'Lun',
  '2': 'Mar',
  '3': 'Mié',
  '4': 'Jue',
  '5': 'Vie',
  '6': 'Sáb',
  '0': 'Dom',
}

const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0']

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function calculateMemberWeeklyHours(schedule: WeeklySchedule): number {
  let totalMinutes = 0
  
  DAY_ORDER.forEach(day => {
    const daySchedule = schedule[day]
    if (daySchedule?.isOpen) {
      const start = daySchedule.startTime.split(':').map(Number)
      const end = daySchedule.endTime.split(':').map(Number)
      let dayMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
      
      // Subtract breaks
      daySchedule.breaks?.forEach(b => {
        const bStart = b.start.split(':').map(Number)
        const bEnd = b.end.split(':').map(Number)
        dayMinutes -= (bEnd[0] * 60 + bEnd[1]) - (bStart[0] * 60 + bStart[1])
      })
      
      totalMinutes += Math.max(0, dayMinutes)
    }
  })
  
  return Math.round(totalMinutes / 60)
}

function calculateTeamStats(members: TeamMember[]) {
  const activeMembers = members.filter(m => m.is_active)
  
  let totalHours = 0
  let totalSlots = 0
  
  activeMembers.forEach(member => {
    const hours = calculateMemberWeeklyHours(member.weekly_schedule)
    totalHours += hours
    totalSlots += Math.floor((hours * 60) / member.slot_interval)
  })
  
  // Approximate coverage (assuming 40h/week is 100% for one person)
  const maxCoverageHours = activeMembers.length * 40
  const coveragePercent = maxCoverageHours > 0 ? Math.min(100, Math.round((totalHours / maxCoverageHours) * 100)) : 0
  
  return {
    memberCount: activeMembers.length,
    totalHours,
    totalSlots,
    coveragePercent,
  }
}

export default function TeamConsolidatedView({ members }: TeamConsolidatedViewProps) {
  const activeMembers = members.filter(m => m.is_active)
  const stats = calculateTeamStats(members)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Vista consolidada del equipo</h2>
        <p className="text-sm text-muted-foreground mt-1">Resumen de disponibilidad de todos los miembros</p>
      </div>

      {/* Schedule Table */}
      <div className="bg-card/20 backdrop-blur-sm border border-white/5 rounded-3xl shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-4 text-sm font-medium text-muted-foreground w-48">
                  Miembro
                </th>
                {DAY_ORDER.map(day => (
                  <th key={day} className="text-center px-4 py-4 text-sm font-medium text-muted-foreground">
                    {DAY_NAMES_SHORT[day]}
                  </th>
                ))}
                <th className="text-center px-5 py-4 text-sm font-medium text-muted-foreground">
                  Hrs/sem
                </th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((member, index) => {
                const weeklyHours = calculateMemberWeeklyHours(member.weekly_schedule)
                
                return (
                  <tr key={member.id} className="border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm border border-white/10',
                          member.avatar_color || AVATAR_COLORS[index % AVATAR_COLORS.length]
                        )}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          {member.role && (
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {DAY_ORDER.map(day => {
                      const daySchedule = member.weekly_schedule[day]
                      const isOpen = daySchedule?.isOpen ?? false
                      
                      return (
                        <td key={day} className="text-center px-4 py-4">
                          {isOpen ? (
                            <div className="text-xs">
                              <p className="font-medium text-foreground">{daySchedule.startTime}</p>
                              <p className="text-muted-foreground">{daySchedule.endTime}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                        <span className="font-bold text-foreground">{weeklyHours}h</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold tracking-tight text-foreground">{stats.memberCount}</p>
          <p className="text-xs font-medium text-muted-foreground/80 mt-2">Miembros del<br/>equipo</p>
        </div>
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold tracking-tight text-pink-500">{stats.totalHours}h</p>
          <p className="text-xs font-medium text-muted-foreground/80 mt-2">Total horas/semana</p>
        </div>
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold tracking-tight text-cyan-500">~{stats.totalSlots}</p>
          <p className="text-xs font-medium text-muted-foreground/80 mt-2">Turnos semanales</p>
        </div>
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold tracking-tight text-emerald-500">{stats.coveragePercent}%</p>
          <p className="text-xs font-medium text-muted-foreground/80 mt-2">Cobertura<br/>promedio</p>
        </div>
      </div>

      {/* Empty state */}
      {activeMembers.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No hay miembros activos en el equipo</p>
          <p className="text-sm mt-2">Agrega miembros para ver la vista consolidada</p>
        </div>
      )}
    </div>
  )
}
