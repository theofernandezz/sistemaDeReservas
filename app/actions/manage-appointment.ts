'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/utils/supabase/server'
import { computeAvailableSlots } from '@/lib/availability'
import {
  checkCanCancel,
  checkCanReschedule,
  isManageableStatus,
  resolveManageSettings,
  type ManageSettings,
} from '@/lib/appointment-rules'
import {
  MANAGE_ERROR_CODES,
  type ManageActionResult,
  type ManageErrorCode,
  type ManagedAppointmentView,
} from '@/lib/manage-appointment-types'
import { buildManageToken, manageTokenSchema, parseManageToken, verifyManageToken } from '@/lib/manage-token'
import { addMinutesToUTC, createSlotTimeUTC } from '@/lib/utils/timezone'

// ============================================
// Types
// ============================================

interface AppointmentRow {
  id: string
  status: string
  start_time: string
  end_time: string
  client_name: string
  client_email: string | null
  business_id: string
  service_id: string
  team_member_id: string | null
  addons: { duration_minutes?: number }[] | null
  payment_status: string | null
  payment_amount: number | null
  proof_url: string | null
  google_event_id: string | null
  reschedule_count: number
  rescheduled_from: string | null
  manage_token_version: number
  service: { name: string; price: number; duration_minutes: number } | null
}

interface BusinessRow {
  name: string
  slug: string
  settings: { cancellationHours?: number; rescheduleHours?: number } | null
}

type ServiceClient = ReturnType<typeof createServiceClient>

const INVALID_TOKEN_MESSAGE = 'El link no es válido o ya no está disponible.'
const GENERIC_ERROR_MESSAGE = 'No pudimos completar la acción. Intentá de nuevo en unos minutos.'
const RESEND_COOLDOWN_MINUTES = 10
/** Global cap on resend emails per rolling hour, across all appointments. */
const RESEND_GLOBAL_HOURLY_LIMIT = 100

const APPOINTMENT_COLUMNS =
  'id, status, start_time, end_time, client_name, client_email, business_id, service_id, team_member_id, addons, ' +
  'payment_status, payment_amount, proof_url, google_event_id, reschedule_count, rescheduled_from, manage_token_version, ' +
  'service:services(name, price, duration_minutes)'

function fail(code: ManageErrorCode, error: string): { success: false; error: string; code: ManageErrorCode } {
  return { success: false, error, code }
}

// ============================================
// Internal helpers (not exported: this is a 'use server' file)
// ============================================

interface LoadedAppointment {
  appointment: AppointmentRow
  business: BusinessRow | null
  settings: ManageSettings
}

/**
 * Resolve token -> appointment with the service client. The token's id prefix is only a
 * lookup key; access is granted only if the HMAC matches id + current version (constant time).
 */
async function loadByToken(supabase: ServiceClient, token: string): Promise<LoadedAppointment | null> {
  const parsedToken = parseManageToken(token)
  if (!parsedToken) return null

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('id', parsedToken.appointmentId)
    .maybeSingle()

  if (error) {
    console.error('manage-appointment: failed to load appointment by token', error.code)
    return null
  }
  if (!data) return null

  const appointment = data as unknown as AppointmentRow
  if (!verifyManageToken(token, appointment.id, appointment.manage_token_version)) return null

  const { data: business } = await supabase
    .from('businesses')
    .select('name, slug, settings')
    .eq('id', appointment.business_id)
    .maybeSingle()

  const businessRow = (business as BusinessRow | null) ?? null
  return { appointment, business: businessRow, settings: resolveManageSettings(businessRow?.settings) }
}

async function deleteCalendarEventIfLinked(supabase: ServiceClient, appointment: AppointmentRow): Promise<void> {
  if (!appointment.google_event_id) return
  try {
    const { data: integration } = await supabase
      .from('google_integrations')
      .select('refresh_token')
      .eq('business_id', appointment.business_id)
      .maybeSingle()
    if (!integration?.refresh_token) return
    const { deleteCalendarEvent } = await import('@/lib/google-calendar')
    await deleteCalendarEvent(appointment.google_event_id, integration.refresh_token)
  } catch (calendarError) {
    // Non-blocking: the appointment change already happened
    console.error('manage-appointment: Google Calendar delete failed', calendarError)
  }
}

async function updateCalendarEventIfLinked(
  supabase: ServiceClient,
  appointment: AppointmentRow,
  startUtc: string,
  endUtc: string
): Promise<void> {
  if (!appointment.google_event_id) return
  try {
    const { data: integration } = await supabase
      .from('google_integrations')
      .select('refresh_token')
      .eq('business_id', appointment.business_id)
      .maybeSingle()
    if (!integration?.refresh_token) return
    const { updateCalendarEvent } = await import('@/lib/google-calendar')
    await updateCalendarEvent(
      appointment.google_event_id,
      { startTime: new Date(startUtc), endTime: new Date(endUtc) },
      integration.refresh_token
    )
  } catch (calendarError) {
    console.error('manage-appointment: Google Calendar update failed', calendarError)
  }
}

function totalDurationMinutes(appointment: AppointmentRow): number {
  const base = appointment.service?.duration_minutes ?? 0
  const addons = (appointment.addons ?? []).reduce((sum, addon) => sum + (addon.duration_minutes ?? 0), 0)
  return base + addons
}

// ============================================
// 1. View
// ============================================

const tokenInputSchema = z.object({ token: manageTokenSchema })

export async function getAppointmentByToken(token: string): Promise<ManageActionResult<ManagedAppointmentView>> {
  const parsed = tokenInputSchema.safeParse({ token })
  if (!parsed.success) return fail(MANAGE_ERROR_CODES.InvalidToken, INVALID_TOKEN_MESSAGE)

  try {
    const supabase = createServiceClient()
    const loaded = await loadByToken(supabase, parsed.data.token)
    if (!loaded) return fail(MANAGE_ERROR_CODES.InvalidToken, INVALID_TOKEN_MESSAGE)

    const { appointment, business, settings } = loaded
    const now = new Date()
    const cancelCheck = checkCanCancel({
      status: appointment.status,
      startTime: appointment.start_time,
      now,
      windowHours: settings.cancellationHours,
    })
    const rescheduleCheck = checkCanReschedule({
      status: appointment.status,
      startTime: appointment.start_time,
      now,
      windowHours: settings.rescheduleHours,
    })

    return {
      success: true,
      data: {
        id: appointment.id,
        status: appointment.status,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        clientName: appointment.client_name,
        serviceName: appointment.service?.name ?? null,
        servicePrice: appointment.service?.price ?? null,
        businessName: business?.name ?? null,
        businessSlug: business?.slug ?? null,
        paymentStatus: appointment.payment_status,
        proofUrl: appointment.proof_url,
        rescheduleCount: appointment.reschedule_count,
        cancellationHours: settings.cancellationHours,
        rescheduleHours: settings.rescheduleHours,
        canCancel: cancelCheck.ok,
        cancelBlockedReason: cancelCheck.ok ? null : cancelCheck.message,
        canReschedule: rescheduleCheck.ok,
        rescheduleBlockedReason: rescheduleCheck.ok ? null : rescheduleCheck.message,
      },
    }
  } catch (error) {
    console.error('manage-appointment: getAppointmentByToken failed', error)
    return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
  }
}

// ============================================
// 2. Cancel
// ============================================

const cancelInputSchema = z.object({
  token: manageTokenSchema,
  reason: z.string().trim().max(300, 'El motivo es demasiado largo').optional(),
})

export async function cancelAppointmentByToken(input: {
  token: string
  reason?: string
}): Promise<ManageActionResult> {
  const parsed = cancelInputSchema.safeParse(input)
  if (!parsed.success) {
    const tokenIssue = parsed.error.issues.some((issue) => issue.path[0] === 'token')
    return tokenIssue
      ? fail(MANAGE_ERROR_CODES.InvalidToken, INVALID_TOKEN_MESSAGE)
      : fail(MANAGE_ERROR_CODES.Validation, parsed.error.issues[0]?.message ?? 'Datos inválidos')
  }

  try {
    const supabase = createServiceClient()
    const loaded = await loadByToken(supabase, parsed.data.token)
    if (!loaded) return fail(MANAGE_ERROR_CODES.InvalidToken, INVALID_TOKEN_MESSAGE)

    const { appointment, settings } = loaded
    const rule = checkCanCancel({
      status: appointment.status,
      startTime: appointment.start_time,
      now: new Date(),
      windowHours: settings.cancellationHours,
    })
    if (!rule.ok) return fail(MANAGE_ERROR_CODES.NotAllowed, rule.message)

    // Guard on status so a concurrent cancel/complete can't be overwritten.
    const { data: updatedRows, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'client',
      })
      .eq('id', appointment.id)
      .in('status', ['pending', 'confirmed'])
      .select('id')

    if (updateError) {
      console.error('manage-appointment: cancel update failed', updateError.code)
      return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
    }
    // Zero affected rows: nothing changed, so NO side effects (mails, calendar, revalidate).
    if (!updatedRows || updatedRows.length === 0) {
      return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
    }

    await deleteCalendarEventIfLinked(supabase, appointment)

    try {
      const { sendAppointmentCancellationEmails } = await import('@/lib/email')
      await sendAppointmentCancellationEmails({
        businessId: appointment.business_id,
        serviceName: appointment.service?.name,
        clientName: appointment.client_name,
        clientEmail: appointment.client_email,
        startTime: appointment.start_time,
        reason: parsed.data.reason || 'Cancelado por el cliente',
        paymentStatus: appointment.payment_status,
        paymentAmount: appointment.payment_amount,
      })
    } catch (emailError) {
      console.error('manage-appointment: cancellation email failed', emailError)
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('manage-appointment: cancelAppointmentByToken failed', error)
    return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
  }
}

// ============================================
// 3. Reschedule
// ============================================

const rescheduleInputSchema = z.object({
  token: manageTokenSchema,
  // Argentina local date/time. The server builds the UTC instant, never the browser.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida'),
})

export async function rescheduleAppointmentByToken(input: {
  token: string
  /** YYYY-MM-DD, America/Argentina/Buenos_Aires */
  date: string
  /** HH:mm, America/Argentina/Buenos_Aires */
  time: string
}): Promise<ManageActionResult<{ startTime: string; endTime: string }>> {
  const parsed = rescheduleInputSchema.safeParse(input)
  if (!parsed.success) {
    const tokenIssue = parsed.error.issues.some((issue) => issue.path[0] === 'token')
    return tokenIssue
      ? fail(MANAGE_ERROR_CODES.InvalidToken, INVALID_TOKEN_MESSAGE)
      : fail(MANAGE_ERROR_CODES.Validation, parsed.error.issues[0]?.message ?? 'Datos inválidos')
  }
  const { token, date, time } = parsed.data

  try {
    const supabase = createServiceClient()
    const loaded = await loadByToken(supabase, token)
    if (!loaded) return fail(MANAGE_ERROR_CODES.InvalidToken, INVALID_TOKEN_MESSAGE)

    const { appointment, settings } = loaded

    // Window is measured against the ORIGINAL start time.
    const rule = checkCanReschedule({
      status: appointment.status,
      startTime: appointment.start_time,
      now: new Date(),
      windowHours: settings.rescheduleHours,
    })
    if (!rule.ok) return fail(MANAGE_ERROR_CODES.NotAllowed, rule.message)

    const duration = totalDurationMinutes(appointment)
    if (duration <= 0) {
      console.error('manage-appointment: appointment has no resolvable duration', appointment.id)
      return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
    }

    // Same availability logic as the public booking: hours, breaks, blocked slots,
    // existing appointments of the same member, minAdvanceHours, maxAdvanceDays.
    const slots = await computeAvailableSlots(supabase, appointment.service_id, date, {
      teamMemberId: appointment.team_member_id ?? undefined,
      excludeAppointmentId: appointment.id,
      blockOnAnyAppointment: appointment.team_member_id === null,
      durationMinutes: duration,
    })
    const slot = slots.find((candidate) => candidate.time === time)
    if (!slot || !slot.available) {
      return fail(
        MANAGE_ERROR_CODES.SlotUnavailable,
        'Ese horario no está disponible. Por favor elegí otro.'
      )
    }

    const newStart = createSlotTimeUTC(date, time)
    const newEnd = addMinutesToUTC(newStart, duration)

    // TODO: TOCTOU between availability check and UPDATE (same known gap as createAppointment).
    // Fix with a btree_gist exclusion constraint per team_member_id.
    const { data: updatedRows, error: updateError } = await supabase
      .from('appointments')
      .update({
        start_time: newStart,
        end_time: newEnd,
        rescheduled_from: appointment.rescheduled_from ?? appointment.start_time,
        reschedule_count: appointment.reschedule_count + 1,
        last_rescheduled_at: new Date().toISOString(),
        // Time changed: reminders must fire again
        email_reminder_sent: false,
        email_reminder_sent_at: null,
        whatsapp_reminder_sent: false,
        whatsapp_reminder_sent_at: null,
      })
      .eq('id', appointment.id)
      .eq('start_time', appointment.start_time) // optimistic: nobody moved it meanwhile
      .in('status', ['pending', 'confirmed'])
      .select('id')

    if (updateError) {
      console.error('manage-appointment: reschedule update failed', updateError.code)
      return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
    }
    if (!updatedRows || updatedRows.length === 0) {
      return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
    }

    await updateCalendarEventIfLinked(supabase, appointment, newStart, newEnd)

    try {
      const { sendAppointmentRescheduleEmails } = await import('@/lib/email')
      await sendAppointmentRescheduleEmails({
        businessId: appointment.business_id,
        serviceName: appointment.service?.name,
        clientName: appointment.client_name,
        clientEmail: appointment.client_email,
        oldStartTime: appointment.start_time,
        newStartTime: newStart,
        manageToken: token,
      })
    } catch (emailError) {
      console.error('manage-appointment: reschedule email failed', emailError)
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, data: { startTime: newStart, endTime: newEnd } }
  } catch (error) {
    console.error('manage-appointment: rescheduleAppointmentByToken failed', error)
    return fail(MANAGE_ERROR_CODES.Failed, GENERIC_ERROR_MESSAGE)
  }
}

// ============================================
// 4. Resend link
// ============================================

const resendInputSchema = z.object({ appointmentId: z.string().uuid('ID de turno inválido') })

/**
 * Email a fresh manage link to the client_email registered on the appointment.
 * The response is identical whether or not the appointment exists / is eligible /
 * was rate limited, so it can't be used to probe ids.
 *
 * Sends the CURRENT link (token recomputed, version not bumped). Basic rate limit: one
 * resend per appointment per RESEND_COOLDOWN_MINUTES (enforced atomically in the UPDATE).
 */
export async function resendManageLink(input: { appointmentId: string }): Promise<ManageActionResult> {
  const parsed = resendInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail(MANAGE_ERROR_CODES.Validation, 'No pudimos procesar la solicitud.')
  }

  const okResponse: ManageActionResult = { success: true, data: undefined }
  const appointmentId = parsed.data.appointmentId

  // Respond immediately and identically; ALL the work (cap, lookup, cooldown, mail) happens
  // after the response, so neither the content nor the latency reveals whether the appointment exists.
  after(async () => {
    try {
      await processResend(appointmentId)
    } catch (err) {
      console.error('manage-appointment: resendManageLink failed', err)
    }
  })

  return okResponse
}

async function processResend(appointmentId: string): Promise<void> {
  const supabase = createServiceClient()

  // Global hourly cap, persisted in the DB (works across serverless instances): counts resend
  // EMAILS queued in the last hour (manage_link_resends), not appointments. Fails closed.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: sentLastHour, error: countError } = await supabase
    .from('manage_link_resends')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', hourAgo)
  if (countError || (sentLastHour ?? 0) >= RESEND_GLOBAL_HOURLY_LIMIT) return

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('id', appointmentId)
    .maybeSingle()

  if (error || !data) return
  const appointment = data as unknown as AppointmentRow

  const eligible =
    !!appointment.client_email &&
    isManageableStatus(appointment.status) &&
    new Date(appointment.start_time).getTime() > Date.now()
  if (!eligible || !appointment.client_email) return

  // Current link (same version): resending never invalidates links the client already has.
  const token = buildManageToken(appointment.id, appointment.manage_token_version)
  const cutoff = new Date(Date.now() - RESEND_COOLDOWN_MINUTES * 60 * 1000).toISOString()

  // Atomic per-appointment cooldown: zero rows means rate limited (or concurrently changed).
  const { data: claimed, error: claimError } = await supabase
    .from('appointments')
    .update({ manage_link_sent_at: new Date().toISOString() })
    .eq('id', appointment.id)
    .in('status', ['pending', 'confirmed'])
    .or(`manage_link_sent_at.is.null,manage_link_sent_at.lt.${cutoff}`)
    .select('id')
  if (claimError || !claimed || claimed.length === 0) return

  const { error: logError } = await supabase.from('manage_link_resends').insert({ appointment_id: appointment.id })
  if (logError) console.error('manage-appointment: resend log insert failed', logError.code)

  const { sendManageLinkEmail } = await import('@/lib/email')
  const result = await sendManageLinkEmail({
    businessId: appointment.business_id,
    clientName: appointment.client_name,
    clientEmail: appointment.client_email,
    serviceName: appointment.service?.name,
    startTime: appointment.start_time,
    manageToken: token,
  })
  if (!result.success) {
    console.error('manage-appointment: manage link email failed', result.error)
  }
}
