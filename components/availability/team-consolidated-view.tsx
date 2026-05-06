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
        <h2 className="text-lg font-semibold text-foreground">Vista consolidada del equipo</h2>
        <p className="text-sm text-muted-foreground mt-1">Resumen de disponibilidad de todos los miembros</p>
      </div>

      {/* Schedule Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-44">
                  Miembro
                </th>
                {DAY_ORDER.map(day => (
                  <th key={day} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {DAY_NAMES_SHORT[day]}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Hrs/sem
                </th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((member, index) => {
                const weeklyHours = calculateMemberWeeklyHours(member.weekly_schedule)

                return (
                  <tr key={member.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0',
                          member.avatar_color || AVATAR_COLORS[index % AVATAR_COLORS.length]
                        )}>
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{member.name}</p>
                          {member.role && (
                            <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {DAY_ORDER.map(day => {
                      const daySchedule = member.weekly_schedule[day]
                      const isOpen = daySchedule?.isOpen ?? false

                      return (
                        <td key={day} className="text-center px-3 py-3">
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
                    <td className="text-center px-4 py-3">
                      <span className="font-semibold text-foreground text-sm">{weeklyHours}h</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.memberCount}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1.5">Miembros del equipo</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalHours}h</p>
          <p className="text-xs font-medium text-muted-foreground mt-1.5">Total horas/semana</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tracking-tight text-foreground">~{stats.totalSlots}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1.5">Turnos semanales</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.coveragePercent}%</p>
          <p className="text-xs font-medium text-muted-foreground mt-1.5">Cobertura promedio</p>
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
