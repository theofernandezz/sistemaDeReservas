import { getGoogleCalendarSettings, getAdminNotificationEmail, getMercadoPagoStatus } from '@/app/actions'
import SettingsClient from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [calendarResult, adminEmail, mpResult] = await Promise.all([
    getGoogleCalendarSettings(),
    getAdminNotificationEmail(),
    getMercadoPagoStatus()
  ])

  const isConnected = calendarResult.success && calendarResult.data?.isConnected
  const isMPConnected = mpResult.success && mpResult.data?.isConnected
  const mpUserId = mpResult.data?.mpUserId

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground text-sm">
          Integraciones y ajustes del sistema
        </p>
      </div>

      <SettingsClient
        isGoogleConnected={isConnected || false}
        initialAdminEmail={adminEmail}
        isMPConnected={isMPConnected || false}
        mpUserId={mpUserId}
      />
    </div>
  )
}

