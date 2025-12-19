'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedImage: Blob) => void
  onCancel: () => void
  aspectRatio?: number
}

// Creates a cropped image from the source
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number = 800
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Calculate output dimensions maintaining aspect ratio
  const aspectRatio = pixelCrop.width / pixelCrop.height
  const outputHeight = outputWidth / aspectRatio

  canvas.width = outputWidth
  canvas.height = outputHeight

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas is empty'))
        }
      },
      'image/jpeg',
      0.85 // Quality - good balance between size and quality
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 16 / 9
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return

    setProcessing(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 800)
      onCropComplete(croppedImage)
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <button
          onClick={onCancel}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-medium">Ajustar imagen</span>
        <Button
          onClick={handleConfirm}
          disabled={processing}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Cropper Area */}
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropCompleteCallback}
          cropShape="rect"
          showGrid={true}
          style={{
            containerStyle: {
              background: '#000'
            }
          }}
        />
      </div>

      {/* Zoom Controls */}
      <div className="p-4 bg-black/80 flex items-center justify-center gap-4">
        <button
          onClick={() => setZoom(Math.max(1, zoom - 0.1))}
          className="text-white/80 hover:text-white transition-colors p-2"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-32 accent-primary"
        />

        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
          className="text-white/80 hover:text-white transition-colors p-2"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* Help Text */}
      <div className="p-3 bg-black/80 text-center">
        <p className="text-white/60 text-sm">
          Arrastrá para mover · Usá el slider para zoom
        </p>
      </div>
    </div>
  )
}
