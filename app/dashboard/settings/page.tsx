import { getGoogleCalendarSettings, getAdminNotificationEmail, getMercadoPagoStatus } from '@/app/actions'
import { getCurrentBusiness } from '@/app/actions/auth'
import SettingsPage from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsServerPage() {
  const [calendarResult, adminEmail, mpResult, businessResult] = await Promise.all([
    getGoogleCalendarSettings(),
    getAdminNotificationEmail(),
    getMercadoPagoStatus(),
    getCurrentBusiness()
  ])

  const isConnected = calendarResult.success && calendarResult.data?.isConnected
  const isMPConnected = mpResult.success && mpResult.data?.isConnected
  const mpUserId = mpResult.data?.mpUserId
  const business = businessResult.success ? businessResult.data : null

  return (
    <SettingsPage
      isGoogleConnected={isConnected || false}
      initialAdminEmail={adminEmail}
      isMPConnected={isMPConnected || false}
      mpUserId={mpUserId}
      depositPercentage={business?.deposit_percentage || 100}
      businessId={business?.id}
      business={business ? {
        id: business.id,
        name: business.name || '',
        slug: business.slug || '',
        description: business.description || '',
        phone: business.phone || '',
        email: business.email || '',
        instagram: business.instagram || '',
        address: business.address || ''
      } : undefined}
    />
  )
}
