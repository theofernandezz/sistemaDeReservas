'use server'

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { hasSuperAdminRole } from '@/lib/auth/is-super-admin'
import { ServerActionResponse, Business } from '@/types/database.types'
import { z } from 'zod'

const DEFAULT_HOURS = [
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, dayName: 'Martes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: false, startTime: '09:00', endTime: '14:00' },
]

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!hasSuperAdminRole(user)) {
    throw new Error('Unauthorized')
  }
  return user
}

const createAccountSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  businessName: z.string().min(1, 'Nombre requerido').max(100),
  slug: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
})

export interface SuperAdminService {
  id: string
  name: string
  durationMinutes: number
  price: number
  isActive: boolean
}

export interface SuperAdminBusinessDetails {
  business: Business
  services: SuperAdminService[]
}

export async function createBusinessAccount(input: {
  email: string
  password: string
  businessName: string
  slug: string
}): Promise<ServerActionResponse<{ businessId: string; userId: string }>> {
  try {
    await assertSuperAdmin()
  } catch {
    return { success: false, error: 'No autorizado' }
  }

  const parsed = createAccountSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' }
  }

  const { email, password, businessName, slug } = parsed.data
  const serviceClient = createServiceClient()

  // 1. Check slug availability
  const { data: existingBusiness } = await serviceClient
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingBusiness) {
    return { success: false, error: 'Ese slug ya está en uso' }
  }

  // 2. Create auth user without email verification
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Error al crear el usuario' }
  }

  const userId = authData.user.id

  // 3. Create business
  const { data: business, error: businessError } = await serviceClient
    .from('businesses')
    .insert({
      owner_id: userId,
      name: businessName,
      slug,
      admin_notification_email: email,
      settings: {
        businessHours: DEFAULT_HOURS,
        slotInterval: 30,
      },
    })
    .select()
    .single()

  if (businessError || !business) {
    // Rollback: delete the auth user we just created
    await serviceClient.auth.admin.deleteUser(userId)
    return { success: false, error: 'Error al crear el negocio' }
  }

  // 4. Create owner team_member with default schedule
  const weeklySchedule = Object.fromEntries(
    DEFAULT_HOURS.map(day => [
      String(day.dayOfWeek),
      { isOpen: day.isOpen, startTime: day.startTime, endTime: day.endTime, breaks: [] }
    ])
  )

  await serviceClient.from('team_members').insert({
    business_id: business.id,
    name: businessName,
    role: null,
    avatar_color: 'bg-blue-500',
    is_active: true,
    slot_interval: 30,
    buffer_time: 0,
    weekly_schedule: weeklySchedule,
  })

  return { success: true, data: { businessId: business.id, userId } }
}

export async function getSuperAdminBusinessDetails(
  businessId: string
): Promise<ServerActionResponse<SuperAdminBusinessDetails>> {
  try {
    await assertSuperAdmin()
  } catch {
    return { success: false, error: 'No autorizado' }
  }

  const serviceClient = createServiceClient()

  const [{ data: business, error: bizError }, { data: services, error: svcError }] =
    await Promise.all([
      serviceClient.from('businesses').select('*').eq('id', businessId).single(),
      serviceClient
        .from('services')
        .select('id, name, duration_minutes, price, is_active')
        .eq('business_id', businessId)
        .order('created_at'),
    ])

  if (bizError || !business) {
    return { success: false, error: 'Negocio no encontrado' }
  }

  if (svcError) {
    return { success: false, error: 'Error al cargar servicios' }
  }

  return {
    success: true,
    data: {
      business,
      services: (services || []).map(s => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.duration_minutes,
        price: s.price,
        isActive: s.is_active,
      })),
    },
  }
}

const businessInfoSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(160).optional(),
  logo: z.string().nullable().optional(),
})

export async function updateSuperAdminBusinessInfo(
  businessId: string,
  info: { name: string; slug: string; description?: string; logo?: string | null }
): Promise<ServerActionResponse<null>> {
  try {
    await assertSuperAdmin()
  } catch {
    return { success: false, error: 'No autorizado' }
  }

  const parsed = businessInfoSchema.safeParse(info)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' }
  }

  const serviceClient = createServiceClient()

  // Check slug uniqueness (excluding this business)
  if (info.slug) {
    const { data: existing } = await serviceClient
      .from('businesses')
      .select('id')
      .eq('slug', info.slug)
      .neq('id', businessId)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Ese slug ya está en uso' }
    }
  }

  // Handle base64 logo upload
  let logoUrl = info.logo
  if (info.logo?.startsWith('data:image')) {
    try {
      const base64Data = info.logo.split(',')[1]
      const mimeType = info.logo.match(/data:(.*);base64/)?.[1] || 'image/png'
      const extension = mimeType.split('/')[1]
      const fileName = `${businessId}/logo.${extension}`
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const { error: uploadError } = await serviceClient.storage
        .from('business-logos')
        .upload(fileName, bytes, { contentType: mimeType, upsert: true })
      if (!uploadError) {
        const { data: publicUrl } = serviceClient.storage
          .from('business-logos')
          .getPublicUrl(fileName)
        logoUrl = publicUrl.publicUrl
      }
    } catch {
      logoUrl = null
    }
  }

  const { error } = await serviceClient
    .from('businesses')
    .update({ name: info.name, slug: info.slug, description: info.description || null, logo: logoUrl })
    .eq('id', businessId)

  if (error) return { success: false, error: 'Error al guardar' }
  return { success: true, data: null }
}

const hoursSchema = z.object({
  schedule: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    dayName: z.string(),
    isOpen: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })),
  slotInterval: z.number().int().min(15).max(120),
})

export async function updateSuperAdminBusinessHours(
  businessId: string,
  hours: { schedule: typeof DEFAULT_HOURS; slotInterval: number }
): Promise<ServerActionResponse<null>> {
  try {
    await assertSuperAdmin()
  } catch {
    return { success: false, error: 'No autorizado' }
  }

  const parsed = hoursSchema.safeParse(hours)
  if (!parsed.success) {
    return { success: false, error: 'Horarios inválidos' }
  }

  const serviceClient = createServiceClient()

  const { data: business } = await serviceClient
    .from('businesses')
    .select('settings')
    .eq('id', businessId)
    .single()

  const existingSettings = (business?.settings as Record<string, unknown>) || {}

  const { error } = await serviceClient
    .from('businesses')
    .update({
      settings: {
        ...existingSettings,
        businessHours: hours.schedule,
        slotInterval: hours.slotInterval,
      },
    })
    .eq('id', businessId)

  if (error) return { success: false, error: 'Error al guardar horarios' }

  // Also update team_member schedule
  const weeklySchedule = Object.fromEntries(
    hours.schedule.map(day => [
      String(day.dayOfWeek),
      { isOpen: day.isOpen, startTime: day.startTime, endTime: day.endTime, breaks: [] }
    ])
  )

  await serviceClient
    .from('team_members')
    .update({ weekly_schedule: weeklySchedule, slot_interval: hours.slotInterval })
    .eq('business_id', businessId)

  return { success: true, data: null }
}

const paymentSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }),
  z.object({ mode: z.literal('mercadopago') }),
  z.object({
    mode: z.literal('manual_transfer'),
    manualTransfer: z.object({
      alias: z.string().max(80),
      cvu: z.string().max(22),
      accountHolder: z.string().max(200),
    }),
  }),
])

export async function updateSuperAdminBusinessPayment(
  businessId: string,
  payment: {
    mode: 'none' | 'mercadopago' | 'manual_transfer'
    manualTransfer: { alias: string; cvu: string; accountHolder: string }
  }
): Promise<ServerActionResponse<null>> {
  try {
    await assertSuperAdmin()
  } catch {
    return { success: false, error: 'No autorizado' }
  }

  const parsed = paymentSchema.safeParse(payment)
  if (!parsed.success) {
    return { success: false, error: 'Datos de pago inválidos' }
  }

  const serviceClient = createServiceClient()

  const { data: business } = await serviceClient
    .from('businesses')
    .select('settings')
    .eq('id', businessId)
    .single()

  const existingSettings = (business?.settings as Record<string, unknown>) || {}

  let paymentSettings: Record<string, unknown> = {}
  if (payment.mode === 'mercadopago') {
    paymentSettings = { paymentFlowMode: 'mercadopago' }
  } else if (payment.mode === 'manual_transfer') {
    paymentSettings = {
      paymentFlowMode: 'manual_transfer',
      manualTransfer: {
        enabled: true,
        alias: payment.manualTransfer.alias,
        cvu: payment.manualTransfer.cvu,
        accountHolder: payment.manualTransfer.accountHolder,
        message: 'Realiza la transferencia y guarda el comprobante. Nuestro equipo lo revisará y confirmará tu reserva.',
      },
    }
  }

  const { error } = await serviceClient
    .from('businesses')
    .update({ settings: { ...existingSettings, ...paymentSettings } })
    .eq('id', businessId)

  if (error) return { success: false, error: 'Error al guardar pagos' }
  return { success: true, data: null }
}

const servicesSchema = z.array(z.object({
  name: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().min(0),
}))

export async function updateSuperAdminServices(
  businessId: string,
  services: { name: string; durationMinutes: number; price: number }[]
): Promise<ServerActionResponse<null>> {
  try {
    await assertSuperAdmin()
  } catch {
    return { success: false, error: 'No autorizado' }
  }

  const parsed = servicesSchema.safeParse(services)
  if (!parsed.success) {
    return { success: false, error: 'Servicios inválidos' }
  }

  const serviceClient = createServiceClient()

  // Full replace: delete existing, insert new
  const { error: deleteError } = await serviceClient
    .from('services')
    .delete()
    .eq('business_id', businessId)

  if (deleteError) return { success: false, error: 'Error al actualizar servicios' }

  if (services.length > 0) {
    const toInsert = services
      .filter(s => s.name.trim())
      .map(s => ({
        business_id: businessId,
        name: s.name,
        duration_minutes: s.durationMinutes,
        price: s.price,
        is_active: true,
      }))

    if (toInsert.length > 0) {
      const { error: insertError } = await serviceClient.from('services').insert(toInsert)
      if (insertError) return { success: false, error: 'Error al guardar servicios' }
    }
  }

  return { success: true, data: null }
}
