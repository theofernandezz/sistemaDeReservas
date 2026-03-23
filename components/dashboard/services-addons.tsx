'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  X,
  DollarSign
} from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { createService, updateService, deleteService } from '@/app/actions'
import { dbServiceToFrontend, frontendServiceToDB } from '@/lib/adapters'
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
import { ImageUpload } from '@/components/ui/image-upload'
import ImageCropper from '@/components/ui/image-cropper'

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

  // Image upload states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    setServices(initialServices)
  }, [initialServices])

  useEffect(() => {
    setAddons(initialAddons)
  }, [initialAddons])

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
        const serviceData: Omit<FrontendService, 'id'> = {
          title: formData.title,
          description: formData.description,
          price: Number(formData.price),
          durationMin: Number(formData.duration),
          image: formData.image,
          active: true,
        }

        if (editingItem) {
          const serviceId = (editingItem as FrontendService).id
          const result = await updateService(serviceId, frontendServiceToDB(serviceData))
          if (!result.success) {
            throw new Error(result.error || 'No se pudo actualizar el servicio')
          }
          if (result.data) {
            const updatedService = dbServiceToFrontend(result.data)
            setServices(prev => prev.map(service =>
              service.id === serviceId ? updatedService : service
            ))
          }
          toast({ type: 'success', title: 'Servicio actualizado' })
        } else {
          const result = await createService(frontendServiceToDB(serviceData))
          if (!result.success) {
            throw new Error(result.error || 'No se pudo crear el servicio')
          }
          if (result.data) {
            const createdService = dbServiceToFrontend(result.data)
            setServices(prev => [...prev, createdService])
          }
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
          const addonId = (editingItem as ServiceAddon).id
          const result = await updateServiceAddon(addonId, addonData)
          if (!result.success) {
            throw new Error(result.error || 'No se pudo actualizar el add-on')
          }
          if (result.data) {
            setAddons(prev => prev.map(addon =>
              addon.id === addonId ? result.data as ServiceAddon : addon
            ))
          }
          toast({ type: 'success', title: 'Add-on actualizado' })
        } else {
          const result = await createServiceAddon(addonData)
          if (!result.success) {
            throw new Error(result.error || 'No se pudo crear el add-on')
          }
          if (result.data) {
            setAddons(prev => [...prev, result.data])
          }
          toast({ type: 'success', title: 'Add-on creado' })
        }
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar'
      toast({ type: 'error', title: message })
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
      const serviceUpdate: FrontendService = { ...service, active: newActiveState }
      const result = await updateService(id, frontendServiceToDB(serviceUpdate))
      if (!result.success) {
        throw new Error(result.error || 'No se pudo actualizar el servicio')
      }
    } catch {
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
        } catch {
          toast({ type: 'error', title: 'Error al eliminar' })
        }
      }
    })
  }

  // Image upload handlers
  const handleCropRequest = (imageDataUrl: string) => {
    setImageToCrop(imageDataUrl)
  }

  const handleCropComplete = async (croppedImage: Blob) => {
    setImageToCrop(null)
    setIsUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', croppedImage, 'service-image.jpg')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir imagen')
      }

      const data = await response.json()
      setFormData({ ...formData, image: data.url })
      toast({ type: 'success', title: 'Imagen subida correctamente' })
    } catch {
      toast({
        type: 'error',
        title: 'Error al subir imagen',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCropCancel = () => {
    setImageToCrop(null)
  }

  const handleImageChange = (imageUrl: string) => {
    setFormData({ ...formData, image: imageUrl })
  }

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
          {/* Tabs (Segmented Control Style) */}
          <div className="flex items-center bg-secondary/40 backdrop-blur-md rounded-full p-1 border border-white/5 shadow-sm">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'services'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40'
                }`}
            >
              Servicios
            </button>
            <button
              onClick={() => setActiveTab('addons')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'addons'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40'
                }`}
            >
              Add-ons
            </button>
          </div>

          <Button onClick={() => handleOpenModal()} className="gap-2 rounded-full shadow-md hover:shadow-lg transition-all">
            <Plus size={18} />
            <span className="hidden sm:inline">
              Nuevo
            </span>
          </Button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeTab === 'services' ? (
          <>
            {services.map(service => (
              <div
                key={service.id}
                className={`bg-card/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 flex flex-col group ${service.active === false ? 'opacity-50 grayscale-[50%]' : ''
                  }`}
              >
                {/* Service Image */}
                {service.image && (
                  <div className="relative w-full h-32 bg-secondary">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  {/* Top row: Title + Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-foreground truncate flex-1">
                      {service.title}
                    </h3>
                    {togglingId === service.id ? (
                      <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Switch
                        checked={service.active !== false}
                        onCheckedChange={() => handleToggleActive(service.id)}
                      />
                    )}
                  </div>

                  {/* Description - full visible */}
                  <p className="text-xs text-muted-foreground mb-3 min-h-8">
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
                  <div className="flex items-center justify-end gap-2 mt-auto pt-3 border-t border-border/30 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(service)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary/80 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Service Card (Dashed) */}
            <button
              onClick={() => handleOpenModal()}
              className="border-2 border-dashed border-border/50 bg-secondary/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-secondary/20 hover:border-primary/40 hover:text-primary transition-all min-h-[14rem] shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-background rounded-full border border-border shadow-sm">
                <Plus size={24} />
              </div>
              <div className="text-center">
                <span className="font-semibold block text-foreground">Crear Servicio</span>
                <span className="text-xs mt-1 block max-w-[160px] mx-auto opacity-70">Añade un nuevo servicio a tu catálogo</span>
              </div>
            </button>
          </>
        ) : (
          <>
            {addons.map(addon => (
              <div
                key={addon.id}
                className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 flex flex-col group"
              >
                {/* Title */}
                <h3 className="font-semibold text-base tracking-tight text-foreground mb-1.5">
                  {addon.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 min-h-[3rem] leading-relaxed">
                  {addon.description || 'Sin descripción'}
                </p>

                {/* Info row */}
                <div className="flex items-center gap-2 mb-4">
                  {addon.duration_minutes && addon.duration_minutes > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-secondary px-2.5 py-1 rounded-md border border-border/50">
                      <Clock size={14} className="text-muted-foreground" />
                      +{addon.duration_minutes} min
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
                    +${addon.price.toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-auto pt-3 border-t border-border/30 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(addon)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary/80 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(addon)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Addon Card */}
            <button
              onClick={() => handleOpenModal()}
              className="border-2 border-dashed border-border/50 bg-secondary/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-secondary/20 hover:border-primary/40 hover:text-primary transition-all min-h-[14rem] shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-background rounded-full border border-border shadow-sm">
                <Plus size={24} />
              </div>
              <span className="font-semibold block text-foreground">Crear Add-on</span>
            </button>
          </>
        )}
      </div>

      {/* Modal / Dialog (Glassmorphism Immersive Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 slide-in-from-bottom-[2%] duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/30 bg-secondary/20 rounded-t-2xl">
              <h2 className="text-xl font-semibold tracking-tight">
                {editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'services' ? 'Servicio' : 'Add-on'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-muted-foreground hover:bg-secondary/80 hover:text-foreground rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
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

              {/* Image upload - only for services */}
              {activeTab === 'services' && (
                <ImageUpload
                  value={formData.image}
                  onChange={handleImageChange}
                  onCropRequest={handleCropRequest}
                  label="Imagen del servicio"
                  isUploading={isUploading}
                  onError={(title, message) => {
                    toast({ type: 'error', title, description: message })
                  }}
                />
              )}

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

            {/* Modal Footer (Sticky-style glass) */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border/30 bg-background/50 rounded-b-2xl">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="hover:bg-secondary border border-transparent hover:border-border/50">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="shadow-lg hover:-translate-y-0.5 transition-all">
                {saving && <Loader2 size={16} className="animate-spin mr-2" />}
                {editingItem ? 'Guardar Cambios' : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}
    </div>
  )
}
