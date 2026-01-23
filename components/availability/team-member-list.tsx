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
    <div className="bg-card border border-border rounded-2xl p-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Equipo</h2>
          <p className="text-sm text-muted-foreground">
            {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} activo{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onAddMember}
          className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
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
                ? 'bg-linear-to-r from-primary/20 to-primary/10 border border-primary/30'
                : 'hover:bg-secondary/50',
              !member.is_active && 'opacity-60'
            )}
          >
            <div className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold text-sm',
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
        className="w-full mt-5 py-3 rounded-xl bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium text-sm"
      >
        Gestionar equipo
      </button>
    </div>
  )
}
