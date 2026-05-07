'use client'

import { useState, useCallback } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateBusiness, updateBusinessLogo } from '@/app/actions'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SettingsProps } from '../settings-types'

interface ProfileSectionProps {
  business?: SettingsProps['business']
}

export function ProfileSection({ business }: ProfileSectionProps) {
  const [name, setName] = useState(business?.name || '')
  const [slug, setSlug] = useState(business?.slug || '')
  const [description, setDescription] = useState(business?.description || '')
  const [logo, setLogo] = useState<string | null>(business?.logo ?? null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showError('Error', 'El nombre es obligatorio')
      return
    }
    if (!slug.trim()) {
      showError('Error', 'La URL es obligatoria')
      return
    }

    setSavingProfile(true)
    try {
      const result = await updateBusiness({ name, slug, description: description || null })
      if (result.success) {
        showSuccess('Guardado', 'Perfil actualizado correctamente')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch {
      showError('Error', 'No se pudo guardar')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('Error', 'Por favor, seleccioná una imagen válida')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Error', 'La imagen es demasiado grande. El tamaño máximo es 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setLogo(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [showError])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleSaveLogo = async () => {
    setSavingLogo(true)
    try {
      const result = await updateBusinessLogo(logo)
      if (result.success) {
        showSuccess('Guardado', 'Logo actualizado correctamente')
        if (result.data?.logoUrl) setLogo(result.data.logoUrl)
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar el logo')
      }
    } catch {
      showError('Error', 'No se pudo guardar el logo')
    } finally {
      setSavingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    setLogo(null)
    setSavingLogo(true)
    try {
      const result = await updateBusinessLogo(null)
      if (result.success) {
        showSuccess('Guardado', 'Logo eliminado')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo eliminar el logo')
      }
    } catch {
      showError('Error', 'No se pudo eliminar el logo')
    } finally {
      setSavingLogo(false)
    }
  }

  const logoChanged = logo !== (business?.logo ?? null)

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Logo del negocio</p>
          <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG hasta 5MB</p>
        </div>

        {logo ? (
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={logo}
                alt="Logo"
                className="w-20 h-20 rounded-xl object-cover border border-white/10 shadow-sm"
              />
              <button
                onClick={() => setLogo(null)}
                disabled={savingLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-sm disabled:opacity-50"
              >
                <X size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('logo-input-settings')?.click()}
                disabled={savingLogo}
                className="rounded-xl text-xs"
              >
                Cambiar logo
              </Button>
              {logoChanged && (
                <Button
                  size="sm"
                  onClick={handleSaveLogo}
                  disabled={savingLogo}
                  className="rounded-xl text-xs hover:-translate-y-0.5 shadow transition-all duration-300"
                >
                  {savingLogo && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Guardar logo
                </Button>
              )}
              {!logoChanged && business?.logo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={savingLogo}
                  className="rounded-xl text-xs text-destructive hover:text-destructive"
                >
                  {savingLogo && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Eliminar logo
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`
              border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-primary/40 hover:bg-muted/20'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('logo-input-settings')?.click()}
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <Upload size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Arrastrá tu logo aquí o{' '}
              <span className="text-primary font-medium">hacé clic para subir</span>
            </p>
          </div>
        )}

        <input
          id="logo-input-settings"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {logo && !logoChanged && !business?.logo && (
          <Button
            size="sm"
            onClick={handleSaveLogo}
            disabled={savingLogo}
            className="rounded-xl hover:-translate-y-0.5 shadow transition-all duration-300"
          >
            {savingLogo && <Loader2 size={14} className="animate-spin mr-2" />}
            Guardar logo
          </Button>
        )}
      </div>

      <div className="border-t border-white/5" />

      {/* Profile fields */}
      <div className="space-y-6">
        <div>
          <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Nombre del negocio</label>
          <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mi Negocio"
              className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">URL pública (slug)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground/60">reservar.app/</span>
            <div className="flex-1 bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                placeholder="mi-negocio"
                className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Descripción</label>
          <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Contá brevemente de qué se trata tu negocio..."
              rows={3}
              className="w-full px-3 py-2 border-0 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
            {savingProfile && <Loader2 size={16} className="animate-spin mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  )
}
