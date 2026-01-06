'use client'

import { useState, useTransition } from 'react'
import { Business } from '@/types/database.types'
import { setActiveBusiness, clearActiveBusiness } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Eye, X } from 'lucide-react'

interface BusinessSelectorProps {
  businesses: Business[]
  currentBusiness: Business & { isViewing?: boolean }
}

export function BusinessSelector({ businesses, currentBusiness }: BusinessSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSelectBusiness = (businessId: string) => {
    startTransition(async () => {
      await setActiveBusiness(businessId)
      setIsOpen(false)
      router.refresh()
    })
  }

  const handleClearViewing = () => {
    startTransition(async () => {
      await clearActiveBusiness()
      router.refresh()
    })
  }

  return (
    <div className="relative">
      {/* Current business indicator */}
      {currentBusiness.isViewing && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-xs">
          <Eye className="h-3 w-3" />
          <span>Viendo como</span>
          <button
            onClick={handleClearViewing}
            disabled={isPending}
            className="ml-auto p-0.5 hover:bg-amber-500/20 rounded"
            title="Volver a mi cuenta"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left truncate font-medium">
          {currentBusiness.name}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            <div className="p-1">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleSelectBusiness(business.id)}
                  disabled={isPending}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${business.id === currentBusiness.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{business.name}</p>
                    <p className="text-xs text-muted-foreground truncate">/{business.slug}</p>
                  </div>
                  {business.id === currentBusiness.id && (
                    <div className="h-2 w-2 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
