'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Trash2, X, Calendar, CreditCard, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getNotificationsWithCount,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/app/actions/notifications'
import type { Notification, NotificationType } from '@/types/database.types'

// ============================================
// Notification Type Config
// ============================================

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
    icon: X,
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

// ============================================
// Helper: Format relative time
// ============================================

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

// ============================================
// NotificationItem Component
// ============================================

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onMarkAsUnread: (id: string) => void
  onDelete: (id: string) => void
  onClick: () => void
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system
  const Icon = config.icon

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 pr-14 transition-colors hover:bg-secondary/50 cursor-pointer',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      {/* Icon with unread indicator */}
      <div className="relative shrink-0">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', config.bgColor)}>
          <Icon size={16} className={config.color} />
        </div>
        {/* Unread dot badge */}
        {!notification.is_read && (
          <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium line-clamp-1', !notification.is_read && 'text-foreground')}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <span className="text-xs text-muted-foreground/70 mt-1 block">
          {formatRelativeTime(notification.created_at)}
        </span>
      </div>

      {/* Actions - always visible with background on hover for clarity */}
      <div className="absolute right-2 top-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-md p-0.5">
        {notification.is_read ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsUnread(notification.id)
            }}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Marcar como no leída"
          >
            <Bell size={14} />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead(notification.id)
            }}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Marcar como leída"
          >
            <Check size={14} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ============================================
// NotificationCenter Component
// ============================================

export function NotificationCenter() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef(60000) // Start at 60 seconds
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch notifications and count
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getNotificationsWithCount({ limit: 50 })

      if (result.success && result.data) {
        const visibleNotifications = result.data.notifications.filter(
          (notification) => notification.type !== 'payment_failed'
        )

        // Detect if new notifications arrived
        const hasNewNotifications = result.data.unreadCount > unreadCount

        setNotifications(visibleNotifications)
        setUnreadCount(result.data.unreadCount)

        // Adaptive polling: reset to 60s if new notifications, otherwise back off
        if (hasNewNotifications) {
          pollIntervalRef.current = 60000 // Reset to 60s
        } else {
          // Back off to max 5 minutes (300000ms)
          pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 300000)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [unreadCount])

  // Initial fetch and adaptive polling with visibility detection
  useEffect(() => {
    fetchNotifications()

    // Adaptive polling using setTimeout instead of setInterval
    const schedulePoll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        // Only poll if tab is visible
        if (document.visibilityState === 'visible') {
          fetchNotifications()
        }
        schedulePoll() // Schedule next poll
      }, pollIntervalRef.current)
    }

    schedulePoll()

    // Fetch immediately when tab becomes visible again and reset interval
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollIntervalRef.current = 60000 // Reset to 60s
        fetchNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handlers
  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    const result = await markNotificationAsUnread(id)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false, read_at: null } : n))
      )
      setUnreadCount((prev) => prev + 1)
    }
  }

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    }
  }

  const handleDelete = async (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    const result = await deleteNotification(id)
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
  }

  // Filter notifications
  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === 'appointment_created')

  // Handle notification click - navigate to reminders and mark as read
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }
    setIsOpen(false)
    router.push('/dashboard/reminders')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-secondary/60 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={18} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - slide from bottom on mobile, positioned dropdown on desktop */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/50 sm:hidden z-[60]"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div className="fixed left-0 right-0 bottom-0 h-[80vh] sm:absolute sm:left-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:h-auto sm:w-96 sm:max-h-[calc(100vh-120px)] rounded-t-2xl sm:rounded-xl border-t sm:border border-border bg-background shadow-xl animate-in slide-in-from-bottom sm:slide-in-from-top-2 duration-200 flex flex-col overflow-hidden z-[70]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline">Marcar todas</span>
                  </button>
                )}
                {/* Close button - visible on mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                  filter === 'pending'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                <Clock size={12} />
                Pendientes
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                    <Bell size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Sin notificaciones</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filter === 'all'
                      ? 'No tienes notificaciones aun'
                      : 'No hay notificaciones de este tipo'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onMarkAsUnread={handleMarkAsUnread}
                      onDelete={handleDelete}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
