'use client'

import { TeamMember } from '@/types/database.types'
import { Users, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMemberListProps {
  members: TeamMember[]
  selectedMemberId: string | null // null = "Todo el equipo"
  onSelectMember: (memberId: string | null) => void
  onAddMember: () => void
  onManageTeam: () => void
}

// Avatar colors for team members
export const AVATAR_COLORS = [
  'bg-linear-to-br from-orange-400 to-orange-600',
  'bg-linear-to-br from-blue-400 to-blue-600',
  'bg-linear-to-br from-pink-400 to-pink-600',
  'bg-linear-to-br from-green-400 to-green-600',
  'bg-linear-to-br from-purple-400 to-purple-600',
  'bg-linear-to-br from-cyan-400 to-cyan-600',
  'bg-linear-to-br from-rose-400 to-rose-600',
  'bg-linear-to-br from-amber-400 to-amber-600',
]

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function TeamMemberList({
  members,
  selectedMemberId,
  onSelectMember,
  onAddMember,
  onManageTeam,
}: TeamMemberListProps) {
  const activeMembers = members.filter(m => m.is_active)

  return (
    <div className="bg-card/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 w-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Equipo</h2>
          <p className="text-sm text-muted-foreground/80">
            {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} activo{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onAddMember}
          className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary/20 transition-all hover:scale-105"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Team Overview Option */}
      <button
        onClick={() => onSelectMember(null)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all',
          selectedMemberId === null
            ? 'bg-linear-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
            : 'hover:bg-secondary/50'
        )}
      >
        <div className="h-11 w-11 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Users size={20} className="text-white" />
        </div>
        <div className="text-left">
          <p className="font-medium text-foreground">Todo el equipo</p>
          <p className="text-xs text-muted-foreground">Vista consolidada</p>
        </div>
      </button>

      {/* Team Members */}
      <div className="space-y-1">
        {members.map((member, index) => (
          <button
            key={member.id}
            onClick={() => onSelectMember(member.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
              selectedMemberId === member.id
                ? 'bg-linear-to-r from-primary/20 to-primary/10 border border-primary/30 shadow-sm'
                : 'hover:bg-secondary/40 border border-transparent',
              !member.is_active && 'opacity-60'
            )}
          >
            <div className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm border border-white/10 filter drop-shadow-sm',
              member.avatar_color || AVATAR_COLORS[index % AVATAR_COLORS.length]
            )}>
              {getInitials(member.name)}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">{member.name}</p>
              {member.role && (
                <p className="text-xs text-muted-foreground">{member.role}</p>
              )}
            </div>
            {!member.is_active && (
              <span className="text-xs bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                Inactivo
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Manage Team Button */}
      <button
        onClick={onManageTeam}
        className="w-full mt-6 py-2.5 rounded-xl bg-background/50 border border-white/5 text-muted-foreground/80 hover:bg-background hover:text-foreground shadow-sm transition-all font-medium text-sm flex items-center justify-center"
      >
        Gestionar equipo
      </button>
    </div>
  )
}
