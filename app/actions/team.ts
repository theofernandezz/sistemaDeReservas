'use server'

import { createClient } from '@/utils/supabase/server'
import {
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  ServerActionResponse,
  WeeklySchedule
} from '@/types/database.types'
import { getCurrentBusiness } from './auth'
import { createTeamMemberSchema } from '@/lib/schemas'

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

function logTeamActionError(message: string, error: unknown): void {
  if (isDynamicServerUsageError(error)) {
    return
  }

  console.error(message, error)
}

// Default weekly schedule for new team members
const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  '0': { isOpen: false, startTime: '10:00', endTime: '14:00', breaks: [] },
  '1': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '2': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '3': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '4': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '5': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '6': { isOpen: true, startTime: '10:00', endTime: '14:00', breaks: [] },
}

// Type for business hours from settings
interface BusinessHourSetting {
  dayOfWeek: number
  isOpen: boolean
  startTime: string
  endTime: string
  breaks?: { name: string; start: string; end: string }[]
}

/**
 * Get all team members for the current business
 */
export async function getTeamMembers(): Promise<ServerActionResponse<TeamMember[]>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('business_id', businessResult.data.id)
      .order('created_at', { ascending: true })

    if (error) {
      logTeamActionError('Error fetching team members:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TeamMember[] }
  } catch (error) {
    const err = error as Error
    logTeamActionError('Error in getTeamMembers:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get a single team member by ID
 */
export async function getTeamMember(memberId: string): Promise<ServerActionResponse<TeamMember>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('business_id', businessResult.data.id)
      .single()

    if (error) {
      console.error('Error fetching team member:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TeamMember }
  } catch (error) {
    const err = error as Error
    console.error('Error in getTeamMember:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Create a new team member
 */
export async function createTeamMember(input: CreateTeamMemberInput): Promise<ServerActionResponse<TeamMember>> {
  try {
    // Validate input with Zod
    const validationResult = createTeamMemberSchema.safeParse(input)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError?.message || 'Error de validación'
      }
    }

    const validatedInput = validationResult.data

    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        business_id: businessResult.data.id,
        name: validatedInput.name,
        role: validatedInput.role || null,
        avatar_color: validatedInput.avatar_color || 'bg-linear-to-br from-primary to-primary/80',
        is_active: validatedInput.is_active ?? true,
        slot_interval: validatedInput.slot_interval ?? 15,
        buffer_time: validatedInput.buffer_time ?? 5,
        weekly_schedule: validatedInput.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team member:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TeamMember }
  } catch (error) {
    const err = error as Error
    console.error('Error in createTeamMember:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  memberId: string, 
  input: UpdateTeamMemberInput
): Promise<ServerActionResponse<TeamMember>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    
    // Build update object with only provided fields
    const updateData: Partial<TeamMember> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.role !== undefined) updateData.role = input.role
    if (input.avatar_color !== undefined) updateData.avatar_color = input.avatar_color
    if (input.is_active !== undefined) updateData.is_active = input.is_active
    if (input.slot_interval !== undefined) updateData.slot_interval = input.slot_interval
    if (input.buffer_time !== undefined) updateData.buffer_time = input.buffer_time
    if (input.weekly_schedule !== undefined) updateData.weekly_schedule = input.weekly_schedule

    const { data, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)
      .eq('business_id', businessResult.data.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating team member:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TeamMember }
  } catch (error) {
    const err = error as Error
    console.error('Error in updateTeamMember:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a team member
 */
export async function deleteTeamMember(memberId: string): Promise<ServerActionResponse<void>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('business_id', businessResult.data.id)

    if (error) {
      console.error('Error deleting team member:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const err = error as Error
    console.error('Error in deleteTeamMember:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Toggle team member active status
 */
export async function toggleTeamMemberStatus(memberId: string): Promise<ServerActionResponse<TeamMember>> {
  try {
    const memberResult = await getTeamMember(memberId)
    if (!memberResult.success || !memberResult.data) {
      return { success: false, error: 'No se encontró el miembro' }
    }

    return await updateTeamMember(memberId, { 
      is_active: !memberResult.data.is_active 
    })
  } catch (error) {
    const err = error as Error
    console.error('Error in toggleTeamMemberStatus:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Save solo business availability (for businesses without team members)
 * This saves to the business settings
 */
export async function saveSoloAvailability(data: {
  schedule: WeeklySchedule
  interval: number
  buffer: number
}): Promise<ServerActionResponse<void>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    
    // Update business settings with new availability
    const currentSettings = businessResult.data.settings || {}
    const newSettings = {
      ...currentSettings,
      businessHours: Object.entries(data.schedule).map(([dayOfWeek, dayData]) => ({
        dayOfWeek: parseInt(dayOfWeek),
        isOpen: dayData.isOpen,
        startTime: dayData.startTime,
        endTime: dayData.endTime,
        breaks: dayData.breaks,
      })),
      slotInterval: data.interval,
      bufferTime: data.buffer,
    }

    const { error } = await supabase
      .from('businesses')
      .update({ settings: newSettings })
      .eq('id', businessResult.data.id)

    if (error) {
      console.error('Error saving solo availability:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const err = error as Error
    console.error('Error in saveSoloAvailability:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get solo business availability (for businesses without team members)
 */
export async function getSoloAvailability(): Promise<ServerActionResponse<{
  schedule: WeeklySchedule
  interval: number
  buffer: number
}>> {
  try {
    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const settings = businessResult.data.settings || {}
    
    // Convert business hours to weekly schedule format
    const schedule: WeeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE }
    
    if (settings.businessHours) {
      settings.businessHours.forEach((day: BusinessHourSetting) => {
        schedule[day.dayOfWeek.toString()] = {
          isOpen: day.isOpen,
          startTime: day.startTime,
          endTime: day.endTime,
          breaks: day.breaks || [],
        }
      })
    }

    return {
      success: true,
      data: {
        schedule,
        interval: settings.slotInterval || 30,
        buffer: settings.bufferTime || 0,
      }
    }
  } catch (error) {
    const err = error as Error
    logTeamActionError('Error in getSoloAvailability:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get active team members for a business (public — no auth needed)
 * Used by the public booking flow to display specialist selection
 */
export async function getActiveTeamMembersForBusiness(businessId: string): Promise<ServerActionResponse<TeamMember[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching team members for business:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TeamMember[] }
  } catch (error) {
    const err = error as Error
    console.error('Error in getActiveTeamMembersForBusiness:', err)
    return { success: false, error: err.message }
  }
}
