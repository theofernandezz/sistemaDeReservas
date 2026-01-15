'use client'

import { useState } from 'react'
import { X, Trash2, Loader2, Edit2, Check, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TeamMember } from '@/types/database.types'
import { AVATAR_COLORS } from './team-member-list'
import { deleteTeamMember, updateTeamMember } from '@/app/actions/team'

interface TeamManagementModalProps {
  isOpen: boolean
  onClose: () => void
  members: TeamMember[]
  onUpdateMembers: (members: TeamMember[]) => void
}

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function TeamManagementModal({
  isOpen,
  onClose,
  members,
  onUpdateMembers,
}: TeamManagementModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleStartEdit = (member: TeamMember) => {
    setEditingId(member.id)
    setEditName(member.name)
    setEditRole(member.role || '')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditRole('')
  }

  const handleSaveEdit = async (memberId: string) => {
    if (!editName.trim()) return
    
    setSaving(true)
    const result = await updateTeamMember(memberId, {
      name: editName.trim(),
      role: editRole.trim() || null,
    })
    setSaving(false)

    if (result.success && result.data) {
      onUpdateMembers(members.map(m => m.id === memberId ? result.data! : m))
      handleCancelEdit()
    }
  }

  const handleDelete = async (memberId: string) => {
    setDeletingId(memberId)
    const result = await deleteTeamMember(memberId)
    setDeletingId(null)

    if (result.success) {
      onUpdateMembers(members.filter(m => m.id !== memberId))
    }
  }

  const handleToggleActive = async (member: TeamMember) => {
    const result = await updateTeamMember(member.id, { is_active: !member.is_active })
    if (result.success && result.data) {
      onUpdateMembers(members.map(m => m.id === member.id ? result.data! : m))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border shrink-0">
          <h2 className="text-xl font-bold text-foreground">Gestionar equipo</h2>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay miembros en el equipo</p>
              <p className="text-sm mt-2">Agrega miembros desde la pantalla principal</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className={cn(
                    'bg-secondary/30 border border-border rounded-xl p-5 transition-opacity',
                    !member.is_active && 'opacity-60'
                  )}
                >
                  {editingId === member.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0',
                          member.avatar_color || AVATAR_COLORS[index % AVATAR_COLORS.length]
                        )}>
                          {editName ? getInitials(editName) : '??'}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nombre"
                            className="bg-background"
                          />
                          <Input
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            placeholder="Rol (opcional)"
                            className="bg-background"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <XCircle size={14} className="mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(member.id)}
                          disabled={!editName.trim() || saving}
                        >
                          {saving ? (
                            <Loader2 size={14} className="mr-1 animate-spin" />
                          ) : (
                            <Check size={14} className="mr-1" />
                          )}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0',
                        member.avatar_color || AVATAR_COLORS[index % AVATAR_COLORS.length]
                      )}>
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Status toggle */}
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            member.is_active
                              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          )}
                        >
                          {member.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                        {/* Edit button */}
                        <button
                          onClick={() => handleStartEdit(member)}
                          className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                        >
                          {deletingId === member.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-border shrink-0">
          <Button onClick={onClose} className="w-full h-11">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
