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

// Professional muted palette for team member avatars
export const AVATAR_COLORS = [
  'bg-slate-600',
  'bg-sky-700',
  'bg-teal-700',
  'bg-amber-700',
  'bg-rose-700',
  'bg-violet-700',
  'bg-stone-600',
  'bg-emerald-700',
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
    <div className="bg-card border border-border rounded-xl p-5 w-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Equipo</h2>
          <p className="text-sm text-muted-foreground">
            {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} activo{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onAddMember}
          className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Team Overview Option */}
      <button
        onClick={() => onSelectMember(null)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors',
          selectedMemberId === null
            ? 'bg-secondary border border-border'
            : 'hover:bg-secondary/50 border border-transparent'
        )}
      >
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Users size={18} className="text-primary-foreground" />
        </div>
        <div className="text-left">
          <p className="font-medium text-foreground text-sm">Todo el equipo</p>
          <p className="text-xs text-muted-foreground">Vista consolidada</p>
        </div>
      </button>

      {/* Team Members */}
      <div className="space-y-0.5">
        {members.map((member, index) => (
          <button
            key={member.id}
            onClick={() => onSelectMember(member.id)}
            className={cn(
              'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors',
              selectedMemberId === member.id
                ? 'bg-secondary border border-border'
                : 'hover:bg-secondary/50 border border-transparent',
              !member.is_active && 'opacity-60'
            )}
          >
            <div className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0',
              member.avatar_color || AVATAR_COLORS[index % AVATAR_COLORS.length]
            )}>
              {getInitials(member.name)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{member.name}</p>
              {member.role && (
                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
              )}
            </div>
            {!member.is_active && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium shrink-0">
                Inactivo
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Manage Team Button */}
      <button
        onClick={onManageTeam}
        className="w-full mt-5 py-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors font-medium text-sm flex items-center justify-center"
      >
        Gestionar equipo
      </button>
    </div>
  )
}
