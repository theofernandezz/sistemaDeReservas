'use client'

import { useState, useRef } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  ImageIcon,
  X,
  Upload,
  DollarSign
} from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { createService, updateService, deleteService } from '@/app/actions'
import { frontendServiceToDB } from '@/lib/adapters'
import { useRouter } from 'next/navigation'
import Switch from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { ServiceAddon } from '@/types/database.types'
import {
  createServiceAddon,
  updateServiceAddon,
  deleteServiceAddon
} from '@/app/actions'

interface ServicesAndAddonsProps {
  initialServices: FrontendService[]
  initialAddons: ServiceAddon[]
}

type TabType = 'services' | 'addons'

export default function ServicesAndAddons({
  initialServices,
  initialAddons
}: ServicesAndAddonsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('services')
  const [services, setServices] = useState(initialServices)
  const [addons, setAddons] = useState(initialAddons)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FrontendService | ServiceAddon | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const router = useRouter()
  const { toast } = useToast()
  const confirm = useConfirm()

  // Form state for services
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '60',
    image: '',
  })

  const handleOpenModal = (item?: FrontendService | ServiceAddon) => {
    if (item) {
      setEditingItem(item)
      if (activeTab === 'services') {
        const service = item as FrontendService
        setFormData({
          title: service.title,
          description: service.description || '',
          price: String(service.price),
          duration: String(service.durationMin),
          image: service.image || '',
        })
      } else {
        const addon = item as ServiceAddon
        setFormData({
          title: addon.name,
          description: addon.description || '',
          price: String(addon.price),
          duration: String(addon.duration_minutes || 0),
          image: '',
        })
      }
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        description: '',
        price: '',
        duration: activeTab === 'services' ? '60' : '0',
        image: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.price) {
      toast({ type: 'error', title: 'Completá los campos requeridos' })
      return
    }

    setSaving(true)
    try {
      if (activeTab === 'services') {
        const serviceData = {
          title: formData.title,
          description: formData.description,
          price: Number(formData.price),
          durationMin: Number(formData.duration),
          image: formData.image,
          active: true,
        }

        if (editingItem) {
          await updateService((editingItem as FrontendService).id, frontendServiceToDB(serviceData as any))
          toast({ type: 'success', title: 'Servicio actualizado' })
        } else {
          await createService(frontendServiceToDB(serviceData as any))
          toast({ type: 'success', title: 'Servicio creado' })
        }
      } else {
        const addonData = {
          name: formData.title,
          description: formData.description,
          price: Number(formData.price),
          duration_minutes: Number(formData.duration),
        }

        if (editingItem) {
          await updateServiceAddon((editingItem as ServiceAddon).id, addonData)
          toast({ type: 'success', title: 'Add-on actualizado' })
        } else {
          await createServiceAddon(addonData)
          toast({ type: 'success', title: 'Add-on creado' })
        }
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      toast({ type: 'error', title: 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string) => {
    const service = services.find(s => s.id === id)
    if (!service) return

    // Optimistic update - update UI immediately
    const newActiveState = !service.active
    setServices(prev => prev.map(s =>
      s.id === id ? { ...s, active: newActiveState } : s
    ))

    setTogglingId(id)
    try {
      await updateService(id, frontendServiceToDB({ ...service, active: newActiveState } as any))
    } catch (error) {
      // Revert on error
      setServices(prev => prev.map(s =>
        s.id === id ? { ...s, active: service.active } : s
      ))
      toast({ type: 'error', title: 'Error al actualizar' })
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = (item: FrontendService | ServiceAddon) => {
    confirm.confirm({
      title: `Eliminar ${activeTab === 'services' ? 'servicio' : 'add-on'}`,
      description: '¿Estás seguro? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (activeTab === 'services') {
            await deleteService((item as FrontendService).id)
            toast({ type: 'success', title: 'Servicio eliminado' })
          } else {
            await deleteServiceAddon((item as ServiceAddon).id)
            toast({ type: 'success', title: 'Add-on eliminado' })
          }
          router.refresh()
        } catch (error) {
          toast({ type: 'error', title: 'Error al eliminar' })
        }
      }
    })
  }

  const currentItems = activeTab === 'services' ? services : addons

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeTab === 'services' ? 'Servicios' : 'Add-ons'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'services'
              ? `${services.length} servicios configurados`
              : `${addons.length} add-ons disponibles`
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'services'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground'
                }`}
            >
              Servicios
            </button>
            <button
              onClick={() => setActiveTab('addons')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'addons'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground'
                }`}
            >
              Add-ons
            </button>
          </div>

          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={18} />
            <span className="hidden sm:inline">
              Nuevo {activeTab === 'services' ? 'Servicio' : 'Add-on'}
            </span>
          </Button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {activeTab === 'services' ? (
          <>
            {services.map(service => (
              <div
                key={service.id}
                className={`bg-card border border-border rounded-xl p-4 transition-all hover:shadow-md hover:border-primary/30 flex flex-col ${service.active === false ? 'opacity-50' : ''
                  }`}
              >
                {/* Top row: Title + Toggle */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-foreground truncate flex-1">
                    {service.title}
                  </h3>
                  {togglingId === service.id ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Switch
                      checked={service.active !== false}
                      onCheckedChange={() => handleToggleActive(service.id)}
                    />
                  )}
                </div>

                {/* Description - full visible */}
                <p className="text-xs text-muted-foreground mb-3 min-h-[32px]">
                  {service.description || 'Sin descripción'}
                </p>

                {/* Info row: Duration + Price */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded">
                    <Clock size={12} />
                    {service.durationMin}m
                  </span>
                  <span className="flex items-center gap-0.5 text-xs font-medium text-foreground bg-primary/10 px-2 py-0.5 rounded">
                    ${service.price.toLocaleString()}
                  </span>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-end gap-1 mt-auto pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleOpenModal(service)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Service Card */}
            <button
              onClick={() => handleOpenModal()}
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[140px]"
            >
              <Plus size={24} />
              <span className="font-medium">Agregar Servicio</span>
              <span className="text-xs">Creá un nuevo servicio para ofrecer</span>
            </button>
          </>
        ) : (
          <>
            {addons.map(addon => (
              <div
                key={addon.id}
                className="bg-card border border-border rounded-xl p-4 transition-all hover:shadow-md hover:border-primary/30 flex flex-col"
              >
                {/* Title */}
                <h3 className="font-semibold text-sm text-foreground mb-2">
                  {addon.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-3 min-h-[32px]">
                  {addon.description || 'Sin descripción'}
                </p>

                {/* Info row */}
                <div className="flex items-center gap-2 mb-3">
                  {addon.duration_minutes && addon.duration_minutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded">
                      <Clock size={12} />
                      +{addon.duration_minutes}m
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-xs font-medium text-foreground bg-primary/10 px-2 py-0.5 rounded">
                    +${addon.price.toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-auto pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleOpenModal(addon)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(addon)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Addon Card */}
            <button
              onClick={() => handleOpenModal()}
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[140px]"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">Agregar Add-on</span>
            </button>
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'services' ? 'Servicio' : 'Add-on'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={activeTab === 'services' ? 'Ej: Corte de pelo' : 'Ej: Tratamiento capilar'}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción breve..."
                  rows={2}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Precio *
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Duración (min)
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="60"
                      className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin mr-2" />}
                {editingItem ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
