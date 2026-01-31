'use client'

import { useState } from 'react'
import { Plus, Edit2, DollarSign, Clock, Loader2, X, Trash2 } from 'lucide-react'
import { ServiceAddon } from '@/types/database.types'
import { createServiceAddon, updateServiceAddon, toggleServiceAddonActive, deleteServiceAddon } from '@/app/actions'
import { useRouter } from 'next/navigation'
import Switch from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface AddonManagerProps {
  initialAddons: ServiceAddon[]
}

export default function AddonManager({ initialAddons }: AddonManagerProps) {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const confirm = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 15,
    is_active: true
  })

  const handleOpenModal = (addon?: ServiceAddon) => {
    if (addon) {
      setEditingAddon(addon)
      setFormData({
        name: addon.name,
        description: addon.description || '',
        price: addon.price,
        duration_minutes: addon.duration_minutes,
        is_active: addon.is_active
      })
    } else {
      setEditingAddon(null)
      setFormData({
        name: '',
        description: '',
        price: 0,
        duration_minutes: 15,
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || formData.price < 0) {
      showError('Error', 'Completá los campos requeridos')
      return
    }

    setSaving(true)

    try {
      if (editingAddon) {
        const result = await updateServiceAddon(editingAddon.id, {
          name: formData.name,
          description: formData.description || null,
          price: formData.price,
          duration_minutes: formData.duration_minutes
        })
        if (!result.success) throw new Error(result.error)
        showSuccess('Add-on actualizado')
      } else {
        const result = await createServiceAddon({
          name: formData.name,
          description: formData.description || null,
          price: formData.price,
          duration_minutes: formData.duration_minutes,
          is_active: true
        })
        if (!result.success) throw new Error(result.error)
        showSuccess('Add-on creado')
      }

      setShowModal(false)
      router.refresh()
    } catch (error: unknown) {
      showError('Error', error instanceof Error ? error.message : 'Error saving addon')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    setTogglingId(id)
    try {
      const result = await toggleServiceAddonActive(id)
      if (result.success) {
        router.refresh()
      } else {
        showError('Error', result.error || 'Intenta nuevamente')
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = (addon: ServiceAddon) => {
    confirm.confirm({
      title: '¿Eliminar add-on?',
      description: `Se eliminará "${addon.name}" permanentemente.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(addon.id)
        try {
          const result = await deleteServiceAddon(addon.id)
          if (result.success) {
            showSuccess('Add-on eliminado')
            router.refresh()
          } else {
            showError('Error', result.error || 'Intenta nuevamente')
          }
        } finally {
          setDeletingId(null)
        }
      }
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <>
      {/* Add Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Nuevo Add-on
        </button>
      </div>

      {/* Add-ons Grid */}
      {initialAddons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay add-ons creados.</p>
          <p className="text-sm mt-1">Creá el primero para que los clientes puedan agregarlo a sus citas.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {initialAddons.map((addon) => (
            <div
              key={addon.id}
              className={`bg-card border border-border rounded-xl p-4 transition-all ${!addon.is_active ? 'opacity-60' : ''
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{addon.name}</h3>
                  {addon.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {addon.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign size={14} />
                      {formatPrice(addon.price)}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={14} />
                      {addon.duration_minutes} min
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {togglingId === addon.id ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={addon.is_active}
                      onCheckedChange={() => handleToggle(addon.id)}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => handleOpenModal(addon)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(addon)}
                  disabled={deletingId === addon.id}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === addon.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-serif font-bold text-lg text-foreground">
                {editingAddon ? 'Editar Add-on' : 'Nuevo Add-on'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  placeholder="Ej: Remoción Semipermanente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  placeholder="Opcional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Precio ($) *</label>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Duración (min) *</label>
                  <input
                    type="number"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 15 })}
                    className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    placeholder="15"
                    min="5"
                    step="5"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingAddon ? 'Guardar' : 'Crear'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
