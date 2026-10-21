'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProofUploadCardProps {
  /** Signed manage token of the appointment (credential, not the id) */
  token: string
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
  token,
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
      formData.append('token', token)

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
      <div className="rounded-2xl border border-border p-5 flex items-start gap-3.5">
        <div className="shrink-0 w-9 h-9 rounded-full border-[1.5px] flex items-center justify-center" style={{ borderColor: '#16a34a', color: '#16a34a' }}>
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            Comprobante enviado
          </p>
          {uploadedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(uploadedAt, "d 'de' MMMM, HH:mm 'hs'", { locale: es })}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            El negocio lo está revisando. Te confirmamos pronto.
          </p>
          {currentProofUrl && (
            <a
              href={currentProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold hover:underline"
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
          'w-full rounded-2xl border-[1.5px] border-dashed p-6 flex flex-col items-center gap-2.5',
          'transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDragging ? 'border-muted-foreground/60' : 'border-border hover:border-muted-foreground/40',
          isUploading && 'opacity-70 cursor-not-allowed'
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            <p className="text-sm font-medium">Subiendo comprobante...</p>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={1.75} />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">
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
