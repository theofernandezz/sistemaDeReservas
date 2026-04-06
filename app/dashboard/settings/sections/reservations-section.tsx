import { useEffect, useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateBusinessSettings } from '@/app/actions'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SettingsProps } from '../settings-types'

interface ReservationsSectionProps {
  reservationSettings?: SettingsProps['reservationSettings']
}

export function ReservationsSection({ reservationSettings }: ReservationsSectionProps) {
  const initialMinAdvance = reservationSettings?.minAdvanceHours ?? 2
  const initialCancelHours = reservationSettings?.cancellationHours ?? 24

  const [minAdvance, setMinAdvance] = useState(String(initialMinAdvance))
  const [cancelHours, setCancelHours] = useState(String(initialCancelHours))
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  useEffect(() => {
    setMinAdvance(String(initialMinAdvance))
    setCancelHours(String(initialCancelHours))
  }, [initialMinAdvance, initialCancelHours])

  const handleSave = async () => {
    const minAdvanceValue = Number(minAdvance)
    const cancelHoursValue = Number(cancelHours)

    if (Number.isNaN(minAdvanceValue) || Number.isNaN(cancelHoursValue)) {
      showError('Error', 'Ingresá valores válidos')
      return
    }

    setSaving(true)
    try {
      const result = await updateBusinessSettings({
        minAdvanceHours: Math.max(0, minAdvanceValue),
        cancellationHours: Math.max(0, cancelHoursValue),
      })
      if (result.success) {
        showSuccess('Guardado', 'Configuración de reservas actualizada')
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
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Anticipación mínima</label>
        <p className="text-sm text-muted-foreground/80 mb-3">
          Cuántas horas antes del turno se puede reservar
        </p>
        <div className="flex items-center gap-3">
          <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              type="number"
              value={minAdvance}
              onChange={e => setMinAdvance(e.target.value)}
              className="pl-10 w-28 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
              min="0"
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground/60 tracking-tight">horas</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Cancelación permitida hasta</label>
        <p className="text-sm text-muted-foreground/80 mb-3">
          Hasta cuántas horas antes se puede cancelar sin penalidad
        </p>
        <div className="flex items-center gap-3">
          <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              type="number"
              value={cancelHours}
              onChange={e => setCancelHours(e.target.value)}
              className="pl-10 w-28 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
              min="0"
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground/60 tracking-tight">horas antes</span>
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
