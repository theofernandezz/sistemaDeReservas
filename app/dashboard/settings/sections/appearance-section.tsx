import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateBusinessSettings } from '@/app/actions'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SettingsProps } from '../settings-types'

const PRESET_COLORS = [
  { name: 'Naranja', value: '#f97316' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Amarillo', value: '#eab308' },
  { name: 'Negro', value: '#000000' },
]

interface AppearanceSectionProps {
  businessSettings?: SettingsProps['businessSettings']
}

export function AppearanceSection({ businessSettings }: AppearanceSectionProps) {
  const [accentColor, setAccentColor] = useState(businessSettings?.accentColor || '#f97316')
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateBusinessSettings({ accentColor })
      if (result.success) {
        showSuccess('Guardado', 'Color actualizado correctamente')
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
        <label className="text-sm font-semibold tracking-tight mb-1.5 block text-foreground">Color de tu marca</label>
        <p className="text-sm text-muted-foreground/80 mb-5">
          Se usa en botones, precios y elementos destacados de tu página de reservas
        </p>

        <div className="inline-flex flex-wrap gap-2.5 mb-5 p-3 bg-card/40 backdrop-blur-xl border border-white/5 shadow-sm rounded-3xl">
          {PRESET_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => setAccentColor(color.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                accentColor === color.value
                  ? 'border-foreground scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.2)] z-10'
                  : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100 hover:shadow-md'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative overflow-hidden rounded-xl h-11 w-12 border border-border shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all shrink-0">
            <input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
            />
          </div>
          <div className="bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Input
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              placeholder="#f97316"
              className="w-28 font-mono text-[15px] font-medium border-0 bg-transparent focus-visible:ring-0 shadow-none uppercase"
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground/60 tracking-tight">o elegí un color personalizado</span>
        </div>
      </div>

      <div className="pt-6 mt-2 border-t border-border/40">
        <label className="text-sm font-semibold tracking-tight mb-3 block text-foreground">Vista previa</label>
        <div className="p-5 rounded-2xl border border-white/5 shadow-inner bg-card/30 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 bg-card/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-sm transition-transform hover:-translate-y-0.5 duration-300">
            <div>
              <p className="font-semibold tracking-tight text-[15px] text-foreground">Corte de cabello</p>
              <p className="text-xs font-medium text-muted-foreground/80 mt-0.5">30 min</p>
            </div>
            <div className="flex items-center gap-3.5">
              <span
                className="font-bold tracking-tight text-lg drop-shadow-sm"
                style={{ color: accentColor }}
              >
                $25
              </span>
              <button
                className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-md shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                Reservar
              </button>
            </div>
          </div>
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
