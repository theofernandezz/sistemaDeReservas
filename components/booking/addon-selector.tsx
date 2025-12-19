'use client'

import { ServiceAddon, SelectedAddon } from '@/types/database.types'
import { Check, Clock, DollarSign } from 'lucide-react'

interface AddonSelectorProps {
  addons: ServiceAddon[]
  selectedAddons: SelectedAddon[]
  onToggle: (addon: ServiceAddon) => void
}

export default function AddonSelector({ addons, selectedAddons, onToggle }: AddonSelectorProps) {
  const isSelected = (addonId: string) =>
    selectedAddons.some(a => a.id === addonId)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (addons.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        ¿Necesitás algún servicio adicional?
      </p>

      <div className="space-y-2">
        {addons.map((addon) => {
          const selected = isSelected(addon.id)

          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => onToggle(addon)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-secondary/30'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30'
                  }`}>
                  {selected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="text-left">
                  <p className={`font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>
                    {addon.name}
                  </p>
                  {addon.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {addon.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className={`font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
                  +{formatPrice(addon.price)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  {addon.duration_minutes} min
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
