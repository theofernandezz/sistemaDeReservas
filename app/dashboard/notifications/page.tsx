'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Trash2, Calendar, CreditCard, AlertCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/app/actions/notifications'
import type { Notification, NotificationType } from '@/types/database.types'

const notificationTypeConfig: Record<NotificationType, {
  icon: typeof Bell
  color: string
  bgColor: string
  label: string
}> = {
  appointment_created: {
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Nueva reserva',
  },
  appointment_confirmed: {
    icon: Check,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Confirmada',
  },
  appointment_cancelled: {
    icon: Calendar,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Cancelada',
  },
  appointment_reminder: {
    icon: Bell,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Recordatorio',
  },
  payment_received: {
    icon: CreditCard,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Pago recibido',
  },
  payment_failed: {
    icon: CreditCard,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Pago fallido',
  },
  system: {
    icon: AlertCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Sistema',
  },
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins}m`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`

  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getNotifications({ limit: 100 })
      if (result.success && result.data) {
        const visible = result.data.filter(n => n.type !== 'payment_failed')
        setNotifications(visible)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      )
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    const result = await markNotificationAsUnread(id)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: false, read_at: null } : n))
      )
    }
  }

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteNotification(id)
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter)

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <h1 className="text-lg font-semibold">Notificaciones</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              <CheckCheck size={16} />
              Marcar todas
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'appointment_created', label: 'Nuevas' },
            { key: 'payment_received', label: 'Pagos' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as NotificationType | 'all')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap',
                filter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground bg-secondary/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell size={32} className="text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Sin notificaciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'all' ? 'No tienes notificaciones aún' : 'No hay notificaciones de este tipo'}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => {
            const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system
            const Icon = config.icon

            return (
              <div
                key={notification.id}
                className={cn(
                  'flex gap-3 p-4 transition-colors',
                  !notification.is_read && 'bg-primary/5'
                )}
              >
                {/* Icon */}
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.bgColor)}>
                  <Icon size={18} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium', !notification.is_read && 'text-foreground')}>
                      {notification.title}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground/70">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      {notification.is_read ? (
                        <button
                          onClick={() => handleMarkAsUnread(notification.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <Bell size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
