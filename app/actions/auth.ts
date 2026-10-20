'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { sendPasswordResetEmailViaResend } from '@/lib/email'
import { hasSuperAdminRole } from '@/lib/auth/is-super-admin'
import { getAppUrl } from '@/lib/config'
import { passwordResetRequestSchema, passwordUpdateSchema } from '@/lib/validations/auth'
import type { Business, ServerActionResponse } from '@/types/database.types'
import { createClient, createServiceClient } from '@/utils/supabase/server'

const ACTIVE_BUSINESS_COOKIE = 'active_business_id'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Si es super admin, redirigir al panel de admin
  if (hasSuperAdminRole(data.user)) {
    redirect('/super-admin')
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Simple signup - only creates auth user, business created after email verification
export async function signUp(data: {
  email: string
  password: string
}): Promise<ServerActionResponse<null>> {
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'Este email ya está registrado.' }
    }
    return { success: false, error: authError.message }
  }

  return { success: true, data: null }
}

// Send password reset email
export async function sendPasswordResetEmail(): Promise<ServerActionResponse<null>> {
  const supabase = await createClient()
  const origin = getAppUrl()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.email) {
    return { success: false, error: 'No se encontró el email del usuario' }
  }

  const redirectTo = `${origin}/reset-password?next=/dashboard/settings`
  const customResult = await sendCustomPasswordResetEmail(user.email, redirectTo)

  if (customResult.success) {
    return { success: true, data: null }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo,
  })

  if (error) {
    return { success: false, error: 'No pudimos enviar el email. Intenta de nuevo.' }
  }

  return { success: true, data: null }
}

export async function requestPasswordResetEmail(input: {
  email: string
}): Promise<ServerActionResponse<null>> {
  const validated = passwordResetRequestSchema.safeParse(input)

  if (!validated.success) {
    return { success: false, error: 'Email invalido.' }
  }

  const supabase = await createClient()
  const origin = getAppUrl()
  const redirectTo = `${origin}/reset-password`

  const customResult = await sendCustomPasswordResetEmail(
    validated.data.email,
    redirectTo
  )

  if (customResult.success) {
    return { success: true, data: null }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    validated.data.email,
    { redirectTo }
  )

  if (error) {
    return {
      success: false,
      error: 'No pudimos enviar el email. Intenta de nuevo.',
    }
  }

  return { success: true, data: null }
}

async function sendCustomPasswordResetEmail(
  email: string,
  redirectTo: string
): Promise<ServerActionResponse<null>> {
  try {
    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error || !data?.properties?.action_link) {
      return { success: false, error: 'No pudimos generar el enlace.' }
    }

    const resetLink = buildPasswordResetLink(data.properties.action_link)

    const emailResult = await sendPasswordResetEmailViaResend({
      email,
      resetLink,
    })

    if (!emailResult.success) {
      return { success: false, error: emailResult.error ?? 'No pudimos enviar el email.' }
    }

    return { success: true, data: null }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No pudimos enviar el email.',
    }
  }
}

function buildPasswordResetLink(actionLink: string): string {
  try {
    const baseUrl = getAppUrl()
    const originUrl = new URL(baseUrl)
    const actionUrl = new URL(actionLink)

    actionUrl.protocol = originUrl.protocol
    actionUrl.host = originUrl.host
    actionUrl.pathname = '/reset-password'

    return actionUrl.toString()
  } catch {
    return actionLink
  }
}

export async function updatePassword(input: {
  password: string
}): Promise<ServerActionResponse<null>> {
  const validated = passwordUpdateSchema.safeParse(input)

  if (!validated.success) {
    return {
      success: false,
      error: 'La contrasena debe tener al menos 6 caracteres.',
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesion expirada. Inicia sesion de nuevo.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  })

  if (error) {
    return {
      success: false,
      error: 'No pudimos actualizar la contrasena. Intenta de nuevo.',
    }
  }

  return { success: true, data: null }
}

// Request account deletion (creates a system notification for the business)
export async function requestAccountDeletion(input: {
  confirmationName: string
}): Promise<ServerActionResponse<null>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const businessResult = await getCurrentBusiness()
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const businessName = businessResult.data.name?.trim() || ''
    if (!businessName) {
      return { success: false, error: 'El nombre del negocio no está configurado' }
    }

    if (input.confirmationName.trim().toLowerCase() !== businessName.toLowerCase()) {
      return { success: false, error: 'El nombre no coincide' }
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        business_id: businessResult.data.id,
        type: 'system',
        title: 'Solicitud de eliminación de cuenta',
        message: `El negocio solicitó eliminar su cuenta. Usuario: ${user.email ?? 'sin email'}`,
        appointment_id: null,
        metadata: {
          requestedBy: user.email ?? null,
          businessName
        }
      })

    if (error) throw error

    return { success: true, data: null }
  } catch (error: unknown) {
    console.error('Error requesting account deletion:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo enviar la solicitud'
    }
  }
}

// Verificar si el usuario actual es super admin
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return hasSuperAdminRole(user)
}

// Obtener todos los negocios (solo para super admin)
export async function getAllBusinesses(): Promise<ServerActionResponse<Business[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verificar que sea super admin
  if (!hasSuperAdminRole(user)) {
    return { success: false, error: 'No autorizado' }
  }

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .order('name')

  if (error) {
    return { success: false, error: 'Error al obtener negocios' }
  }

  return { success: true, data: businesses }
}

// Establecer el negocio activo (solo para super admin)
export async function setActiveBusiness(businessId: string): Promise<ServerActionResponse<null>> {
  const isAdmin = await isSuperAdmin()

  if (!isAdmin) {
    return { success: false, error: 'No autorizado' }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 semana
  })

  return { success: true, data: null }
}

// Limpiar negocio activo (volver al propio)
export async function clearActiveBusiness(): Promise<ServerActionResponse<null>> {
  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_BUSINESS_COOKIE)
  return { success: true, data: null }
}

export async function signUpWithBusiness(data: {
  email: string
  password: string
  businessName: string
  slug: string
}): Promise<ServerActionResponse<Business>> {
  const supabase = await createClient()

  // 1. Verificar que el slug no exista
  const { data: existingBusinessBySlug } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', data.slug)
    .maybeSingle()

  if (existingBusinessBySlug) {
    return { success: false, error: 'Esta URL ya está en uso. Por favor elige otra.' }
  }

  // 2. Crear usuario en Supabase Auth
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'Este email ya está registrado.' }
    }
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    return { success: false, error: 'Error al crear la cuenta.' }
  }

  // 3. Verificar que el usuario no tenga ya un negocio
  const serviceClient = createServiceClient()

  const { data: existingBusiness } = await serviceClient
    .from('businesses')
    .select('id')
    .eq('owner_id', authData.user.id)
    .maybeSingle()

  if (existingBusiness) {
    return { success: false, error: 'Ya tienes un negocio registrado.' }
  }

  // 4. Crear el negocio asociado al usuario (using service client to bypass RLS)
  console.log('Creating business with:', {
    owner_id: authData.user.id,
    name: data.businessName,
    slug: data.slug,
  })

  const { data: business, error: businessError } = await serviceClient
    .from('businesses')
    .insert({
      owner_id: authData.user.id,
      name: data.businessName,
      slug: data.slug,
    })
    .select()
    .single()

  if (businessError) {
    console.error('Error creating business:', businessError.message, businessError.details, businessError.code)
    return { success: false, error: `Error al crear el negocio: ${businessError.message}` }
  }

  console.log('Business created successfully:', business?.id)

  return { success: true, data: business }
}

export async function getCurrentBusiness(): Promise<ServerActionResponse<Business & { isViewing?: boolean }>> {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const isSuperAdminUser = hasSuperAdminRole(user)
  const activeBusinessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value

  // Si es super admin y tiene un negocio activo seleccionado, obtener ese
  if (isSuperAdminUser && activeBusinessId) {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', activeBusinessId)
      .single()

    if (!error && business) {
      return { success: true, data: { ...business, isViewing: true } }
    }
  }

  // Comportamiento normal: obtener el negocio del usuario
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  // Si encontró negocio propio, devolverlo
  if (!error && business) {
    return { success: true, data: business }
  }

  // Si es super admin y no tiene negocio propio, obtener el primero disponible
  if (isSuperAdminUser) {
    const { data: fallbackBusiness, error: fallbackError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!fallbackError && fallbackBusiness) {
      return { success: true, data: { ...fallbackBusiness, isViewing: true } }
    }
  }

  // Usuario normal sin negocio - necesita completar onboarding
  return { success: false, error: 'No tienes un negocio configurado. Completa el proceso de registro.' }
}

export async function getBusinessBySlug(slug: string): Promise<ServerActionResponse<Business>> {
  const supabase = await createClient()

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    return { success: false, error: 'Negocio no encontrado' }
  }

  return { success: true, data: business }
}
