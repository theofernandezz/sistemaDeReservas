'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  /** Current image URL */
  value?: string
  /** Callback when image changes */
  onChange: (imageUrl: string) => void
  /** Callback when crop is requested */
  onCropRequest: (imageDataUrl: string) => void
  /** Label text */
  label?: string
  /** ID for the input */
  id?: string
  /** Whether upload is in progress */
  isUploading?: boolean
  /** Maximum file size in MB */
  maxSizeMB?: number
  /** Custom class name */
  className?: string
  /** Error callback */
  onError?: (title: string, message: string) => void
}

export function ImageUpload({
  value,
  onChange,
  onCropRequest,
  label = 'Imagen',
  id = 'image-upload',
  isUploading = false,
  maxSizeMB = 5,
  className,
  onError,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      onError?.(
        'Imagen muy grande',
        `El archivo debe ser menor a ${maxSizeMB}MB`
      )
      return
    }

    // Read file and trigger crop
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onCropRequest(result)
      }
    }
    reader.readAsDataURL(file)

    // Reset input to allow same file selection
    event.target.value = ''
  }

  const handleRemoveImage = () => {
    onChange('')
  }

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="block text-foreground mb-2">
          {label}
        </Label>
      )}
      
      <div className="space-y-2">
        {value ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-secondary">
            <img
              src={value}
              alt="Vista previa"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemoveImage}
              className={cn(
                'absolute top-2 right-2',
                'h-8 w-8 rounded-full',
                'shadow-lg transition-all duration-200',
                'hover:scale-110'
              )}
              aria-label="Eliminar imagen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'w-full h-28',
              'border-2 border-dashed',
              'flex flex-col items-center justify-center gap-2',
              'transition-all duration-200',
              'hover:border-primary/50 hover:bg-primary/5',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
            aria-label="Cargar imagen"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Subiendo...</span>
              </>
            ) : (
              <>
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Subir foto</span>
                <span className="text-xs text-muted-foreground">
                  Tocá para seleccionar una imagen
                </span>
              </>
            )}
          </Button>
        )}

        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Seleccionar archivo de imagen"
          disabled={isUploading}
        />
      </div>
    </div>
  )
}
