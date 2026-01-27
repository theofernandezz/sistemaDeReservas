'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentBusiness } from '@/app/actions/auth'
import {
  Notification,
  NotificationFilters,
  NotificationType,
  ServerActionResponse,
} from '@/types/database.types'

// ============================================
// Helper: Get current business ID
// ============================================

async function requireBusinessId(): Promise<string> {
  const result = await getCurrentBusiness()
  if (!result.success || !result.data) {
    throw new Error('No business found for current user')
  }
  return result.data.id
}

// ============================================
// GET: Fetch notifications
// ============================================

export async function getNotifications(
  filters?: NotificationFilters
): Promise<ServerActionResponse<Notification[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data as Notification[] }
  } catch (error: unknown) {
    console.error('Error fetching notifications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener notificaciones',
    }
  }
}

// ============================================
// GET: Fetch unread count
// ============================================

export async function getUnreadNotificationCount(): Promise<ServerActionResponse<number>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_read', false)

    if (error) throw error

    return { success: true, data: count || 0 }
  } catch (error: unknown) {
    console.error('Error fetching unread count:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener contador',
    }
  }
}

// ============================================
// GET: Fetch notifications with count (optimized)
// ============================================

export async function getNotificationsWithCount(
  filters?: NotificationFilters
): Promise<ServerActionResponse<{ notifications: Notification[]; unreadCount: number }>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    // Fetch notifications and count in parallel with same businessId
    const [notificationsResult, countResult] = await Promise.all([
      (async () => {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        // Apply filters
        if (filters?.type) {
          query = query.eq('type', filters.type)
        }
        if (filters?.is_read !== undefined) {
          query = query.eq('is_read', filters.is_read)
        }
        if (filters?.limit) {
          query = query.limit(filters.limit)
        }
        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
        }

        return await query
      })(),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_read', false)
    ])

    if (notificationsResult.error) throw notificationsResult.error
    if (countResult.error) throw countResult.error

    return {
      success: true,
      data: {
        notifications: notificationsResult.data as Notification[],
        unreadCount: countResult.count || 0,
      },
    }
  } catch (error: unknown) {
    console.error('Error fetching notifications with count:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener notificaciones',
    }
  }
}

// ============================================
// UPDATE: Mark notification as read
// ============================================

export async function markNotificationAsRead(
  notificationId: string
): Promise<ServerActionResponse<Notification>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: data as Notification }
  } catch (error: unknown) {
    console.error('Error marking notification as read:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al marcar como leída',
    }
  }
}

// ============================================
// UPDATE: Mark notification as unread
// ============================================

export async function markNotificationAsUnread(
  notificationId: string
): Promise<ServerActionResponse<Notification>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: false,
        read_at: null,
      })
      .eq('id', notificationId)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: data as Notification }
  } catch (error: unknown) {
    console.error('Error marking notification as unread:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al marcar como no leída',
    }
  }
}

// ============================================
// UPDATE: Mark all notifications as read
// ============================================

export async function markAllNotificationsAsRead(): Promise<ServerActionResponse<number>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('is_read', false)
      .select()

    if (error) throw error

    return { success: true, data: data?.length || 0 }
  } catch (error: unknown) {
    console.error('Error marking all as read:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al marcar todas como leídas',
    }
  }
}

// ============================================
// DELETE: Delete notification
// ============================================

export async function deleteNotification(
  notificationId: string
): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('business_id', businessId)

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    console.error('Error deleting notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar notificación',
    }
  }
}

// ============================================
// DELETE: Delete all read notifications
// ============================================

export async function deleteAllReadNotifications(): Promise<ServerActionResponse<number>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('business_id', businessId)
      .eq('is_read', true)
      .select()

    if (error) throw error

    return { success: true, data: data?.length || 0 }
  } catch (error: unknown) {
    console.error('Error deleting read notifications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar notificaciones',
    }
  }
}

// ============================================
// CREATE: Helper to create notification (for server-side use)
// ============================================

export async function createNotification(
  businessId: string,
  type: NotificationType,
  title: string,
  message: string,
  appointmentId?: string,
  metadata?: Record<string, unknown>
): Promise<ServerActionResponse<Notification>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        business_id: businessId,
        type,
        title,
        message,
        appointment_id: appointmentId || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: data as Notification }
  } catch (error: unknown) {
    console.error('Error creating notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear notificación',
    }
  }
}
