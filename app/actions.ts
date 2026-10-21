'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/utils/supabase/server'
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
  createServiceSchema,
  updateServiceSchema,
  updateServiceOrderSchema,
} from '@/lib/schemas'
import { startOfDayUTC } from '@/lib/utils/timezone'
import { computeAvailableSlots } from '@/lib/availability'
import { tryBuildManageToken } from '@/lib/manage-token'
import {
  BookingValidationError,
  assertSlotAvailable,
  computeEndTime,
  resolveAddons,
  resolvePaymentMode,
  stateForPaymentMode,
  totalDurationMinutes,
  totalPrice,
  type ServerBookingState,
} from '@/lib/services/booking-rules'

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as {
    digest?: unknown
    message?: unknown
    description?: unknown
  }

  return (
    maybeError.digest === 'DYNAMIC_SERVER_USAGE' ||
    (typeof maybeError.message === 'string' && maybeError.message.includes('Dynamic server usage')) ||
    (typeof maybeError.description === 'string' && maybeError.description.includes('Dynamic server usage'))
  )
}

function logServerActionError(message: string, error: unknown): void {
  if (isDynamicServerUsageError(error)) {
    return
  }

  console.error(message, error)
}

// Helper to get current business ID for data isolation
async function requireBusinessId(): Promise<string> {
  const result = await getCurrentBusiness()
  if (!result.success || !result.data) {
    throw new Error('No business found for current user')
  }
  return result.data.id
}

type CalendarCleanupContext = 'delete' | 'cancel'

interface CalendarCleanupTarget {
  id: string
  business_id: string | null
  google_event_id: string | null
}

async function deleteGoogleCalendarEventIfLinked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointment: CalendarCleanupTarget,
  context: CalendarCleanupContext
): Promise<void> {
  if (!appointment.google_event_id || !appointment.business_id) {
    return
  }

  try {
    const { data: googleIntegration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('refresh_token')
      .eq('business_id', appointment.business_id)
      .single()

    if (integrationError || !googleIntegration?.refresh_token) {
      console.warn(`Google Calendar token unavailable on ${context}`, {
        appointmentId: appointment.id,
        businessId: appointment.business_id,
      })
      return
    }

    const { deleteCalendarEvent } = await import('@/lib/google-calendar')
    await deleteCalendarEvent(appointment.google_event_id, googleIntegration.refresh_token)
    console.log(`Google Calendar event deleted on ${context}`, { appointmentId: appointment.id })
  } catch (calendarError) {
    console.error(`Error deleting Google Calendar event on ${context}:`, calendarError)
    // Non-blocking: appointment operation should continue even if calendar sync fails.
  }
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
 * Upload a base64 logo to storage and update business.logo
 */
export async function updateBusinessLogo(base64Image: string | null): Promise<ServerActionResponse<{ logoUrl: string | null }>> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    let logoUrl: string | null = null

    if (base64Image && base64Image.startsWith('data:image')) {
      const base64Data = base64Image.split(',')[1]
      if (base64Data.length > 6700000) {
        return { success: false, error: 'La imagen es demasiado grande. Máximo 5MB.' }
      }

      const mimeType = base64Image.match(/data:(.*);base64/)?.[1] || 'image/png'
      const extension = mimeType.split('/')[1]
      const fileName = `${businessId}/logo.${extension}`

      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, bytes, { contentType: mimeType, upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName)
      logoUrl = publicUrl.publicUrl
    }

    const { error } = await supabase
      .from('businesses')
      .update({ logo: logoUrl, updated_at: new Date().toISOString() })
      .eq('id', businessId)

    if (error) throw error

    revalidatePath('/dashboard', 'layout')
    return { success: true, data: { logoUrl } }
  } catch (error: unknown) {
    console.error('Error updating business logo:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error actualizando logo' }
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

/**
 * Get business settings (hours, slot interval, etc.) for the current business
 */
export async function getBusinessSettings(): Promise<ServerActionResponse<BusinessSettings>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No business found' }
    }
    return { success: true, data: businessResult.data.settings || {} }
  } catch (error: unknown) {
    console.error('Error fetching business settings:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error al obtener la configuración' }
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
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

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
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    logServerActionError('Error fetching all services:', error)
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
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

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

    // Place new services at the end by default.
    const { data: lastService, error: orderError } = await supabase
      .from('services')
      .select('display_order')
      .eq('business_id', businessId)
      .order('display_order', { ascending: false })
      .limit(1)

    if (orderError) throw orderError

    const nextDisplayOrder = validationResult.data.display_order ?? ((lastService?.[0]?.display_order ?? 0) + 1)

    const { data, error } = await supabase
      .from('services')
      .insert([{
        name: validationResult.data.name,
        duration_minutes: validationResult.data.duration_minutes,
        price: validationResult.data.price,
        description: validationResult.data.description ?? null,
        image: validationResult.data.image ?? null,
        display_order: nextDisplayOrder,
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
 * Update service display order for current business
 */
export async function updateServiceOrder(serviceIds: string[]): Promise<ServerActionResponse<void>> {
  try {
    const validationResult = updateServiceOrderSchema.safeParse({ serviceIds })
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const supabase = await createClient()
    const businessId = await requireBusinessId()

    for (const [index, serviceId] of validationResult.data.serviceIds.entries()) {
      const { error } = await supabase
        .from('services')
        .update({ display_order: index + 1 })
        .eq('id', serviceId)
        .eq('business_id', businessId)

      if (error) throw error
    }

    revalidatePath('/dashboard/services')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating service order:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating service order' }
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
    logServerActionError('Error fetching appointments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching appointments' }
  }
}

/**
 * Create a new appointment
 */
/** Appointment returned to the booking flow plus its signed manage token (null only if MANAGE_LINK_SECRET is not configured). */
export type CreatedAppointment = Appointment & { manage_token: string | null }

export async function createAppointment(input: CreateAppointmentInput): Promise<ServerActionResponse<CreatedAppointment>> {
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
    // Public booking: anon cannot SELECT appointments (RLS closed in migration 025), so the overlap
    // check and the INSERT ... RETURNING run with the service client. Input is validated above and
    // business_id is derived from the service row, never from the client.
    const serviceSupabase = createServiceClient()

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

    // Add-ons and duration come from the DB; end_time/price from the client are never used
    const addons = await resolveAddons(serviceSupabase, businessId, validatedInput.addon_ids)
    const durationMinutes = totalDurationMinutes(service.duration_minutes, addons)
    const endTimeISO = computeEndTime(validatedInput.start_time, durationMinutes)

    const assignedMemberId = await assertSlotAvailable(supabase, {
      serviceId: validatedInput.service_id,
      businessId,
      startISO: validatedInput.start_time,
      durationMinutes,
      teamMemberId: validatedInput.team_member_id,
    })

    // Status/payment_status: the authenticated owner of this business may set them (manual entry);
    // everyone else gets what the server derives from the business payment configuration.
    const { data: { user } } = await supabase.auth.getUser()
    let isBusinessOwner = false
    if (user) {
      const { data: ownerRow } = await serviceSupabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single()
      isBusinessOwner = ownerRow?.owner_id === user.id
    }

    const serverState: ServerBookingState = isBusinessOwner
      ? {
          status: (validatedInput.status as ServerBookingState['status'] | undefined) ?? 'pending',
          payment_status: validatedInput.payment_status as ServerBookingState['payment_status'],
        }
      : stateForPaymentMode(
          await resolvePaymentMode(serviceSupabase, businessId, totalPrice(service.price, addons))
        )
    const appointmentStatus: string = serverState.status
    const appointmentPaymentStatus: string | null = serverState.payment_status ?? null

    // Check for overlapping appointments (prevent double booking).
    // Scoped to the specific team member when one is assigned, so two different
    // members can take concurrent bookings at the same time slot.
    // TODO: TOCTOU race condition — two concurrent requests for the same member+slot
    // can both pass this check before either inserts. Fix: PostgreSQL exclusion constraint
    // using btree_gist + tsrange(start_time, end_time) per team_member_id.
    let overlapQuery = serviceSupabase
      .from('appointments')
      .select('id, start_time, end_time')
      .neq('status', 'cancelled')
      .eq('business_id', businessId)
      .or(`and(start_time.lt.${endTimeISO},end_time.gt.${validatedInput.start_time})`)

    if (assignedMemberId) {
      overlapQuery = overlapQuery.eq('team_member_id', assignedMemberId)
    }

    const { data: existingAppointments, error: checkError } = await overlapQuery

    if (checkError) throw checkError

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        success: false,
        error: 'Este horario ya no está disponible. Por favor selecciona otro.'
      }
    }

    // For manual transfer bookings, set a deadline for the client to upload proof.
    const proofExpiresAt = appointmentPaymentStatus === 'pending'
      ? new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
      : null

    const { data, error } = await serviceSupabase
      .from('appointments')
      .insert([{
        start_time: validatedInput.start_time,
        end_time: endTimeISO,
        addons,
        client_name: validatedInput.client_name,
        client_phone: validatedInput.client_phone,
        client_email: validatedInput.client_email,
        status: appointmentStatus,
        payment_status: appointmentPaymentStatus,
        proof_expires_at: proofExpiresAt,
        service_id: validatedInput.service_id,
        business_id: businessId,
        team_member_id: assignedMemberId,
      }])
      .select()
      .single()

    if (error) throw error
    // Signed token recomputed from id + version; never stored. Null (logged) if the secret is missing.
    const manageToken = tryBuildManageToken(data.id, (data as { manage_token_version?: number }).manage_token_version)

    // Send email notification to admin
    try {
      // Get service info for email
      if (service) {
        const { sendNewAppointmentNotification, sendClientConfirmation, sendManualTransferPendingEmail } = await import('@/lib/email')
        const startDate = new Date(validatedInput.start_time)
        const endDate = new Date(endTimeISO)

        const emailData = {
          id: data.id,
          clientName: validatedInput.client_name,
          clientPhone: validatedInput.client_phone || undefined,
          clientEmail: validatedInput.client_email || undefined,
          serviceName: service.name,
          servicePrice: service.price,
          date: startDate.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }),
          time: startDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }),
          startDateTime: startDate,
          endDateTime: endDate,
          manageToken: manageToken ?? undefined,
        }

        // Email to admin (uses business-specific admin_notification_email from businesses table)
        await sendNewAppointmentNotification(emailData, businessId)

        // Email to client (if email provided)
        if (input.client_email) {
          if (appointmentPaymentStatus === 'pending') {
            await sendManualTransferPendingEmail({
              ...emailData,
              clientEmail: input.client_email,
              startDateTime: startDate,
              endDateTime: endDate,
            }, businessId)
          } else {
            await sendClientConfirmation({
              ...emailData,
              clientEmail: input.client_email,
              startDateTime: startDate,
              endDateTime: endDate,
            }, businessId)
          }
        }

        // ==========================================
        // GOOGLE CALENDAR — token aislado por negocio
        // ==========================================
        try {
          const { createCalendarEvent: createGEvent } = await import('@/lib/google-calendar')

          // Fetch the refresh token for THIS specific business (same pattern as MercadoPago)
          const { data: googleIntegration } = await supabase
            .from('google_integrations')
            .select('refresh_token')
            .eq('business_id', businessId)
            .single()

          if (googleIntegration?.refresh_token) {
            const event = await createGEvent({
              summary: `${service.name} - ${input.client_name}`,
              description: `Cliente: ${input.client_name}\nTeléfono: ${input.client_phone || 'No especificado'}\nEmail: ${input.client_email || 'No especificado'}\n\nServicio: ${service.name}\nPrecio: $${service.price}`,
              startTime: startDate,
              endTime: endDate,
              refreshToken: googleIntegration.refresh_token,
            })

            // Save event ID to appointment
            if (event && event.id) {
              await serviceSupabase
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
    return { success: true, data: { ...(data as Appointment), manage_token: manageToken } }
  } catch (error: unknown) {
    if (error instanceof BookingValidationError) {
      return { success: false, error: error.message }
    }
    console.error('Error creating appointment:', error)
    return { success: false, error: 'No pudimos crear el turno. Intentá de nuevo.' }
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
 * Delete an appointment (also removes event from Google Calendar if linked)
 */
export async function deleteAppointment(id: string): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()

    // Fetch the appointment to get google_event_id and business_id before deleting
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, google_event_id, business_id')
      .eq('id', id)
      .single()

    // Remove from Google Calendar first (if linked)
    if (appointment) {
      await deleteGoogleCalendarEventIfLinked(supabase, appointment, 'delete')
    }

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
  _businessHoursJson?: string, // Deprecated: kept for backwards compatibility, ignored
  teamMemberId?: string         // Optional: "any" = no preference (union), or specific member ID
): Promise<ServerActionResponse<TimeSlot[]>> {
  try {
    const supabase = await createClient()
    const slots = await computeAvailableSlots(supabase, serviceId, date, { teamMemberId })
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
    logServerActionError('Error fetching blocked slots:', error)
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
 * Get active service add-ons for a business - public (booking flow, sin sesión)
 */
export async function getServiceAddonsByBusinessId(businessId: string): Promise<ServerActionResponse<ServiceAddon[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Error fetching addons by business:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching addons by business' }
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
    logServerActionError('Error fetching all addons:', error)
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
/**
 * Get Google Calendar connection status for the current business
 */
export async function getGoogleCalendarSettings(): Promise<ServerActionResponse<{ isConnected: boolean }>> {
  try {
    const supabase = await createClient()
    const businessResult = await getCurrentBusiness()

    if (!businessResult.success || !businessResult.data?.id) {
      return { success: true, data: { isConnected: false } }
    }

    const businessId = businessResult.data.id

    const { data, error } = await supabase
      .from('google_integrations')
      .select('refresh_token')
      .eq('business_id', businessId)
      .maybeSingle()

    if (error) {
      return { success: true, data: { isConnected: false } }
    }

    return {
      success: true,
      data: { isConnected: !!data?.refresh_token }
    }
  } catch (error: unknown) {
    // This setting is non-critical for rendering settings page.
    // Fail closed (disconnected) instead of surfacing noisy errors.
    void error
    return { success: true, data: { isConnected: false } }
  }
}


/**
 * Get the stored Google Calendar refresh token for a specific business.
 * Uses google_integrations table (same pattern as MercadoPago), NOT global app_settings.
 */
export async function getGoogleRefreshToken(businessId?: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Resolve businessId: use provided one, or fall back to the current authenticated business
    let resolvedBusinessId = businessId
    if (!resolvedBusinessId) {
      const businessResult = await getCurrentBusiness()
      if (!businessResult.success || !businessResult.data) return null
      resolvedBusinessId = businessResult.data.id
    }

    const { data, error } = await supabase
      .from('google_integrations')
      .select('refresh_token')
      .eq('business_id', resolvedBusinessId)
      .single()

    if (error || !data?.refresh_token) {
      return null
    }

    return data.refresh_token
  } catch {
    return null
  }
}

/**
 * Disconnect Google Calendar for the current business
 */
export async function disconnectGoogleCalendar(): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient()
    const businessId = await requireBusinessId()

    const { error } = await supabase
      .from('google_integrations')
      .delete()
      .eq('business_id', businessId)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error disconnecting calendar:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error disconnecting calendar' }
  }
}

/**
 * Get admin notification email for the current business
 */
export async function getAdminNotificationEmail(): Promise<string> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return process.env.ADMIN_MAIL || 'reservas@example.com'
    }

    const supabase = await createClient()
    const { data } = await supabase
      .from('businesses')
      .select('admin_notification_email')
      .eq('id', businessResult.data.id)
      .single()

    return data?.admin_notification_email || process.env.ADMIN_MAIL || 'reservas@example.com'
  } catch {
    return process.env.ADMIN_MAIL || 'reservas@example.com'
  }
}

/**
 * Update admin notification email for the current business
 */
export async function updateAdminNotificationEmail(email: string): Promise<ServerActionResponse> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('businesses')
      .update({
        admin_notification_email: email,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessResult.data.id)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating admin email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error updating admin email' }
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
    logServerActionError('Error getting MP status:', error)
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
 * Get all future confirmed appointments whose manual transfer payment is still
 * pending (client hasn't uploaded a proof yet), for the follow-up section.
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
      .eq('payment_status', 'pending')
      .gte('start_time', now)
      .order('start_time', { ascending: true })

    console.log('[getPendingAppointments] Results:', { count: data?.length, error, data })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    logServerActionError('Error fetching pending appointments:', error)
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
