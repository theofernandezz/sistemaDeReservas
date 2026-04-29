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
  const [baseUrl] = useState(() => {
    if (typeof window === 'undefined') return 'reserva.com'
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || window.location.host
  })

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
      {/* Basic Info Card */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Store size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Datos básicos</h3>
            <p className="text-sm text-muted-foreground">Información principal de tu negocio</p>
          </div>
        </div>

        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Nombre del negocio *</Label>
          <Input
            id="businessName"
            placeholder="Ej: Estudio Creativo, Barbería Don Juan..."
            value={data.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">Link de tu página *</Label>
          <div className="flex items-center">
            <span className="bg-muted border border-r-0 rounded-l-md px-3 h-11 flex items-center text-muted-foreground text-sm">
              {baseUrl}/
            </span>
            <div className="relative flex-1">
              <Input
                id="slug"
                placeholder="mi-negocio"
                value={data.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="h-11 rounded-l-none pr-10"
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
      </div>

      {/* Logo Card */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Upload size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Logo (opcional)</h3>
            <p className="text-sm text-muted-foreground">PNG, JPG hasta 5MB</p>
          </div>
        </div>

        {data.logo ? (
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              <img
                src={data.logo}
                alt="Logo preview"
                className="w-24 h-24 rounded-xl object-cover border shadow-sm"
              />
              <button
                onClick={removeLogo}
                className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'}
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
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Upload size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Arrastra tu logo aquí o <span className="text-primary font-medium">haz clic para subir</span>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Live Preview Card */}
      {(data.name || data.logo) && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Así se verá tu página</p>
          <div className="flex items-center gap-4">
            {data.logo ? (
              <img src={data.logo} alt="" className="w-14 h-14 rounded-xl object-cover border shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store size={24} className="text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{data.name || 'Tu Negocio'}</p>
              <p className="text-sm text-muted-foreground">{baseUrl}/{data.slug || 'tu-negocio'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Description Card */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Descripción</h3>
              <p className="text-sm text-muted-foreground">Opcional · Máximo 160 caracteres</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{data.description.length}/160</span>
        </div>
        <Textarea
          id="description"
          placeholder="Cuéntale a tus clientes qué haces en una frase..."
          value={data.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  )
}
