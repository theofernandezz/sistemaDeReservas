'use client'

import { useState, useRef } from 'react'
import { Plus, Edit2, DollarSign, Clock, Loader2, ImageIcon, X, Upload, Camera } from 'lucide-react'
import { FrontendService } from '@/types/frontend.types'
import { createService, updateService, toggleServiceActive } from '@/app/actions'
import { frontendServiceToDB } from '@/lib/adapters'
import { useRouter } from 'next/navigation'
import Switch from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import ImageCropper from '@/components/ui/image-cropper'

interface ServiceManagerProps {
  initialServices: FrontendService[]
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-lg overflow-hidden flex-shrink-0">
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
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Imagen</label>
                <div className="space-y-2">
                  {formData.image ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden bg-secondary">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <button
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full h-28 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 size={24} className="animate-spin text-primary" />
                          <span className="text-sm">Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={24} className="text-primary" />
                          <span className="text-sm font-medium">Subir foto</span>
                          <span className="text-xs text-muted-foreground">Tocá para abrir la galería</span>
                        </>
                      )}
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          showError('Imagen muy grande', 'El archivo debe ser menor a 5MB')
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setImageToCrop(event.target?.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                      e.target.value = '' // Reset to allow same file selection
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Nombre *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  placeholder="Ej: Manicura Gel"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Precio ($) *</label>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Duración (min) *</label>
                  <input
                    type="number"
                    value={formData.durationMin || ''}
                    onChange={(e) => setFormData({ ...formData, durationMin: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Descripción</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-secondary/20 border border-input focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Describe el tratamiento..."
                />
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
                  editingService ? 'Guardar' : 'Crear'
                )}
              </button>
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

              const data = await response.json()

              if (!response.ok) {
                throw new Error(data.error || 'Error al subir imagen')
              }

              setFormData(prev => ({ ...prev, image: data.url }))
              showSuccess('Imagen subida')
            } catch (error: any) {
              showError('Error al subir', error.message)
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

