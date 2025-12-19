'use server'

import { createClient } from '@/utils/supabase/server'
import {
  Service,
  Appointment,
  BlockedSlot,
  AppointmentWithService,
  CreateServiceInput,
  UpdateServiceInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CreateBlockedSlotInput,
  UpdateBlockedSlotInput,
  ServerActionResponse,
  AppointmentFilters,
  TimeSlot,
  ServiceAddon,
  CreateServiceAddonInput,
  UpdateServiceAddonInput
} from '@/types/database.types'

// ============================================
// SERVICES - CRUD Operations
// ============================================

/**
 * Get all active services
 */
export async function getServices(): Promise<ServerActionResponse<Service[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching services:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all services (including inactive)
 */
export async function getAllServices(): Promise<ServerActionResponse<Service[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching all services:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get service by ID
 */
export async function getServiceById(id: string): Promise<ServerActionResponse<Service>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching service:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a new service
 */
export async function createService(input: CreateServiceInput): Promise<ServerActionResponse<Service>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .insert([{
        name: input.name,
        duration_minutes: input.duration_minutes,
        price: input.price,
        is_active: input.is_active ?? true
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error creating service:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update an existing service
 */
export async function updateService(id: string, input: UpdateServiceInput): Promise<ServerActionResponse<Service>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .update(input)
      .eq('id', id)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Servicio no encontrado')
    }

    return { success: true, data: data[0] }
  } catch (error: any) {
    console.error('Error updating service:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Toggle service active status
 */
export async function toggleServiceActive(id: string): Promise<ServerActionResponse<Service>> {
  try {
    const supabase = await createClient()

    // Get current status
    const { data: services, error: fetchError } = await supabase
      .from('services')
      .select('is_active')
      .eq('id', id)

    if (fetchError) throw fetchError
    if (!services || services.length === 0) {
      throw new Error('Servicio no encontrado')
    }

    const service = services[0]

    // Toggle it
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', id)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Error al actualizar')
    }

    return { success: true, data: data[0] }
  } catch (error: any) {
    console.error('Error toggling service:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a service (soft delete by marking inactive)
 */
export async function deleteService(id: string): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting service:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// APPOINTMENTS - CRUD Operations
// ============================================

/**
 * Get appointments with optional filters
 */
export async function getAppointments(filters?: AppointmentFilters): Promise<ServerActionResponse<AppointmentWithService[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .order('start_time', { ascending: true })

    // Apply filters
    if (filters?.startDate) {
      query = query.gte('start_time', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('start_time', filters.endDate)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.serviceId) {
      query = query.eq('service_id', filters.serviceId)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get appointment by ID with service data
 */
export async function getAppointmentById(id: string): Promise<ServerActionResponse<AppointmentWithService>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching appointment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<ServerActionResponse<Appointment>> {
  try {
    const supabase = await createClient()

    // Check for overlapping appointments (prevent double booking)
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .neq('status', 'cancelled')
      .or(`and(start_time.lt.${input.end_time},end_time.gt.${input.start_time})`)

    if (checkError) throw checkError

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        success: false,
        error: 'Este horario ya no está disponible. Por favor selecciona otro.'
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        start_time: input.start_time,
        end_time: input.end_time,
        client_name: input.client_name,
        client_phone: input.client_phone,
        client_email: input.client_email,
        status: input.status || 'pending',
        service_id: input.service_id
      }])
      .select()
      .single()

    if (error) throw error

    // Send email notification to admin
    try {
      // Get service info for email
      const { data: service } = await supabase
        .from('services')
        .select('name, price, duration_minutes')
        .eq('id', input.service_id)
        .single()

      if (service) {
        const { sendNewAppointmentNotification, sendClientConfirmation } = await import('@/lib/email')
        const startDate = new Date(input.start_time)
        const endDate = new Date(input.end_time)

        const emailData = {
          id: data.id,
          clientName: input.client_name,
          clientPhone: input.client_phone || undefined,
          clientEmail: input.client_email || undefined,
          serviceName: service.name,
          servicePrice: service.price,
          date: startDate.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          time: startDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          startDateTime: startDate,
          endDateTime: endDate
        }

        // Email to admin
        // Fetch admin email from settings
        const { getAdminNotificationEmail } = await import('@/app/actions')
        const adminEmail = await getAdminNotificationEmail()
        await sendNewAppointmentNotification(emailData, adminEmail)

        // Email to client (if email provided)
        if (input.client_email) {
          await sendClientConfirmation({
            ...emailData,
            clientEmail: input.client_email,
            startDateTime: startDate,
            endDateTime: endDate
          })
        }

        // ==========================================
        // GOOGLE CALENDAR ADO
        // ==========================================
        try {
          const { getGoogleRefreshToken } = await import('@/app/actions')
          const { createCalendarEvent: createGEvent } = await import('@/lib/google-calendar')

          const refreshToken = await getGoogleRefreshToken()

          if (refreshToken) {
            const event = await createGEvent({
              summary: `${service.name} - ${input.client_name}`,
              description: `Cliente: ${input.client_name}\nTeléfono: ${input.client_phone || 'No especificado'}\nEmail: ${input.client_email || 'No especificado'}\n\nServicio: ${service.name}\nPrecio: $${service.price}`,
              startTime: startDate,
              endTime: endDate,
              refreshToken: refreshToken
            })

            // Save event ID to appointment
            if (event && event.id) {
              const supabase = await createClient()
              await supabase
                .from('appointments')
                .update({ google_event_id: event.id })
                .eq('id', data.id)
            }
            console.log('Google Calendar event created automatically')
          }
        } catch (calendarError) {
          console.error('Error creating Google Calendar event:', calendarError)
          // Don't fail the appointment booking if calendar fails
        }
      }
    } catch (emailError) {
      // Don't fail the appointment if email/calendar fails
      console.error('Error in post-booking actions (email/calendar):', emailError)
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<ServerActionResponse<Appointment>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id: string, status: string): Promise<ServerActionResponse<Appointment>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error updating appointment status:', error)
    return { success: false, error: error.message }
  }
}



/**
 * Delete an appointment
 */
export async function deleteAppointment(id: string): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get available time slots for a service on a specific date
 * This calculates available slots considering existing appointments, blocked slots, and business hours
 */
export async function getAvailableSlots(
  serviceId: string,
  date: string,
  businessHoursJson?: string // Optional: pass business hours as JSON string
): Promise<ServerActionResponse<TimeSlot[]>> {
  try {
    const supabase = await createClient()

    // Get the service to know duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (serviceError) throw serviceError

    // Get appointments for that day - parse date correctly for local timezone
    const [year, month, day] = date.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)


    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .neq('status', 'cancelled')

    if (appointmentsError) throw appointmentsError

    // Get blocked slots for that day
    const { data: blocked, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('start_time, end_time, reason')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())

    if (blockedError) throw blockedError

    // Parse business hours or use defaults
    const dayOfWeek = new Date(date).getDay() // 0 = Sunday, 1 = Monday, etc.

    // Default schedule
    const defaultSchedule: Record<number, { isOpen: boolean; start: number; end: number }> = {
      0: { isOpen: false, start: 10, end: 14 }, // Sunday
      1: { isOpen: true, start: 9, end: 18 },   // Monday
      2: { isOpen: true, start: 9, end: 18 },   // Tuesday
      3: { isOpen: true, start: 9, end: 18 },   // Wednesday
      4: { isOpen: true, start: 9, end: 18 },   // Thursday
      5: { isOpen: true, start: 9, end: 18 },   // Friday
      6: { isOpen: true, start: 10, end: 14 },  // Saturday
    }

    let dayConfig = defaultSchedule[dayOfWeek]

    // Try to parse business hours from JSON if provided
    let slotInterval = 30 // default 30 minutes
    if (businessHoursJson) {
      try {
        const config = JSON.parse(businessHoursJson)
        // Support both old format (array) and new format (object with schedule + slotInterval)
        const schedule = Array.isArray(config) ? config : config.schedule
        slotInterval = config.slotInterval || 30

        const dayHours = schedule?.find((h: any) => h.dayOfWeek === dayOfWeek)
        if (dayHours) {
          dayConfig = {
            isOpen: dayHours.isOpen,
            start: parseInt(dayHours.startTime.split(':')[0]),
            end: parseInt(dayHours.endTime.split(':')[0])
          }
        }
      } catch (e) {
        console.warn('Could not parse business hours, using defaults')
      }
    }

    // If day is closed, return empty slots
    if (!dayConfig.isOpen) {
      return { success: true, data: [] }
    }

    // Generate time slots based on business hours and interval
    const slots: TimeSlot[] = []
    const businessStartHour = dayConfig.start
    const businessEndHour = dayConfig.end

    // Generate slots using interval
    let currentMinutes = businessStartHour * 60 // Convert to minutes for easier math
    const endMinutes = businessEndHour * 60

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60)
      const minute = currentMinutes % 60
      const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

      // Create slot dates properly - parse the date string and set local time
      const [year, month, day] = date.split('-').map(Number)
      const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0)
      const slotEnd = new Date(slotStart.getTime() + service.duration_minutes * 60 * 1000)

      // Check if slot conflicts with appointments
      const isBooked = appointments?.some(apt => {
        const aptStart = new Date(apt.start_time).getTime()
        const aptEnd = new Date(apt.end_time).getTime()
        return slotStart.getTime() < aptEnd && slotEnd.getTime() > aptStart
      })

      // Check if slot conflicts with blocked slots
      const isBlocked = blocked?.some(block => {
        const blockStart = new Date(block.start_time).getTime()
        const blockEnd = new Date(block.end_time).getTime()
        return slotStart.getTime() < blockEnd && slotEnd.getTime() > blockStart
      })

      slots.push({
        time: slotTime,
        available: !isBooked && !isBlocked,
        reason: isBooked ? 'booked' : isBlocked ? 'blocked' : undefined
      })

      currentMinutes += slotInterval
    }

    return { success: true, data: slots }
  } catch (error: any) {
    console.error('Error getting available slots:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// BLOCKED SLOTS - CRUD Operations
// ============================================

/**
 * Get blocked slots in a date range
 */
export async function getBlockedSlots(
  startDate?: string,
  endDate?: string
): Promise<ServerActionResponse<BlockedSlot[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('blocked_slots')
      .select('*')
      .order('start_time', { ascending: true })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }

    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching blocked slots:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a new blocked slot
 */
export async function createBlockedSlot(input: CreateBlockedSlotInput): Promise<ServerActionResponse<BlockedSlot>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('blocked_slots')
      .insert([{
        start_time: input.start_time,
        end_time: input.end_time,
        reason: input.reason
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error creating blocked slot:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a blocked slot
 */
export async function updateBlockedSlot(id: string, input: UpdateBlockedSlotInput): Promise<ServerActionResponse<BlockedSlot>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('blocked_slots')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error updating blocked slot:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a blocked slot
 */
export async function deleteBlockedSlot(id: string): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting blocked slot:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// SERVICE ADD-ONS - CRUD Operations
// ============================================

/**
 * Get all active service add-ons
 */
export async function getServiceAddons(): Promise<ServerActionResponse<ServiceAddon[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching addons:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all service add-ons (including inactive) - for admin
 */
export async function getAllServiceAddons(): Promise<ServerActionResponse<ServiceAddon[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching all addons:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a new service add-on
 */
export async function createServiceAddon(input: CreateServiceAddonInput): Promise<ServerActionResponse<ServiceAddon>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_addons')
      .insert([{
        name: input.name,
        description: input.description,
        price: input.price,
        duration_minutes: input.duration_minutes,
        is_active: input.is_active ?? true
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error creating addon:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a service add-on
 */
export async function updateServiceAddon(id: string, input: UpdateServiceAddonInput): Promise<ServerActionResponse<ServiceAddon>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_addons')
      .update(input)
      .eq('id', id)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Add-on no encontrado')
    }

    return { success: true, data: data[0] }
  } catch (error: any) {
    console.error('Error updating addon:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Toggle add-on active status
 */
export async function toggleServiceAddonActive(id: string): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient()

    // First get current state
    const { data: current, error: fetchError } = await supabase
      .from('service_addons')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Toggle it
    const { error } = await supabase
      .from('service_addons')
      .update({ is_active: !current.is_active })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error toggling addon:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a service add-on
 */
export async function deleteServiceAddon(id: string): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('service_addons')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting addon:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// APP SETTINGS - Google Calendar Integration
// ============================================

/**
 * Get Google Calendar connection status
 */
export async function getGoogleCalendarSettings(): Promise<ServerActionResponse<{ isConnected: boolean }>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_calendar_refresh_token')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      throw error
    }

    return {
      success: true,
      data: { isConnected: !!data?.value }
    }
  } catch (error: any) {
    console.error('Error getting calendar settings:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get the stored Google Calendar refresh token
 */
export async function getGoogleRefreshToken(): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_calendar_refresh_token')
      .single()

    if (error || !data?.value) {
      return null
    }

    return data.value
  } catch {
    return null
  }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', 'google_calendar_refresh_token')

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error disconnecting calendar:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get admin notification email
 */
export async function getAdminNotificationEmail(): Promise<string> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_notification_email')
      .single()

    // Fallback to env if not set in DB
    return data?.value || process.env.ADMIN_MAIL || 'reservas@example.com'
  } catch {
    return process.env.ADMIN_MAIL || 'reservas@example.com'
  }
}

/**
 * Update admin notification email
 */
export async function updateAdminNotificationEmail(email: string): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'admin_notification_email',
        value: email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating admin email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(id: string, reason: string = 'Cancelado por el cliente'): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient()

    // 1. Get appointment details
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, service:services(name, price)') // Get service details for email
      .eq('id', id)
      .single()

    if (fetchError || !appointment) {
      throw new Error('Reserva no encontrada')
    }

    if (appointment.status === 'cancelled') {
      return { success: true } // Already cancelled
    }

    // 2. Update status in DB
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (updateError) throw updateError

    // 3. Delete from Google Calendar if connected
    if (appointment.google_event_id) {
      try {
        const { getGoogleRefreshToken } = await import('@/app/actions')
        const refreshToken = await getGoogleRefreshToken()

        if (refreshToken) {
          const { deleteCalendarEvent } = await import('@/lib/google-calendar')
          await deleteCalendarEvent(appointment.google_event_id, refreshToken)
          console.log('Google Calendar event deleted')
        }
      } catch (calendarError) {
        console.error('Error deleting Google Calendar event:', calendarError)
        // Don't fail the cancellation if calendar fails
      }
    }

    // 4. Notify Admin
    try {
      const { getAdminNotificationEmail } = await import('@/app/actions')
      const adminEmail = await getAdminNotificationEmail()
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const adminHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #db2777;">Reserva Cancelada ❌</h2>
          <p>El cliente ha cancelado el siguiente turno:</p>
          
          <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Servicio:</strong> ${appointment.service?.name}</p>
            <p><strong>Cliente:</strong> ${appointment.client_name}</p>
            <p><strong>Fecha original:</strong> ${new Date(appointment.start_time).toLocaleDateString()}</p>
            <p><strong>Hora:</strong> ${new Date(appointment.start_time).toLocaleTimeString()}</p>
            <p><strong>Motivo:</strong> ${reason}</p>
          </div>
        </div>
      `

      await resend.emails.send({
        from: 'Siv Nails <reservas@resend.dev>', // Should use configured sender
        to: adminEmail,
        subject: `❌ Cancelación: ${appointment.client_name} - ${appointment.service?.name}`,
        html: adminHtml
      })
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error cancelling appointment:', error)
    return { success: false, error: error.message }
  }
}

