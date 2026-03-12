'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getCurrentBusiness } from '@/app/actions/auth'
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
  UpdateServiceAddonInput,
  UpdateBusinessInput,
  Business,
  BusinessSettings
} from '@/types/database.types'
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  createServiceSchema,
  updateServiceSchema,
} from '@/lib/schemas'
import {
  startOfDayUTC,
  endOfDayUTC,
  fromUTC,
  createSlotTimeUTC,
  addMinutesToUTC,
  isPastDate,
  doTimeRangesOverlap
} from '@/lib/utils/timezone'

// Helper to get current business ID for data isolation
async function requireBusinessId(): Promise<string> {
  const result = await getCurrentBusiness()
  if (!result.success || !result.data) {
    throw new Error('No business found for current user')
  }
  return result.data.id
}

// ============================================
// BUSINESS - Update Operations
// ============================================

/**
 * Update business profile information
 */
export async function updateBusiness(input: UpdateBusinessInput): Promise<ServerActionResponse<Business>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    // If updating slug, check uniqueness
    if (input.slug) {
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', businessId)
        .single()

      if (existingBusiness) {
        return { success: false, error: 'Esta URL ya está en uso' }
      }
    }

    const { data, error } = await supabase
      .from('businesses')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard', 'layout')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error updating business:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error actualizando negocio' }
  }
}

/**
 * Update business settings (reservation config, etc.)
 */
export async function updateBusinessSettings(settings: Partial<BusinessSettings>): Promise<ServerActionResponse<Business>> {
  try {
    const supabase = await createClient()
    const businessResult = await getCurrentBusiness()

    if (!businessResult.success || !businessResult.data) {
      throw new Error('No business found')
    }

    const currentSettings = businessResult.data.settings || {}

    const { data, error } = await supabase
      .from('businesses')
      .update({
        settings: { ...currentSettings, ...settings },
        updated_at: new Date().toISOString()
      })
      .eq('id', businessResult.data.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error updating business settings:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error actualizando configuración' }
  }
}

// ============================================
// SERVICES - CRUD Operations
// ============================================

/**
 * Get all active services for current business
 */
export async function getServices(): Promise<ServerActionResponse<Service[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching services:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching services' }
  }
}

/**
 * Get all services (including inactive) for current business
 */
export async function getAllServices(): Promise<ServerActionResponse<Service[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching all services:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching all services' }
  }
}

/**
 * Get active services by business ID (for public booking)
 */
export async function getServicesByBusinessId(businessId: string): Promise<ServerActionResponse<Service[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching services by business:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching services by business' }
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
  } catch (error: unknown) {
    console.error('Error fetching service:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching service' }
  }
}

/**
 * Create a new service
 */
export async function createService(input: CreateServiceInput): Promise<ServerActionResponse<Service>> {
  try {
    // Validate input with Zod
    const validationResult = createServiceSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('services')
      .insert([{
        name: validationResult.data.name,
        duration_minutes: validationResult.data.duration_minutes,
        price: validationResult.data.price,
        is_active: validationResult.data.is_active ?? true,
        business_id: businessId
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/services')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error creating service:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error creating service' }
  }
}

/**
 * Update an existing service
 */
export async function updateService(id: string, input: UpdateServiceInput): Promise<ServerActionResponse<Service>> {
  try {
    // Validate input with Zod
    const validationResult = updateServiceSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .update(validationResult.data)
      .eq('id', id)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Servicio no encontrado')
    }

    revalidatePath('/dashboard/services')
    return { success: true, data: data[0] }
  } catch (error: unknown) {
    console.error('Error updating service:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating service' }
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

    revalidatePath('/dashboard/services')
    return { success: true, data: data[0] }
  } catch (error: unknown) {
    console.error('Error toggling service:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error toggling service' }
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

    revalidatePath('/dashboard/services')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error deleting service:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error deleting service' }
  }
}

// ============================================
// APPOINTMENTS - CRUD Operations
// ============================================

/**
 * Get appointments with optional filters for current business
 */
export async function getAppointments(filters?: AppointmentFilters): Promise<ServerActionResponse<AppointmentWithService[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('business_id', businessId)
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
  } catch (error: unknown) {
    console.error('Error fetching appointments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching appointments' }
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
  } catch (error: unknown) {
    const postgrestError = error as { code?: string; message?: string; details?: string; hint?: string }
    console.error('Error fetching appointment:', {
      id,
      code: postgrestError.code,
      message: postgrestError.message,
      details: postgrestError.details,
      hint: postgrestError.hint,
    })
    return { success: false, error: postgrestError.message || 'Error fetching appointment' }
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<ServerActionResponse<Appointment>> {
  try {
    // Validate input with Zod
    const validationResult = createAppointmentSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const validatedInput = validationResult.data
    const supabase = await createClient()

    // Validate appointment is not in the past
    const startTime = new Date(validatedInput.start_time)
    const now = new Date()
    if (startTime < new Date(now.getTime() - 60000)) {
      return {
        success: false,
        error: 'No se pueden crear turnos en el pasado'
      }
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, business_id, name, price, duration_minutes')
      .eq('id', validatedInput.service_id)
      .single()

    if (serviceError) throw serviceError

    const businessId = service.business_id || await requireBusinessId()

    // Check for overlapping appointments (prevent double booking)
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .neq('status', 'cancelled')
      .eq('business_id', businessId)
      .or(`and(start_time.lt.${validatedInput.end_time},end_time.gt.${validatedInput.start_time})`)

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
        start_time: validatedInput.start_time,
        end_time: validatedInput.end_time,
        client_name: validatedInput.client_name,
        client_phone: validatedInput.client_phone,
        client_email: validatedInput.client_email,
        status: validatedInput.status || 'pending',
        service_id: validatedInput.service_id,
        business_id: businessId,
        team_member_id: validatedInput.team_member_id ?? null,
      }])
      .select()
      .single()

    if (error) throw error

    // Send email notification to admin
    try {
      // Get service info for email
      if (service) {
        const { sendNewAppointmentNotification, sendClientConfirmation } = await import('@/lib/email')
        const startDate = new Date(validatedInput.start_time)
        const endDate = new Date(validatedInput.end_time)

        const emailData = {
          id: data.id,
          clientName: validatedInput.client_name,
          clientPhone: validatedInput.client_phone || undefined,
          clientEmail: validatedInput.client_email || undefined,
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
        await sendNewAppointmentNotification(emailData, businessId, adminEmail)

        // Email to client (if email provided)
        if (input.client_email) {
          await sendClientConfirmation({
            ...emailData,
            clientEmail: input.client_email,
            startDateTime: startDate,
            endDateTime: endDate
          }, businessId)
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

    revalidatePath('/dashboard', 'layout')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error creating appointment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error creating appointment' }
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

    revalidatePath('/dashboard', 'layout')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error updating appointment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating appointment' }
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

    revalidatePath('/dashboard', 'layout')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error updating appointment status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating appointment status' }
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

    revalidatePath('/dashboard', 'layout')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error deleting appointment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error deleting appointment' }
  }
}

/**
 * Get available time slots for a service on a specific date
 * This calculates available slots considering existing appointments, blocked slots, and business hours
 */
export async function getAvailableSlots(
  serviceId: string,
  date: string,
  businessHoursJson?: string, // Optional: pass business hours as JSON string (legacy/cookie)
  teamMemberId?: string        // Optional: "any" = no preference (union), or specific member ID
): Promise<ServerActionResponse<TimeSlot[]>> {
  try {
    const supabase = await createClient()

    const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
    const requestedDateLocal = new Date(dateYear, dateMonth - 1, dateDay)

    // Get the service to know duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes, business_id')
      .eq('id', serviceId)
      .single()

    if (serviceError) throw serviceError

    // Get appointments for that day - use UTC boundaries for database query
    const dayStartUTC = startOfDayUTC(date)
    const dayEndUTC = endOfDayUTC(date)

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('start_time, end_time, team_member_id')
      .gte('start_time', dayStartUTC)
      .lte('start_time', dayEndUTC)
      .eq('business_id', service.business_id)
      .neq('status', 'cancelled')

    if (appointmentsError) throw appointmentsError

    // Get blocked slots for that day
    const { data: blocked, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('start_time, end_time, reason')
      .gte('start_time', dayStartUTC)
      .lte('start_time', dayEndUTC)
      .eq('business_id', service.business_id)

    if (blockedError) throw blockedError

    // ─── Team Member Schedule Path ───────────────────────────────────────────
    // Only enter this path when a teamMemberId is provided AND real members are found.
    // If member=any but there are 0 team members → skip and fall through to business hours.
    let teamPathHandled = false

    if (teamMemberId) {
      // Fetch member(s)
      let members: { id: string; slot_interval: number; buffer_time: number; weekly_schedule: Record<string, { isOpen: boolean; startTime: string; endTime: string; breaks: { name: string; start: string; end: string }[] }> }[] = []

      if (teamMemberId === 'any') {
        const { data: allMembers, error: membersErr } = await supabase
          .from('team_members')
          .select('id, slot_interval, buffer_time, weekly_schedule')
          .eq('business_id', service.business_id)
          .eq('is_active', true)
        if (membersErr) throw membersErr
        members = allMembers || []
      } else {
        const { data: member, error: memberErr } = await supabase
          .from('team_members')
          .select('id, slot_interval, buffer_time, weekly_schedule')
          .eq('id', teamMemberId)
          .eq('business_id', service.business_id)
          .single()
        if (memberErr) throw memberErr
        if (member) members = [member]
      }

      if (members.length === 0 && teamMemberId !== 'any') {
        // Specific member not found
        return { success: true, data: [] }
      }

      if (members.length > 0) {
        // Have team members → compute slots from their schedules
        teamPathHandled = true

        const dayKey = String(requestedDateLocal.getDay())

        type MinuteRange = {
          startMin: number
          endMin: number
          interval: number
          memberId: string
          breaks: { startMin: number; endMin: number }[]
        }
        const ranges: MinuteRange[] = []

        for (const member of members) {
          const daySchedule = member.weekly_schedule?.[dayKey]
          if (!daySchedule?.isOpen) continue

          const [sh, sm = 0] = daySchedule.startTime.split(':').map(Number)
          const [eh, em = 0] = daySchedule.endTime.split(':').map(Number)
          const breaks = (daySchedule.breaks || []).map((rest) => {
            const [bsh, bsm = 0] = rest.start.split(':').map(Number)
            const [beh, bem = 0] = rest.end.split(':').map(Number)
            return {
              startMin: bsh * 60 + bsm,
              endMin: beh * 60 + bem,
            }
          })

          ranges.push({
            startMin: sh * 60 + sm,
            endMin:   eh * 60 + em,
            interval: member.slot_interval || 30,
            memberId: member.id,
            breaks,
          })
        }

        if (ranges.length === 0) {
          return { success: true, data: [] }
        }

        const slotMap = new Map<string, boolean>()

        for (const range of ranges) {
          const memberAppts = teamMemberId === 'any'
            ? (appointments || []).filter(a => (a as unknown as { team_member_id?: string }).team_member_id === range.memberId)
            : (appointments || [])

          let cur = range.startMin
          while (cur < range.endMin) {
            const hour   = Math.floor(cur / 60)
            const minute = cur % 60
            const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

            const slotStartUTC = createSlotTimeUTC(date, slotTime)
            const slotEndUTC   = addMinutesToUTC(slotStartUTC, service.duration_minutes)

            const isPast    = isPastDate(slotStartUTC, 30)
            const isBooked  = memberAppts.some(apt => doTimeRangesOverlap(slotStartUTC, slotEndUTC, apt.start_time, apt.end_time))
            const isBlocked = blocked?.some(block => doTimeRangesOverlap(slotStartUTC, slotEndUTC, block.start_time, block.end_time))
            const isBreak = range.breaks.some(rest => cur < rest.endMin && (cur + service.duration_minutes) > rest.startMin)

            const available = !isPast && !isBooked && !isBlocked && !isBreak
            if (available || !slotMap.has(slotTime)) {
              slotMap.set(slotTime, available)
            }

            cur += range.interval
          }
        }

        const slots: TimeSlot[] = Array.from(slotMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, available]) => ({ time, available }))

        return { success: true, data: slots }
      }
      // members.length === 0 && teamMemberId === 'any' → fall through to business hours
    }
    void teamPathHandled
    // ─── End Team Member Path ─────────────────────────────────────────────────

    // Parse business hours or use defaults
    const dayOfWeek = requestedDateLocal.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Default schedule (fallback only if DB has no config)
    // startMinutes/endMinutes: total minutes from midnight for precision
    const defaultSchedule: Record<number, { isOpen: boolean; startMinutes: number; endMinutes: number }> = {
      0: { isOpen: false, startMinutes: 10 * 60, endMinutes: 14 * 60 }, // Sunday
      1: { isOpen: true,  startMinutes:  9 * 60, endMinutes: 18 * 60 }, // Monday
      2: { isOpen: true,  startMinutes:  9 * 60, endMinutes: 18 * 60 }, // Tuesday
      3: { isOpen: true,  startMinutes:  9 * 60, endMinutes: 18 * 60 }, // Wednesday
      4: { isOpen: true,  startMinutes:  9 * 60, endMinutes: 18 * 60 }, // Thursday
      5: { isOpen: true,  startMinutes:  9 * 60, endMinutes: 18 * 60 }, // Friday
      6: { isOpen: true,  startMinutes: 10 * 60, endMinutes: 14 * 60 }, // Saturday
    }

    let dayConfig = defaultSchedule[dayOfWeek]
    let slotInterval = 30 // default 30 minutes
    let dayBreaks: { startMin: number; endMin: number }[] = []

    // Priority 1: use businessHoursJson if provided (legacy / cookie path)
    if (businessHoursJson) {
      try {
        const config = JSON.parse(businessHoursJson)
        const schedule = Array.isArray(config) ? config : config.schedule
        slotInterval = config.slotInterval || 30

        const dayHours = schedule?.find((h: {
          dayOfWeek: number
          isOpen: boolean
          startTime: string
          endTime: string
          breaks?: { name: string; start: string; end: string }[]
        }) => h.dayOfWeek === dayOfWeek)
        if (dayHours) {
          const [startH, startM = 0] = dayHours.startTime.split(':').map(Number)
          const [endH,   endM   = 0] = dayHours.endTime.split(':').map(Number)
          dayConfig = {
            isOpen: dayHours.isOpen,
            startMinutes: startH * 60 + startM,
            endMinutes:   endH   * 60 + endM,
          }
          dayBreaks = (dayHours.breaks || []).map((rest) => {
            const [bsh, bsm = 0] = rest.start.split(':').map(Number)
            const [beh, bem = 0] = rest.end.split(':').map(Number)
            return {
              startMin: bsh * 60 + bsm,
              endMin: beh * 60 + bem,
            }
          })
        }
      } catch (e) {
        console.warn('Could not parse business hours JSON, will try DB')
      }
    }

    // Priority 2 (primary path): fetch business settings directly from DB
    // This is the source of truth set by the dashboard availability editor
    if (!businessHoursJson) {
      try {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('settings')
          .eq('id', service.business_id)
          .single()

        const settings = businessData?.settings as {
          businessHours?: { dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string; breaks?: { name: string; start: string; end: string }[] }[]
          slotInterval?: number
          bufferTime?: number
        } | undefined

        if (settings?.slotInterval) {
          slotInterval = settings.slotInterval
        }

        if (settings?.businessHours && settings.businessHours.length > 0) {
          const dayHours = settings.businessHours.find(h => h.dayOfWeek === dayOfWeek)
          if (dayHours) {
            const [startH, startM = 0] = dayHours.startTime.split(':').map(Number)
            const [endH,   endM   = 0] = dayHours.endTime.split(':').map(Number)
            dayConfig = {
              isOpen: dayHours.isOpen,
              startMinutes: startH * 60 + startM,
              endMinutes:   endH   * 60 + endM,
            }
            // Store breaks for this day
            dayBreaks = (dayHours.breaks || []).map(b => {
              const [bsh, bsm = 0] = b.start.split(':').map(Number)
              const [beh, bem = 0] = b.end.split(':').map(Number)
              return { startMin: bsh * 60 + bsm, endMin: beh * 60 + bem }
            })
          }
        }
      } catch (e) {
        console.warn('Could not fetch business settings from DB, using defaults')
      }
    }

    // If day is closed, return empty slots
    if (!dayConfig.isOpen) {
      return { success: true, data: [] }
    }

    // Convert appointments to local-time minute ranges for comparison
    // Appointments are stored as UTC in the DB but were entered in local (ART) time by users.
    // On a UTC server, createSlotTimeUTC("2026-03-12", "10:30") produces 10:30Z, but the
    // appointment was saved as 13:30Z (ART=UTC-3). So we compare in local time minutes instead.
    const TZ = 'America/Argentina/Buenos_Aires'
    const aptMinuteRanges = (appointments || []).map(apt => {
      const startLocal = new Date(apt.start_time)
      const endLocal   = new Date(apt.end_time)
      // Extract local HH:mm for this timezone
      const startH = parseInt(startLocal.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: TZ }))
      const startM = startLocal.toLocaleString('en-US', { minute: '2-digit', timeZone: TZ }).padStart(2, '0')
      const endH   = parseInt(endLocal.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: TZ }))
      const endM   = endLocal.toLocaleString('en-US', { minute: '2-digit', timeZone: TZ }).padStart(2, '0')
      return {
        startMin: startH * 60 + parseInt(startM),
        endMin:   endH   * 60 + parseInt(endM),
      }
    })

    const blockedMinuteRanges = (blocked || []).map(block => {
      const startLocal = new Date(block.start_time)
      const endLocal   = new Date(block.end_time)
      const startH = parseInt(startLocal.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: TZ }))
      const startM = startLocal.toLocaleString('en-US', { minute: '2-digit', timeZone: TZ }).padStart(2, '0')
      const endH   = parseInt(endLocal.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: TZ }))
      const endM   = endLocal.toLocaleString('en-US', { minute: '2-digit', timeZone: TZ }).padStart(2, '0')
      return {
        startMin: startH * 60 + parseInt(startM),
        endMin:   endH   * 60 + parseInt(endM),
      }
    })

    const nowLocalMin = (() => {
      const now = new Date()
      const h = parseInt(now.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: TZ }))
      const m = parseInt(now.toLocaleString('en-US', { minute: '2-digit', timeZone: TZ }))
      return h * 60 + m
    })()

    // Is today? (compare date in local timezone)
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
    const isToday = date === todayStr

    // Generate time slots based on business hours and interval
    const slots: TimeSlot[] = []

    let currentMinutes = dayConfig.startMinutes
    const endMinutes = dayConfig.endMinutes

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60)
      const minute = currentMinutes % 60
      const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const slotEndMin = currentMinutes + service.duration_minutes

      // Past: only check if today, with 30 min buffer
      const isPast = isToday && (currentMinutes < nowLocalMin + 30)

      // Booked: slot overlaps with any appointment (in local minutes)
      const isBooked = aptMinuteRanges.some(apt =>
        currentMinutes < apt.endMin && slotEndMin > apt.startMin
      )

      // Blocked: slot overlaps with any blocked range (in local minutes)
      const isBlocked = blockedMinuteRanges.some(block =>
        currentMinutes < block.endMin && slotEndMin > block.startMin
      )

      // Break: slot overlaps with configured rest ranges for that weekday
      const isBreak = dayBreaks.some(rest =>
        currentMinutes < rest.endMin && slotEndMin > rest.startMin
      )

      slots.push({
        time: slotTime,
        available: !isBooked && !isBlocked && !isPast && !isBreak,
        reason: isPast ? 'past' : isBooked ? 'booked' : isBlocked ? 'blocked' : isBreak ? 'blocked' : undefined
      })

      currentMinutes += slotInterval
    }

    return { success: true, data: slots }
  } catch (error: unknown) {
    console.error('Error getting available slots:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error getting available slots' }
  }
}

// ============================================
// BLOCKED SLOTS - CRUD Operations
// ============================================

/**
 * Get blocked slots in a date range for current business
 */
export async function getBlockedSlots(
  startDate?: string,
  endDate?: string
): Promise<ServerActionResponse<BlockedSlot[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    let query = supabase
      .from('blocked_slots')
      .select('*')
      .eq('business_id', businessId)
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
  } catch (error: unknown) {
    console.error('Error fetching blocked slots:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching blocked slots' }
  }
}

/**
 * Create a new blocked slot
 */
export async function createBlockedSlot(input: CreateBlockedSlotInput): Promise<ServerActionResponse<BlockedSlot>> {
  try {
    const supabase = await createClient()

    // Validate start_time < end_time
    const startTime = new Date(input.start_time)
    const endTime = new Date(input.end_time)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return {
        success: false,
        error: 'Fechas inválidas proporcionadas'
      }
    }

    if (startTime >= endTime) {
      return {
        success: false,
        error: 'La hora de inicio debe ser anterior a la hora de fin'
      }
    }

    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('blocked_slots')
      .insert([{
        start_time: input.start_time,
        end_time: input.end_time,
        reason: input.reason,
        business_id: businessId
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/calendar')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error creating blocked slot:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error creating blocked slot' }
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

    revalidatePath('/dashboard/calendar')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error updating blocked slot:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating blocked slot' }
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

    revalidatePath('/dashboard/calendar')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error deleting blocked slot:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error deleting blocked slot' }
  }
}

// ============================================
// SERVICE ADD-ONS - CRUD Operations
// ============================================

/**
 * Get all active service add-ons for current business
 */
export async function getServiceAddons(): Promise<ServerActionResponse<ServiceAddon[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching addons:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching addons' }
  }
}

/**
 * Get all service add-ons (including inactive) for current business - for admin
 */
export async function getAllServiceAddons(): Promise<ServerActionResponse<ServiceAddon[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('business_id', businessId)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching all addons:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching all addons' }
  }
}

/**
 * Create a new service add-on
 */
export async function createServiceAddon(input: CreateServiceAddonInput): Promise<ServerActionResponse<ServiceAddon>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { data, error } = await supabase
      .from('service_addons')
      .insert([{
        name: input.name,
        description: input.description,
        price: input.price,
        duration_minutes: input.duration_minutes,
        is_active: input.is_active ?? true,
        business_id: businessId
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/services')
    revalidatePath('/dashboard/addons')
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error creating addon:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error creating addon' }
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

    revalidatePath('/dashboard/services')
    revalidatePath('/dashboard/addons')
    return { success: true, data: data[0] }
  } catch (error: unknown) {
    console.error('Error updating addon:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating addon' }
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

    revalidatePath('/dashboard/services')
    revalidatePath('/dashboard/addons')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error toggling addon:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error toggling addon' }
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

    revalidatePath('/dashboard/services')
    revalidatePath('/dashboard/addons')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error deleting addon:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error deleting addon' }
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
  } catch (error: unknown) {
    console.error('Error getting calendar settings:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error getting calendar settings' }
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

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error disconnecting calendar:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error disconnecting calendar' }
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

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating admin email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating admin email' }
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
      const { sendAppointmentCancellationEmails } = await import('@/lib/email')
      await sendAppointmentCancellationEmails({
        businessId: appointment.business_id,
        serviceName: appointment.service?.name,
        clientName: appointment.client_name,
        clientEmail: appointment.client_email,
        startTime: appointment.start_time,
        reason,
      })
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error cancelling appointment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error cancelling appointment' }
  }
}

// ============================================
// MERCADO PAGO INTEGRATION
// ============================================

interface MercadoPagoStatus {
  isConnected: boolean
  tokenValid?: boolean
  mpUserId?: string
  connectedAt?: string
  expiresAt?: string
}

/**
 * Get Mercado Pago connection status for current business
 */
export async function getMercadoPagoStatus(): Promise<ServerActionResponse<MercadoPagoStatus>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // Get business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      return { success: true, data: { isConnected: false } }
    }

    // Check for MP integration
    const { data: mpIntegration } = await supabase
      .from('mp_integrations')
      .select('mp_user_id, created_at, expires_at, access_token')
      .eq('business_id', business.id)
      .single()

    if (!mpIntegration) {
      return { success: true, data: { isConnected: false } }
    }

    // Validate the stored access token against MP API
    let tokenValid = true
    if (mpIntegration.access_token) {
      const { validateMPToken } = await import('@/lib/mercadopago')
      const validation = await validateMPToken(mpIntegration.access_token)
      // Solo marcar como inválido si MP confirmó que el token no funciona
      // En caso de network_error, no penalizar al usuario
      tokenValid = validation.valid || validation.error === 'network_error'
    }

    return {
      success: true,
      data: {
        isConnected: true,
        tokenValid,
        mpUserId: mpIntegration.mp_user_id,
        connectedAt: mpIntegration.created_at,
        expiresAt: mpIntegration.expires_at,
      }
    }
  } catch (error: unknown) {
    console.error('Error getting MP status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error getting MP status' }
  }
}

/**
 * Disconnect Mercado Pago from current business
 */
export async function disconnectMercadoPago(): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // Get business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Delete MP integration
    const { error } = await supabase
      .from('mp_integrations')
      .delete()
      .eq('business_id', business.id)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error disconnecting MP:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error disconnecting MP' }
  }
}

// ============================================
// REMINDERS - WhatsApp Panel Actions
// ============================================

export interface AppointmentWithReminders extends AppointmentWithService {
  email_reminder_sent: boolean
  email_reminder_sent_at: string | null
  whatsapp_reminder_sent: boolean
  whatsapp_reminder_sent_at: string | null
}

/**
 * Get all future pending (unconfirmed) appointments for the booking approval section
 */
export async function getPendingAppointments(): Promise<ServerActionResponse<AppointmentWithService[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const now = new Date().toISOString()

    console.log('[getPendingAppointments] Query params:', { businessId, now })

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .gte('start_time', now)
      .order('start_time', { ascending: true })

    console.log('[getPendingAppointments] Results:', { count: data?.length, error, data })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching pending appointments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching pending appointments' }
  }
}

/**
 * Get tomorrow's appointments for the reminders panel
 */
export async function getTomorrowAppointments(): Promise<ServerActionResponse<AppointmentWithReminders[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    // Calculate tomorrow's date range in local timezone
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Format as YYYY-MM-DD for the timezone utilities
    const tomorrowString = tomorrow.toISOString().split('T')[0]
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)
    const dayAfterString = dayAfter.toISOString().split('T')[0]

    // Use UTC boundaries for database query
    const tomorrowStartUTC = startOfDayUTC(tomorrowString)
    const tomorrowEndUTC = startOfDayUTC(dayAfterString)

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('business_id', businessId)
      .gte('start_time', tomorrowStartUTC)
      .lt('start_time', tomorrowEndUTC)
      .neq('status', 'cancelled')
      .eq('whatsapp_reminder_sent', false)  // Solo mostrar los que NO fueron enviados
      .order('start_time', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching tomorrow appointments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching tomorrow appointments' }
  }
}

/**
 * Mark an appointment as having its WhatsApp reminder sent
 */
export async function markWhatsAppSent(appointmentId: string): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()
    await requireBusinessId() // Verify user has access

    const { error } = await supabase
      .from('appointments')
      .update({
        whatsapp_reminder_sent: true,
        whatsapp_reminder_sent_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard/reminders')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error marking WhatsApp sent:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error marking WhatsApp sent' }
  }
}

export type WhatsAppDateFilter = 'today' | 'tomorrow' | 'week'
export type WhatsAppStatusFilter = 'pending' | 'sent' | 'all'

export interface WhatsAppFilters {
  dateRange: WhatsAppDateFilter
  status: WhatsAppStatusFilter
}

/**
 * Get appointments for WhatsApp reminders panel with filters
 * Only returns appointments with phone numbers
 */
export async function getAppointmentsForWhatsApp(
  filters: WhatsAppFilters
): Promise<ServerActionResponse<AppointmentWithReminders[]>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const now = new Date()
    let startDate: string
    let endDate: string

    // Calculate date range based on filter
    switch (filters.dateRange) {
      case 'today': {
        const todayString = now.toISOString().split('T')[0]
        const tomorrowDate = new Date(now)
        tomorrowDate.setDate(tomorrowDate.getDate() + 1)
        startDate = startOfDayUTC(todayString)
        endDate = startOfDayUTC(tomorrowDate.toISOString().split('T')[0])
        break
      }
      case 'tomorrow': {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowString = tomorrow.toISOString().split('T')[0]
        const dayAfter = new Date(tomorrow)
        dayAfter.setDate(dayAfter.getDate() + 1)
        startDate = startOfDayUTC(tomorrowString)
        endDate = startOfDayUTC(dayAfter.toISOString().split('T')[0])
        break
      }
      case 'week': {
        const todayString = now.toISOString().split('T')[0]
        const weekLater = new Date(now)
        weekLater.setDate(weekLater.getDate() + 7)
        startDate = startOfDayUTC(todayString)
        endDate = startOfDayUTC(weekLater.toISOString().split('T')[0])
        break
      }
    }

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('business_id', businessId)
      .gte('start_time', startDate)
      .lt('start_time', endDate)
      .neq('status', 'cancelled')
      .not('client_phone', 'is', null) // Only with phone numbers
      .neq('client_phone', '')
      .order('start_time', { ascending: true })

    // Apply status filter
    if (filters.status === 'pending') {
      query = query.eq('whatsapp_reminder_sent', false)
    } else if (filters.status === 'sent') {
      query = query.eq('whatsapp_reminder_sent', true)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching WhatsApp appointments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching appointments' }
  }
}

// ============================================
// RESCHEDULE - Appointment Rescheduling
// ============================================

/**
 * Check if appointment can be rescheduled based on time limit
 */
export async function canRescheduleAppointment(appointmentId: string): Promise<ServerActionResponse<{ canReschedule: boolean; hoursUntil: number; reason?: string }>> {
  try {
    const supabase = await createClient()

    // Get appointment with business settings
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, service:services(business_id)')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    // Check if already cancelled or completed
    if (appointment.status === 'cancelled') {
      return { success: true, data: { canReschedule: false, hoursUntil: 0, reason: 'El turno ya fue cancelado' } }
    }

    if (appointment.status === 'completed') {
      return { success: true, data: { canReschedule: false, hoursUntil: 0, reason: 'El turno ya fue completado' } }
    }

    // Get business settings
    const { data: business } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', appointment.service.business_id)
      .single()

    const settings = business?.settings || {}
    const rescheduleHours = settings.rescheduleHours || 24 // Default 24 hours

    // Calculate time until appointment
    const appointmentTime = new Date(appointment.start_time)
    const now = new Date()
    const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Check if past appointment
    if (hoursUntil < 0) {
      return { success: true, data: { canReschedule: false, hoursUntil: 0, reason: 'El turno ya pasó' } }
    }

    // Check if within reschedule window
    if (hoursUntil < rescheduleHours) {
      return {
        success: true,
        data: {
          canReschedule: false,
          hoursUntil: Math.floor(hoursUntil),
          reason: `Solo se puede reprogramar con al menos ${rescheduleHours} horas de anticipación`
        }
      }
    }

    return { success: true, data: { canReschedule: true, hoursUntil: Math.floor(hoursUntil) } }
  } catch (error: unknown) {
    console.error('Error checking reschedule eligibility:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error checking reschedule eligibility' }
  }
}

/**
 * Reschedule an existing appointment to a new date/time
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<ServerActionResponse<Appointment>> {
  try {
    // Validate input with Zod
    const validationResult = rescheduleAppointmentSchema.safeParse({
      appointmentId,
      newStartTime,
      newEndTime,
    })
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const { appointmentId: validatedId, newStartTime: validatedStartTime, newEndTime: validatedEndTime } = validationResult.data
    const supabase = await createClient()

    // 1. Check if can reschedule
    const eligibilityCheck = await canRescheduleAppointment(validatedId)
    if (!eligibilityCheck.success || !eligibilityCheck.data?.canReschedule) {
      return {
        success: false,
        error: eligibilityCheck.data?.reason || eligibilityCheck.error || 'No se puede reprogramar este turno'
      }
    }

    // 2. Get appointment details
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, service:services(*)')
      .eq('id', validatedId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Reserva no encontrada' }
    }

    // 3. Check for overlapping appointments (prevent double booking)
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .neq('status', 'cancelled')
      .neq('id', validatedId) // Exclude current appointment
      .eq('business_id', appointment.business_id)
      .or(`and(start_time.lt.${validatedEndTime},end_time.gt.${validatedStartTime})`)

    if (checkError) throw checkError

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        success: false,
        error: 'El nuevo horario ya no está disponible. Por favor seleccioná otro horario.'
      }
    }

    // 4. Update appointment
    const originalStartTime = appointment.rescheduled_from || appointment.start_time

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        start_time: validatedStartTime,
        end_time: validatedEndTime,
        rescheduled_from: originalStartTime,
        reschedule_count: appointment.reschedule_count + 1,
        last_rescheduled_at: new Date().toISOString(),
        // Reset reminders since time changed
        email_reminder_sent: false,
        email_reminder_sent_at: null,
        whatsapp_reminder_sent: false,
        whatsapp_reminder_sent_at: null
      })
      .eq('id', validatedId)
      .select()
      .single()

    if (updateError) throw updateError

    // 5. Update Google Calendar if connected
    if (appointment.google_event_id) {
      try {
        const { getGoogleRefreshToken } = await import('@/app/actions')
        const refreshToken = await getGoogleRefreshToken()

        if (refreshToken) {
          const { updateCalendarEvent } = await import('@/lib/google-calendar')
          await updateCalendarEvent(
            appointment.google_event_id,
            {
              startTime: new Date(validatedStartTime),
              endTime: new Date(validatedEndTime)
            },
            refreshToken
          )
          console.log('Google Calendar event updated')
        }
      } catch (calendarError) {
        console.error('Error updating Google Calendar event:', calendarError)
        // Don't fail the reschedule if calendar fails
      }
    }

    // 6. Send notification emails
    try {
      const { sendAppointmentRescheduleEmails } = await import('@/lib/email')
      await sendAppointmentRescheduleEmails({
        businessId: appointment.business_id,
        serviceName: appointment.service?.name,
        clientName: appointment.client_name,
        clientEmail: appointment.client_email,
        oldStartTime: appointment.start_time,
        newStartTime: validatedStartTime,
      })
    } catch (emailError) {
      console.error('Error sending reschedule emails:', emailError)
      // Don't fail the reschedule if email fails
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, data: updatedAppointment }
  } catch (error: unknown) {
    console.error('Error rescheduling appointment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error rescheduling appointment' }
  }
}
