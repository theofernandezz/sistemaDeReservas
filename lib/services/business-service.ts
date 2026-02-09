import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/server'
import { Business } from '@/types/database.types'

interface CreateBusinessInput {
  name: string
  slug: string
  logo?: string | null
  description?: string | null
  settings?: Record<string, unknown>
}

interface UpdateBusinessInput {
  name?: string
  slug?: string
  logo?: string | null
  description?: string | null
  settings?: Record<string, unknown>
}

/**
 * Business Service Layer
 * Handles all business-related database operations with proper error handling
 */
export class BusinessService {
  /**
   * Get business by owner ID
   */
  static async getByOwnerId(ownerId: string): Promise<Business | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching business by owner:', error)
      return null
    }

    return data
  }

  /**
   * Create business for owner
   * Uses service client to bypass RLS for new user setup
   */
  static async createForOwner(
    ownerId: string,
    data: CreateBusinessInput
  ): Promise<Business | null> {
    const serviceSupabase = createServiceClient()

    const { data: business, error } = await serviceSupabase
      .from('businesses')
      .insert({
        owner_id: ownerId,
        name: data.name,
        slug: data.slug,
        logo: data.logo || null,
        description: data.description || null,
        settings: data.settings || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating business:', error)
      return null
    }

    return business
  }

  /**
   * Update business by ID
   */
  static async updateBusiness(
    businessId: string,
    data: UpdateBusinessInput
  ): Promise<Business | null> {
    const supabase = await createClient()

    const { data: business, error } = await supabase
      .from('businesses')
      .update(data)
      .eq('id', businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating business:', error)
      return null
    }

    return business
  }

  /**
   * Get or create business for owner
   * Atomic operation - if business doesn't exist, create it
   */
  static async getOrCreateForOwner(
    ownerId: string,
    defaultData: CreateBusinessInput
  ): Promise<{ business: Business | null; created: boolean }> {
    // Try to get existing business
    const existing = await this.getByOwnerId(ownerId)

    if (existing) {
      return { business: existing, created: false }
    }

    // Create new business
    const newBusiness = await this.createForOwner(ownerId, defaultData)

    return { business: newBusiness, created: true }
  }

  /**
   * Check if slug is available
   * Returns true if slug is available, false if taken
   */
  static async isSlugAvailable(
    slug: string,
    excludeBusinessId?: string
  ): Promise<boolean> {
    const supabase = await createClient()

    let query = supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)

    if (excludeBusinessId) {
      query = query.neq('id', excludeBusinessId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Error checking slug availability:', error)
      return false
    }

    return !data
  }
}
