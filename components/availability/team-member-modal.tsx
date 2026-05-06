'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { CreateTeamMemberInput, TeamMember } from '@/types/database.types'
import { AVATAR_COLORS } from './team-member-list'

interface TeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateTeamMemberInput) => Promise<boolean>
  existingMember?: TeamMember | null
}

export default function TeamMemberModal({
  isOpen,
  onClose,
  onSave,
  existingMember,
}: TeamMemberModalProps) {
  const [name, setName] = useState(existingMember?.name || '')
  const [role, setRole] = useState(existingMember?.role || '')
  const [selectedColor, setSelectedColor] = useState(existingMember?.avatar_color || AVATAR_COLORS[0])
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    const success = await onSave({
      name: name.trim(),
      role: role.trim() || null,
      avatar_color: selectedColor,
    })
    setSaving(false)

    if (success) {
      setName('')
      setRole('')
      setSelectedColor(AVATAR_COLORS[0])
      onClose()
    }
  }

  const getInitials = (n: string): string => {
    const parts = n.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {existingMember ? 'Editar miembro' : 'Nuevo miembro'}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Preview */}
          <div className="flex justify-center">
            <div className={cn(
              'h-20 w-20 rounded-full flex items-center justify-center text-white font-bold text-xl',
              selectedColor
            )}>
              {name ? getInitials(name) : '??'}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Color del avatar</Label>
            <div className="flex flex-wrap gap-2 justify-center">
              {AVATAR_COLORS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-transform',
                    color,
                    selectedColor === color && 'ring-2 ring-border ring-offset-2 ring-offset-background scale-105'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <Label htmlFor="name" className="text-sm text-muted-foreground mb-2 block">
              Nombre completo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ana García"
              required
            />
          </div>

          {/* Role Input */}
          <div>
            <Label htmlFor="role" className="text-sm text-muted-foreground mb-2 block">
              Rol / Especialidad <span className="text-muted-foreground/60">(opcional)</span>
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ej: Estilista Senior"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 h-10"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Guardando...
                </>
              ) : existingMember ? (
                'Actualizar'
              ) : (
                'Agregar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
