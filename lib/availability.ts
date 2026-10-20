import type { SupabaseClient } from '@supabase/supabase-js'
import type { TimeSlot } from '@/types/database.types'
import {
  startOfDayUTC,
  endOfDayUTC,
  createSlotTimeUTC,
  addMinutesToUTC,
  isPastDate,
  doTimeRangesOverlap,
} from '@/lib/utils/timezone'

const TIMEZONE = 'America/Argentina/Buenos_Aires'

export interface AvailableSlotsOptions {
  /** "any" / undefined = union of all active members; otherwise a specific member */
  teamMemberId?: string
  /** Ignore this appointment when checking for bookings (used when rescheduling it) */
  excludeAppointmentId?: string
  /** Treat EVERY non-cancelled appointment of the business as blocking (appointment without a team member, like createAppointment) */
  blockOnAnyAppointment?: boolean
  /** Override the service duration (service + addons) */
  durationMinutes?: number
}

/**
 * Single source of truth for slot availability (business hours, breaks, blocked
 * slots, existing appointments, minAdvanceHours, maxAdvanceDays).
 * Throws on DB errors; callers map them to a user-safe message.
 */
export async function computeAvailableSlots(
  supabase: SupabaseClient,
  serviceId: string,
  date: string,
  options: AvailableSlotsOptions = {}
): Promise<TimeSlot[]> {
  const teamMemberId = options.teamMemberId

  const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
  const requestedDateLocal = new Date(dateYear, dateMonth - 1, dateDay)

  // Get the service to know duration
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duration_minutes, business_id')
    .eq('id', serviceId)
    .single()

  if (serviceError) throw serviceError
  const durationMinutes = options.durationMinutes ?? service.duration_minutes

  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .select('settings')
    .eq('id', service.business_id)
    .single()

  if (businessError) throw businessError

  const businessSettings = (businessData?.settings as {
    businessHours?: { dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string; breaks?: { name: string; start: string; end: string }[] }[]
    slotInterval?: number
    bufferTime?: number
    maxAdvanceDays?: number
    minAdvanceHours?: number
  } | undefined) || {}

  const maxAdvanceDays = Math.max(1, Number(businessSettings.maxAdvanceDays ?? 21))
  const minAdvanceMinutes = businessSettings.minAdvanceHours !== undefined
    ? Math.max(0, Number(businessSettings.minAdvanceHours)) * 60
    : 30
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE }) // YYYY-MM-DD
  const todayLocal = new Date(`${todayStr}T00:00:00`)
  const maxDateLocal = new Date(todayLocal)
  maxDateLocal.setDate(maxDateLocal.getDate() + maxAdvanceDays)

  if (requestedDateLocal < todayLocal || requestedDateLocal > maxDateLocal) {
    return []
  }

  // Get appointments for that day - use UTC boundaries for database query
  const dayStartUTC = startOfDayUTC(date)
  const dayEndUTC = endOfDayUTC(date)

  let appointmentsQuery = supabase
    .from('appointments')
    .select('start_time, end_time, team_member_id')
    .gte('start_time', dayStartUTC)
    .lte('start_time', dayEndUTC)
    .eq('business_id', service.business_id)
    .neq('status', 'cancelled')

  if (options.excludeAppointmentId) {
    appointmentsQuery = appointmentsQuery.neq('id', options.excludeAppointmentId)
  }

  const { data: appointments, error: appointmentsError } = await appointmentsQuery

  if (appointmentsError) throw appointmentsError

  // Get blocked slots for that day
  const { data: blocked, error: blockedError } = await supabase
    .from('blocked_slots')
    .select('start_time, end_time, reason')
    .gte('start_time', dayStartUTC)
    .lte('start_time', dayEndUTC)
    .eq('business_id', service.business_id)

  if (blockedError) throw blockedError

  // ─── Unified Team Member Schedule Path ───────────────────────────────────
  // Always use team members as the single source of truth for availability.
  // When teamMemberId is undefined or 'any', fetch all active members (union of slots).
  // When a specific member ID is provided, fetch only that member.
  const effectiveMemberId = teamMemberId ?? 'any'

  let members: { id: string; slot_interval: number; buffer_time: number; weekly_schedule: Record<string, { isOpen: boolean; startTime: string; endTime: string; breaks: { name: string; start: string; end: string }[] }> }[] = []

  if (effectiveMemberId === 'any') {
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
      .eq('id', effectiveMemberId)
      .eq('business_id', service.business_id)
      .single()
    if (memberErr) throw memberErr
    if (member) members = [member]
  }

  if (members.length === 0) {
    // No team members configured for this business
    return []
  }

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
    return []
  }

  const slotMap = new Map<string, boolean>()

  for (const range of ranges) {
    // For 'any': only count appointments assigned to this specific member.
    // For a specific member: count appointments assigned to that member OR unassigned (null).
    const memberAppts = options.blockOnAnyAppointment
      ? (appointments || [])
      : effectiveMemberId === 'any'
      ? (appointments || []).filter(a => (a as unknown as { team_member_id?: string }).team_member_id === range.memberId)
      : (appointments || []).filter(a => {
          const appt = a as unknown as { team_member_id?: string | null }
          return appt.team_member_id === range.memberId || appt.team_member_id === null
        })

    let cur = range.startMin
    while (cur + durationMinutes <= range.endMin) {
      const hour   = Math.floor(cur / 60)
      const minute = cur % 60
      const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

      const slotStartUTC = createSlotTimeUTC(date, slotTime)
      const slotEndUTC   = addMinutesToUTC(slotStartUTC, durationMinutes)

      const isPast    = isPastDate(slotStartUTC, minAdvanceMinutes)
      const isBooked  = memberAppts.some(apt => doTimeRangesOverlap(slotStartUTC, slotEndUTC, apt.start_time, apt.end_time))
      const isBlocked = blocked?.some(block => doTimeRangesOverlap(slotStartUTC, slotEndUTC, block.start_time, block.end_time))
      const isBreak = range.breaks.some(rest => cur < rest.endMin && (cur + durationMinutes) > rest.startMin)

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

  return slots
}
