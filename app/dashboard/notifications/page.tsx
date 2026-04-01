import { getNotifications } from '@/app/actions/notifications'
import { NotificationsClient } from '@/components/dashboard/notifications-client'
import type { Notification } from '@/types/database.types'

export default async function NotificationsPage() {
  const result = await getNotifications({ limit: 100 })

  const notifications: Notification[] = (result.success && result.data)
    ? result.data.filter(n => n.type !== 'payment_failed')
    : []

  return <NotificationsClient initialNotifications={notifications} />
}
