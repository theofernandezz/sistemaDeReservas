'use server'

import { createClient } from '@/utils/supabase/server'
import { ServerActionResponse, Business } from '@/types/database.types'

interface OnboardingData {
  businessName: string
  slug: string
  logo: string | null
  description: string
  services: {
    name: string
    durationMinutes: number
    price: number
  }[]
  businessHours: {
    dayOfWeek: number
    dayName: string
    isOpen: boolean
    startTime: string
    endTime: string
  }[]
  slotInterval: number
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single()

  return { available: !data }
}

export async function completeOnboarding(data: OnboardingData): Promise<ServerActionResponse<Business>> {
  const supabase = await createClient()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // 2. Get user's business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (businessError || !business) {
    return { success: false, error: 'No se encontró el negocio' }
  }

  // 3. Check if slug is available (if different from current)
  if (data.slug !== business.slug) {
    const { data: existingSlug } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', data.slug)
      .single()

    if (existingSlug) {
      return { success: false, error: 'Esta URL ya está en uso' }
    }
  }

  // 4. Upload logo to storage if it's a base64 string
  let logoUrl = data.logo
  if (data.logo && data.logo.startsWith('data:image')) {
    try {
      const base64Data = data.logo.split(',')[1]
      const mimeType = data.logo.match(/data:(.*);base64/)?.[1] || 'image/png'
      const extension = mimeType.split('/')[1]
      const fileName = `${business.id}/logo.${extension}`

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, bytes, {
          contentType: mimeType,
          upsert: true,
        })

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from('business-logos')
          .getPublicUrl(fileName)
        logoUrl = publicUrl.publicUrl
      }
    } catch (e) {
      console.error('Error uploading logo:', e)
      // Continue without logo if upload fails
      logoUrl = null
    }
  }

  // 5. Update business info
  const { error: updateError } = await supabase
    .from('businesses')
    .update({
      name: data.businessName,
      slug: data.slug,
      logo: logoUrl,
      description: data.description || null,
      settings: {
        ...business.settings,
        businessHours: data.businessHours,
        slotInterval: data.slotInterval,
      },
    })
    .eq('id', business.id)

  if (updateError) {
    console.error('Error updating business:', updateError)
    return { success: false, error: 'Error al actualizar el negocio' }
  }

  // 6. Create services (if any)
  if (data.services.length > 0) {
    const servicesToInsert = data.services
      .filter(s => s.name.trim()) // Only insert services with names
      .map(service => ({
        business_id: business.id,
        name: service.name,
        duration_minutes: service.durationMinutes,
        price: service.price,
        is_active: true,
      }))

    if (servicesToInsert.length > 0) {
      const { error: servicesError } = await supabase
        .from('services')
        .insert(servicesToInsert)

      if (servicesError) {
        console.error('Error creating services:', servicesError)
        // Don't fail the whole onboarding, just log
      }
    }
  }

  // 7. Return updated business
  const { data: updatedBusiness } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', business.id)
    .single()

  return { success: true, data: updatedBusiness }
}
