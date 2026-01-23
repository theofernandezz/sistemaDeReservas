'use client'

import { useState } from 'react'
import { Plus, Edit2, DollarSign, Clock, Loader2, ImageIcon } from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { createService, updateService, toggleServiceActive } from '@/app/actions'
import { frontendServiceToDB } from '@/lib/adapters'
import { useRouter } from 'next/navigation'
import Switch from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import ImageCropper from '@/components/ui/image-cropper'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/image-upload'
import { cn } from '@/lib/utils'

interface ServiceManagerProps {
  initialServices: FrontendService[]
}

interface UploadResponse {
  url: string
  error?: string
}

export default function ServiceManager({ initialServices }: ServiceManagerProps) {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<FrontendService | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [formData, setFormData] = useState<Partial<FrontendService>>({
    title: '',
    price: 0,
    durationMin: 60,
    description: '',
    image: '',
    active: true
  })

  const handleOpenModal = (service?: FrontendService) => {
    if (service) {
      setEditingService(service)
      setFormData({
        title: service.title,
        price: service.price,
        durationMin: service.durationMin,
        description: service.description,
        image: service.image || '',
        active: service.active
      })
    } else {
      setEditingService(null)
      setFormData({
        title: '',
        price: 0,
        durationMin: 60,
        description: '',
        image: '',
        active: true
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title || formData.price === undefined) {
      showError('Campos requeridos', 'Por favor completa todos los campos')
      return
    }

    setSaving(true)
    const dbData = frontendServiceToDB(formData)

    try {
      if (editingService) {
        const result = await updateService(editingService.id, dbData)
        if (result.success) {
          setShowModal(false)
          showSuccess('Servicio actualizado')
          router.refresh()
        } else {
          showError('Error al actualizar', result.error || 'Intenta nuevamente')
        }
      } else {
        const result = await createService(dbData)
        if (result.success) {
          setShowModal(false)
          showSuccess('Servicio creado')
          router.refresh()
        } else {
          showError('Error al crear', result.error || 'Intenta nuevamente')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string) => {
    setTogglingId(id)
    try {
      const result = await toggleServiceActive(id)
      if (result.success) {
        router.refresh()
      } else {
        showError('Error', result.error || 'Intenta nuevamente')
      }
    } finally {
      setTogglingId(null)
    }
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
          Nuevo Servicio
        </button>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {initialServices.map(service => (
          <div
            key={service.id}
            className={`bg-card p-4 rounded-xl border border-border flex items-start gap-4 shadow-sm transition-opacity ${service.active === false ? 'opacity-50' : ''
              }`}
          >
            {/* Image */}
            <div className="w-20 h-20 bg-linear-to-br from-primary/20 via-primary/10 to-transparent rounded-lg overflow-hidden shrink-0">
              {service.image ? (
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-primary/40" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold font-serif text-lg text-foreground">{service.title}</h3>
                {service.active === false && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                    Inactivo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center">
                  <DollarSign size={12} className="mr-0.5" />
                  {service.price}
                </span>
                <span className="flex items-center">
                  <Clock size={12} className="mr-0.5" />
                  {service.durationMin}m
                </span>
              </div>
              <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{service.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {togglingId === service.id ? (
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={service.active !== false}
                  onCheckedChange={() => handleToggleActive(service.id)}
                />
              )}
              <button
                onClick={() => handleOpenModal(service)}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-serif font-bold text-lg text-foreground">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Image Upload Section */}
              <ImageUpload
                id="service-image"
                label="Imagen del servicio"
                value={formData.image}
                onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                onCropRequest={(imageDataUrl) => setImageToCrop(imageDataUrl)}
                isUploading={uploadingImage}
                maxSizeMB={5}
                onError={showError}
              />

              <div>
                <Label htmlFor="service-name" className="text-foreground">
                  Nombre *
                </Label>
                <input
                  id="service-name"
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={cn(
                    "w-full px-4 py-2 mt-1 rounded-xl",
                    "bg-secondary/20 border border-input",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "focus:outline-none transition-all"
                  )}
                  placeholder="Ej: Manicura Gel"
                  required
                  aria-required="true"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-price" className="text-foreground">
                    Precio ($) *
                  </Label>
                  <input
                    id="service-price"
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className={cn(
                      "w-full px-4 py-2 mt-1 rounded-xl",
                      "bg-secondary/20 border border-input",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      "focus:outline-none transition-all"
                    )}
                    required
                    aria-required="true"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="service-duration" className="text-foreground">
                    Duración (min) *
                  </Label>
                  <input
                    id="service-duration"
                    type="number"
                    value={formData.durationMin || ''}
                    onChange={(e) => setFormData({ ...formData, durationMin: Number(e.target.value) })}
                    className={cn(
                      "w-full px-4 py-2 mt-1 rounded-xl",
                      "bg-secondary/20 border border-input",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      "focus:outline-none transition-all"
                    )}
                    required
                    aria-required="true"
                    min="1"
                    step="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="service-description" className="text-foreground">
                  Descripción
                </Label>
                <textarea
                  id="service-description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={cn(
                    "w-full px-4 py-2 mt-1 rounded-xl",
                    "bg-secondary/20 border border-input",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "focus:outline-none transition-all resize-none"
                  )}
                  rows={3}
                  placeholder="Describe el tratamiento..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingService ? 'Guardar' : 'Crear'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={async (croppedImage: Blob) => {
            setImageToCrop(null)
            setUploadingImage(true)

            try {
              const uploadFormData = new FormData()
              uploadFormData.append('file', croppedImage, 'image.jpg')

              const response = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData
              })

              const data = await response.json() as UploadResponse

              if (!response.ok) {
                throw new Error(data.error || 'Error al subir imagen')
              }

              setFormData(prev => ({ ...prev, image: data.url }))
              showSuccess('Imagen subida')
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
              showError('Error al subir', errorMessage)
            } finally {
              setUploadingImage(false)
            }
          }}
          onCancel={() => setImageToCrop(null)}
          aspectRatio={16 / 9}
        />
      )}
    </>
  )
}

