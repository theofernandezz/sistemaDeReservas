import { getGoogleCalendarSettings, getAdminNotificationEmail } from '@/app/actions'
import SettingsClient from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [calendarResult, adminEmail] = await Promise.all([
    getGoogleCalendarSettings(),
    getAdminNotificationEmail()
  ])

  const isConnected = calendarResult.success && calendarResult.data?.isConnected

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground text-sm">
          Integraciones y ajustes del sistema
        </p>
      </div>

      <SettingsClient
        isGoogleConnected={isConnected || false}
        initialAdminEmail={adminEmail}
      />
    </div>
  )
}
