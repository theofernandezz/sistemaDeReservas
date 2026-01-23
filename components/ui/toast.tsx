'use client'

import { useState, createContext, useContext, useCallback, ReactNode } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextType {
  toast: (options: { type: ToastType; title: string; description?: string }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ type, title, description }: { type: ToastType; title: string; description?: string }) => {
    const id = Math.random().toString(36).slice(2)
    const newToast = { id, type, title, description }

    setToasts(prev => [...prev, newToast])

    // Auto remove after 4 seconds
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  const success = useCallback((title: string, description?: string) => {
    toast({ type: 'success', title, description })
  }, [toast])

  const error = useCallback((title: string, description?: string) => {
    toast({ type: 'error', title, description })
  }, [toast])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-200 ${bgColors[t.type]}`}
          >
            <div className="shrink-0 mt-0.5">
              {icons[t.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{t.title}</p>
              {t.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
