import { getGoogleCalendarSettings, getAdminNotificationEmail, getMercadoPagoStatus } from '@/app/actions'
import { getCurrentBusiness } from '@/app/actions/auth'
import SettingsPage from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsServerPage() {
  const [calendarResultRaw, adminEmailRaw, mpResultRaw, businessResultRaw] = await Promise.allSettled([
    getGoogleCalendarSettings(),
    getAdminNotificationEmail(),
    getMercadoPagoStatus(),
    getCurrentBusiness()
  ])

  const calendarResult =
    calendarResultRaw.status === 'fulfilled'
      ? calendarResultRaw.value
      : { success: false, error: 'Error al cargar calendario' }

  const adminEmail =
    adminEmailRaw.status === 'fulfilled'
      ? adminEmailRaw.value
      : process.env.ADMIN_MAIL || 'reservas@example.com'

  const mpResult =
    mpResultRaw.status === 'fulfilled'
      ? mpResultRaw.value
      : { success: false, error: 'Error al cargar Mercado Pago' }

  const businessResult =
    businessResultRaw.status === 'fulfilled'
      ? businessResultRaw.value
      : { success: false, error: 'Error al cargar negocio' }

  const isConnected = calendarResult.success && calendarResult.data?.isConnected
  const isMPConnected = mpResult.success && mpResult.data?.isConnected
  const mpTokenValid = mpResult.data?.tokenValid ?? true
  const mpUserId = mpResult.data?.mpUserId
  const business = businessResult.success ? businessResult.data : null
  const reservationSettings = business?.settings
    ? {
        minAdvanceHours: business.settings.minAdvanceHours,
        cancellationHours: business.settings.cancellationHours
      }
    : undefined

  return (
    <SettingsPage
      isGoogleConnected={isConnected || false}
      initialAdminEmail={adminEmail}
      isMPConnected={isMPConnected || false}
      mpTokenValid={mpTokenValid}
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
      businessSettings={business?.settings ? {
        primaryColor: business.settings.primaryColor,
        accentColor: business.settings.accentColor
      } : undefined}
      reservationSettings={reservationSettings}
      businessName={business?.name}
    />
  )
}
