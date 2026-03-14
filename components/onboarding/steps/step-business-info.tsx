'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, Check, Loader2, AlertCircle, Store } from 'lucide-react'
import { checkSlugAvailability } from '@/app/actions/onboarding'
import { useDebouncedCallback } from 'use-debounce'

export interface BusinessInfoData {
  name: string
  slug: string
  logo: string | null
  description: string
}

interface StepBusinessInfoProps {
  data: BusinessInfoData
  onChange: (data: BusinessInfoData) => void
}

function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

  // Return fallback if slug is empty after sanitization
  return slug || 'mi-negocio'
}

export default function StepBusinessInfo({ data, onChange }: StepBusinessInfoProps) {
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [baseUrl] = useState(() => typeof window !== 'undefined' ? window.location.host : 'reserva.com')

  // Debounced slug check
  const checkSlug = useDebouncedCallback(async (slug: string) => {
    if (slug.length < 2) {
      setSlugStatus('idle')
      return
    }

    setSlugStatus('checking')
    try {
      const result = await checkSlugAvailability(slug)
      setSlugStatus(result.available ? 'available' : 'taken')
    } catch {
      setSlugStatus('idle')
    }
  }, 500)

  const handleNameChange = (value: string) => {
    const newSlug = slugTouched ? data.slug : generateSlug(value)
    onChange({ ...data, name: value, slug: newSlug })
    if (!slugTouched) {
      checkSlug(newSlug)
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    onChange({ ...data, slug: sanitized })
    checkSlug(sanitized)
  }

  const handleDescriptionChange = (value: string) => {
    if (value.length <= 160) {
      onChange({ ...data, description: value })
    }
  }

  // File upload handlers
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen válida')
      return
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > MAX_SIZE) {
      alert('La imagen es demasiado grande. El tamaño máximo es 5MB.')
      return
    }

    setUploadingLogo(true)

    // Convert to base64 for preview (actual upload happens on submit)
    const reader = new FileReader()
    reader.onload = (e) => {
      onChange({ ...data, logo: e.target?.result as string })
      setUploadingLogo(false)
    }
    reader.onerror = () => {
      alert('Error al cargar la imagen. Por favor, intenta de nuevo.')
      setUploadingLogo(false)
    }
    reader.readAsDataURL(file)
  }, [onChange, data])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const removeLogo = () => {
    onChange({ ...data, logo: null })
  }

  return (
    <div className="space-y-6">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName">Nombre del negocio *</Label>
        <Input
          id="businessName"
          placeholder="Ej: Estudio Creativo, Barbería Don Juan..."
          value={data.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Link de tu página *</Label>
        <div className="flex items-center">
          <span className="bg-muted border border-r-0 rounded-l-md px-3 h-12 flex items-center text-muted-foreground text-sm">
            {baseUrl}/
          </span>
          <div className="relative flex-1">
            <Input
              id="slug"
              placeholder="mi-negocio"
              value={data.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="h-12 rounded-l-none pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugStatus === 'checking' && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              {slugStatus === 'available' && <Check size={16} className="text-green-500" />}
              {slugStatus === 'taken' && <AlertCircle size={16} className="text-destructive" />}
            </div>
          </div>
        </div>
        {slugStatus === 'taken' && (
          <p className="text-sm text-destructive">Esta URL ya está en uso. Prueba con otra.</p>
        )}
        {slugStatus === 'available' && data.slug.length >= 2 && (
          <p className="text-sm text-green-600">¡URL disponible!</p>
        )}
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Logo (opcional)</Label>

        {data.logo ? (
          <div className="flex items-start gap-4">
            {/* Logo Preview */}
            <div className="relative">
              <img
                src={data.logo}
                alt="Logo preview"
                className="w-20 h-20 rounded-xl object-cover border"
              />
              <button
                onClick={removeLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
              >
                <X size={14} />
              </button>
            </div>

            {/* Preview Card */}
            <div className="flex-1 bg-muted/30 rounded-xl p-4 border border-dashed">
              <p className="text-xs text-muted-foreground mb-2">Así se verá en tu página:</p>
              <div className="flex items-center gap-3">
                <img src={data.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="font-semibold text-sm">{data.name || 'Tu Negocio'}</p>
                  <p className="text-xs text-muted-foreground">{baseUrl}/{data.slug || 'tu-negocio'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('logo-input')?.click()}
          >
            <input
              id="logo-input"
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {uploadingLogo ? (
              <Loader2 size={32} className="mx-auto text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Arrastra tu logo aquí o <span className="text-primary font-medium">haz clic para subir</span>
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG hasta 5MB</p>
              </>
            )}
          </div>
        )}

        {/* Preview without logo */}
        {!data.logo && data.name && (
          <div className="bg-muted/30 rounded-xl p-4 border border-dashed">
            <p className="text-xs text-muted-foreground mb-2">Sin logo, se verá así:</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{data.name}</p>
                <p className="text-xs text-muted-foreground">{baseUrl}/{data.slug || 'tu-negocio'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Descripción corta (opcional)</Label>
          <span className="text-xs text-muted-foreground">{data.description.length}/160</span>
        </div>
        <Textarea
          id="description"
          placeholder="Cuéntale a tus clientes qué haces en una frase..."
          value={data.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  )
}
