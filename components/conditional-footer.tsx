'use client'

import { usePathname } from 'next/navigation'
import type { Business } from '@/types/database.types'

interface ConditionalFooterProps {
  business: Business
}

export function ConditionalFooter({ business }: ConditionalFooterProps) {
  const pathname = usePathname()
  
  // Ocultar footer en rutas de booking
  const isBookingFlow = pathname.includes('/booking/')
  
  if (isBookingFlow) {
    return null
  }
  
  return (
    <footer className="py-3 sm:py-4 border-t border-border/40 mt-auto px-3 sm:px-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground lg:max-w-[1400px] lg:px-12">
        <span>© {new Date().getFullYear()} {business.name}</span>
        <a 
          href="https://buki.devora.lat" 
          target="_blank" 
          rel="noopener noreferrer"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          Powered by Buki
        </a>
      </div>
    </footer>
  )
}
