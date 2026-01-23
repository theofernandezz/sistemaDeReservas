'use client'

import { useState, createContext, useContext, useCallback, ReactNode } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmDialogOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  onConfirm: () => Promise<void> | void
}

interface ConfirmContextType {
  confirm: (options: ConfirmDialogOptions) => void
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null)

  const confirm = useCallback((opts: ConfirmDialogOptions) => {
    setOptions(opts)
    setIsOpen(true)
  }, [])

  const handleConfirm = async () => {
    if (!options) return

    setIsLoading(true)
    try {
      await options.onConfirm()
    } finally {
      setIsLoading(false)
      setIsOpen(false)
      setOptions(null)
    }
  }

  const handleCancel = () => {
    if (isLoading) return
    setIsOpen(false)
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancel}
        />
      )}

      {/* Dialog */}
      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div className="flex items-center gap-3">
                {options.variant === 'danger' && (
                  <div className="shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif font-semibold text-lg text-foreground">
                    {options.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 pt-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {options.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-5 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                {options.cancelText || 'Cancelar'}
              </Button>
              <Button
                variant={options.variant === 'danger' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  options.confirmText || 'Confirmar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
