'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Service, ServiceAddon, SelectedAddon } from '@/types/database.types'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddonSelector from '@/components/booking/addon-selector'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface AddonsPageClientProps {
  service: Service
  addons: ServiceAddon[]
  selectedDate: string
  selectedTime: string
}

export default function AddonsPageClient({
  service,
  addons,
  selectedDate,
  selectedTime
}: AddonsPageClientProps) {
  const router = useRouter()
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])

  const handleToggleAddon = (addon: ServiceAddon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id)
      if (exists) {
        return prev.filter(a => a.id !== addon.id)
      } else {
        return [...prev, {
          id: addon.id,
          name: addon.name,
          price: addon.price,
          duration_minutes: addon.duration_minutes
        }]
      }
    })
  }

  const handleContinue = () => {
    // Pass selected addons to confirm page via URL params
    const addonsParam = selectedAddons.length > 0
      ? `&addons=${encodeURIComponent(JSON.stringify(selectedAddons))}`
      : ''

    router.push(`/booking/${service.id}/confirm?date=${selectedDate}&time=${selectedTime}${addonsParam}`)
  }

  const handleBack = () => {
    router.push(`/booking/${service.id}?date=${selectedDate}`)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const totalAddonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const totalAddonsTime = selectedAddons.reduce((sum, a) => sum + a.duration_minutes, 0)
  const totalPrice = service.price + totalAddonsPrice
  const totalTime = service.duration_minutes + totalAddonsTime

  // Format date for display
  const dateObj = parseISO(selectedDate)
  const formattedDate = format(dateObj, "EEEE d 'de' MMMM", { locale: es })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-lg">Servicios adicionales</h1>
                <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Opcional</span>
              </div>
              <p className="text-sm text-muted-foreground">{service.name}</p>
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="text-sm text-primary hover:underline font-medium"
          >
            Omitir
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Booking Summary */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{capitalizedDate}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{selectedTime}</span>
            </div>
          </div>
        </div>

        {/* Addons List */}
        {addons.length > 0 ? (
          <AddonSelector
            addons={addons}
            selectedAddons={selectedAddons}
            onToggle={handleToggleAddon}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay servicios adicionales disponibles</p>
          </div>
        )}
      </div>

      {/* Bottom Fixed Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-lg mx-auto">
          {/* Price Summary */}
          <div className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{service.name}</span>
              <span>{formatPrice(service.price)}</span>
            </div>
            {selectedAddons.map(addon => (
              <div key={addon.id} className="flex justify-between text-muted-foreground">
                <span>+ {addon.name}</span>
                <span>{formatPrice(addon.price)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border">
              <span>Total ({totalTime} min)</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-12"
          >
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
