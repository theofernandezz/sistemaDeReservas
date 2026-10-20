'use server'

import { z } from 'zod'
import { createServiceClient } from '@/utils/supabase/server'
import { computeAvailableSlots } from '@/lib/availability'
import { isManageableStatus } from '@/lib/appointment-rules'
import { MANAGE_ERROR_CODES, type ManageActionResult } from '@/lib/manage-appointment-types'
import { manageTokenSchema, parseManageToken, verifyManageToken } from '@/lib/manage-token'

// TODO: this lives here because ManagedAppointmentView does not expose serviceId / teamMemberId,
// and the public getAvailableSlots cannot exclude the appointment itself nor use addon duration.
// Backend may fold it into app/actions/manage-appointment.ts.

const INVALID_TOKEN_MESSAGE = 'El link no es válido o ya no está disponible.'
const GENERIC_ERROR_MESSAGE = 'No pudimos cargar los horarios. Intentá de nuevo en unos minutos.'

const inputSchema = z.object({
  token: manageTokenSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})

/**
 * Available start times (HH:mm, Argentina) for rescheduling the appointment behind `token`:
 * same service, same team member, same total duration, ignoring the appointment's own current slot.
 */
export async function getRescheduleSlotsByToken(input: {
  token: string
  date: string
}): Promise<ManageActionResult<string[]>> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    const tokenIssue = parsed.error.issues.some((issue) => issue.path[0] === 'token')
    return {
      success: false,
      code: tokenIssue ? MANAGE_ERROR_CODES.InvalidToken : MANAGE_ERROR_CODES.Validation,
      error: tokenIssue ? INVALID_TOKEN_MESSAGE : 'Fecha inválida',
    }
  }
  const { token, date } = parsed.data

  try {
    const lookup = parseManageToken(token)
    if (!lookup) return { success: false, code: MANAGE_ERROR_CODES.InvalidToken, error: INVALID_TOKEN_MESSAGE }

    const supabase = createServiceClient()
    const { data } = await supabase
      .from('appointments')
      .select('id, status, service_id, team_member_id, addons, manage_token_version, service:services(duration_minutes)')
      .eq('id', lookup.appointmentId)
      .maybeSingle()

    const row = data as unknown as {
      id: string
      status: string
      service_id: string
      team_member_id: string | null
      addons: { duration_minutes?: number }[] | null
      manage_token_version: number
      service: { duration_minutes: number } | null
    } | null

    if (!row || !verifyManageToken(token, row.id, row.manage_token_version) || !isManageableStatus(row.status)) {
      return { success: false, code: MANAGE_ERROR_CODES.InvalidToken, error: INVALID_TOKEN_MESSAGE }
    }

    const duration =
      (row.service?.duration_minutes ?? 0) +
      (row.addons ?? []).reduce((sum, addon) => sum + (addon.duration_minutes ?? 0), 0)
    if (duration <= 0) return { success: false, code: MANAGE_ERROR_CODES.Failed, error: GENERIC_ERROR_MESSAGE }

    const slots = await computeAvailableSlots(supabase, row.service_id, date, {
      teamMemberId: row.team_member_id ?? undefined,
      excludeAppointmentId: row.id,
      blockOnAnyAppointment: row.team_member_id === null,
      durationMinutes: duration,
    })
    return { success: true, data: slots.filter((slot) => slot.available).map((slot) => slot.time) }
  } catch (error) {
    console.error('manage-slots: getRescheduleSlotsByToken failed', error)
    return { success: false, code: MANAGE_ERROR_CODES.Failed, error: GENERIC_ERROR_MESSAGE }
  }
}
