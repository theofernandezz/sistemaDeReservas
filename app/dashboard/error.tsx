'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Algo salió mal
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ocurrió un error al cargar esta página. Por favor intentá nuevamente.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            variant="default"
          >
            Reintentar
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
          >
            Ir al inicio
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
