import type { ReactNode } from 'react'

export interface SettingsProps {
  isGoogleConnected: boolean
  initialAdminEmail: string
  isMPConnected: boolean
  mpTokenValid?: boolean
  mpUserId?: string
  depositPercentage: number
  businessId?: string
  reservationSettings?: {
    minAdvanceHours?: number
    maxAdvanceDays?: number
    cancellationHours?: number
  }
  businessName?: string
  business?: {
    id: string
    name: string
    slug: string
    description?: string
    phone?: string
    email?: string
    instagram?: string
    address?: string
  }
  businessSettings?: {
    primaryColor?: string
    accentColor?: string
  }
  paymentSettings?: {
    paymentFlowMode: 'mercadopago' | 'manual_transfer'
    manualTransfer: {
      enabled: boolean
      alias: string
      cvu: string
      accountHolder: string
      message: string
    }
  }
}

export type SectionId =
  | 'profile'
  | 'contact'
  | 'appearance'
  | 'reservations'
  | 'payments'
  | 'integrations'
  | 'notifications'
  | 'account'

export interface Section {
  id: SectionId
  label: string
  icon: ReactNode
  description: string
}
