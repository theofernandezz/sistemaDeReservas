'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Business } from '@/types/database.types'

interface BusinessContextType {
  business: Business | null
  isLoading: boolean
}

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  isLoading: true,
})

export function BusinessProvider({
  children,
  business,
  isLoading = false,
}: {
  children: ReactNode
  business: Business | null
  isLoading?: boolean
}) {
  return (
    <BusinessContext.Provider value={{ business, isLoading }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}

export function useRequiredBusiness() {
  const { business, isLoading } = useBusiness()
  if (!isLoading && !business) {
    throw new Error('Business is required but not available')
  }
  return { business: business!, isLoading }
}
