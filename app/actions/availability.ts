'use server'

import { createClient } from '@/utils/supabase/server'
import { ServerActionResponse } from '@/types/database.types'

// Business Hours types
export interface BusinessHours {
  id: string
  day_of_week: number // 0 = Sunday, 1 = Monday, etc.
  start_time: string // HH:MM format
  end_time: string   // HH:MM format
  is_open: boolean
  created_at: string
}

export interface BusinessHoursInput {
  day_of_week: number
  start_time: string
  end_time: string
  is_open: boolean
}

/**
 * Get all business hours
 */
export async function getBusinessHours(): Promise<ServerActionResponse<BusinessHours[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week')

    if (error) {
      // If table doesn't exist, return defaults
      if (error.code === '42P01') {
        return { success: true, data: [] }
      }
      throw error
    }

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching business hours:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Upsert business hours for a specific day
 */
export async function upsertBusinessHours(input: BusinessHoursInput): Promise<ServerActionResponse<BusinessHours>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_hours')
      .upsert({
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
        is_open: input.is_open
      }, {
        onConflict: 'day_of_week'
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error upserting business hours:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update all business hours at once
 */
export async function updateAllBusinessHours(hours: BusinessHoursInput[]): Promise<ServerActionResponse<void>> {
  try {
    const supabase = await createClient()

    // Delete existing and insert new
    await supabase.from('business_hours').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const { error } = await supabase
      .from('business_hours')
      .insert(hours)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating business hours:', error)
    return { success: false, error: error.message }
  }
}
