'use server'

import { createClient } from '@/utils/supabase/server'
import { ServerActionResponse, Business } from '@/types/database.types'
import { completeOnboardingSchema } from '@/lib/schemas'
import { BusinessService } from '@/lib/services/business-service'

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
  // Validate input with Zod
  const validationResult = completeOnboardingSchema.safeParse(data)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return {
      success: false,
      error: firstError?.message || 'Error de validación'
    }
  }

  const validatedData = validationResult.data
  const supabase = await createClient()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // 2. Get user's business (may not exist yet)
  const business = await BusinessService.getByOwnerId(user.id)

  // 3. Check if slug is available
  // If business exists and slug hasn't changed, skip check
  // If slug is temp placeholder from callback, allow change
  const shouldCheckSlug = !business ||
    (validatedData.slug !== business.slug &&
     business.slug !== `negocio-${user.id}`)

  if (shouldCheckSlug) {
    const isAvailable = await BusinessService.isSlugAvailable(
      validatedData.slug,
      business?.id
    )

    if (!isAvailable) {
      return { success: false, error: 'Esta URL ya está en uso' }
    }
  }

  // 4. If no business exists, create it first
  let businessId: string
  let existingSettings = {}

  if (!business) {
    // Create new business for first-time onboarding
    const newBusiness = await BusinessService.createForOwner(user.id, {
      name: validatedData.businessName,
      slug: validatedData.slug,
      settings: {
        businessHours: validatedData.businessHours,
        slotInterval: validatedData.slotInterval,
      },
    })

    if (!newBusiness) {
      return { success: false, error: 'No se pudo crear el negocio. Por favor, intenta de nuevo.' }
    }

    businessId = newBusiness.id
  } else {
    businessId = business.id
    existingSettings = business.settings || {}
  }

  // 5. Upload logo to storage if it's a base64 string
  let logoUrl = validatedData.logo
  if (validatedData.logo && validatedData.logo.startsWith('data:image')) {
    try {
      const base64Data = validatedData.logo.split(',')[1]

      // Validate base64 size (max ~5MB = ~6.7M chars)
      if (base64Data.length > 6700000) {
        return { success: false, error: 'La imagen es demasiado grande. Máximo 5MB.' }
      }

      const mimeType = validatedData.logo.match(/data:(.*);base64/)?.[1] || 'image/png'
      const extension = mimeType.split('/')[1]
      const fileName = `${businessId}/logo.${extension}`

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

  // 6. Update business info (now that it definitely exists)
  const { error: updateError } = await supabase
    .from('businesses')
    .update({
      name: validatedData.businessName,
      slug: validatedData.slug,
      logo: logoUrl,
      description: validatedData.description || null,
      settings: {
        ...existingSettings,
        businessHours: validatedData.businessHours,
        slotInterval: validatedData.slotInterval,
      },
    })
    .eq('id', businessId)

  if (updateError) {
    console.error('Error updating business:', updateError)
    return { success: false, error: 'No se pudo completar la configuración. Por favor, intenta de nuevo.' }
  }

  // 7. Create services (if any)
  if (validatedData.services.length > 0) {
    const servicesToInsert = validatedData.services
      .filter(s => s.name.trim()) // Only insert services with names
      .map(service => ({
        business_id: businessId,
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

  // 8. Return updated business
  const { data: updatedBusiness } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  return { success: true, data: updatedBusiness }
}
