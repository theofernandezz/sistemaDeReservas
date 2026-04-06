import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateBusiness } from '@/app/actions'
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
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Error', 'El nombre es obligatorio')
      return
    }
    if (!slug.trim()) {
      showError('Error', 'La URL es obligatoria')
      return
    }

    setSaving(true)
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
      setSaving(false)
    }
  }

  return (
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
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
