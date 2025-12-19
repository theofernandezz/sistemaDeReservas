'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cancelAppointment } from '@/app/actions'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function CancelForm({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await cancelAppointment(appointmentId, 'Cancelado por el cliente')
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Error al cancelar')
      }
    } catch {
      setError('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        variant="destructive"
        className={cn(
          "w-full h-12 text-base font-medium shadow-md transition-all",
          "hover:bg-red-600 hover:shadow-lg hover:-translate-y-0.5"
        )}
        onClick={handleCancel}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Confirmar Cancelación
      </Button>

      <p className="text-xs text-center text-muted-foreground/80">
        Esta acción liberará el horario inmediatamente.
      </p>
    </div>
  )
}
