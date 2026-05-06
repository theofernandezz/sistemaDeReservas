'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProofUploadCardProps {
  appointmentId: string
  currentProofUrl?: string | null
  onUploadSuccess?: () => void
}

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
])

const MAX_SIZE_BYTES = 10 * 1024 * 1024

export function ProofUploadCard({
  appointmentId,
  currentProofUrl,
  onUploadSuccess,
}: ProofUploadCardProps) {
  const { error: showError, success: showSuccess } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedAt, setUploadedAt] = useState<Date | null>(null)
  const [uploaded, setUploaded] = useState(false)

  const alreadySent = currentProofUrl || uploaded

  async function handleFile(file: File) {
    setUploadError(null)

    if (!ACCEPTED_TYPES.has(file.type)) {
      const msg = 'Tipo de archivo no permitido. Subí JPG, PNG, HEIC, WEBP o PDF.'
      setUploadError(msg)
      showError('Archivo inválido', msg)
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      const msg = 'El archivo supera el límite de 10 MB.'
      setUploadError(msg)
      showError('Archivo muy grande', msg)
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('appointmentId', appointmentId)

      const res = await fetch('/api/upload/proof', {
        method: 'POST',
        body: formData,
      })

      const json = (await res.json()) as { success?: boolean; url?: string; error?: string }

      if (!res.ok || !json.success) {
        const msg = json.error || 'Error al subir el archivo. Intentá de nuevo.'
        setUploadError(msg)
        showError('Error al subir', msg)
        return
      }

      const now = new Date()
      setUploadedAt(now)
      setUploaded(true)
      setUploadError(null)
      showSuccess('Comprobante enviado', 'Lo revisaremos a la brevedad.')
      onUploadSuccess?.()
    } catch {
      const msg = 'No se pudo conectar. Verificá tu conexión e intentá de nuevo.'
      setUploadError(msg)
      showError('Sin conexión', msg)
    } finally {
      setIsUploading(false)
    }
  }

  function onDragOver(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function onDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  if (alreadySent) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
            Comprobante enviado
          </p>
          {uploadedAt && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              {format(uploadedAt, "d 'de' MMMM, HH:mm 'hs'", { locale: es })}
            </p>
          )}
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70 mt-1">
            El negocio lo está revisando. Te confirmamos pronto.
          </p>
          {currentProofUrl && (
            <a
              href={currentProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver comprobante
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.pdf"
        className="sr-only"
        aria-label="Seleccionar comprobante de pago"
        onChange={onInputChange}
        tabIndex={-1}
      />

      <button
        type="button"
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={isUploading}
        aria-label="Subir comprobante de pago — hacé click o arrastrá un archivo"
        className={cn(
          'w-full rounded-2xl border-2 border-dashed p-7 flex flex-col items-center gap-3',
          'transition-all duration-200 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50',
          isUploading && 'opacity-70 cursor-not-allowed scale-100'
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-9 h-9 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Subiendo comprobante...</p>
          </>
        ) : (
          <>
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
              isDragging
                ? 'bg-primary/15 text-primary'
                : 'bg-secondary text-muted-foreground'
            )}>
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? 'Soltá el archivo aquí' : 'Subí tu comprobante'}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, HEIC, PDF — máx. 10&nbsp;MB
              </p>
            </div>
          </>
        )}
      </button>

      {uploadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">{uploadError}</p>
        </div>
      )}
    </div>
  )
}
