'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ServerActionResponse, Business } from '@/types/database.types'

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
  if (data.user?.user_metadata?.is_super_admin) {
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

// Verificar si el usuario actual es super admin
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verificar en ambos lugares (user_metadata y app_metadata)
  return user?.user_metadata?.is_super_admin === true || user?.app_metadata?.is_super_admin === true
}

// Obtener todos los negocios (solo para super admin)
export async function getAllBusinesses(): Promise<ServerActionResponse<Business[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verificar que sea super admin
  if (!user.user_metadata?.is_super_admin) {
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
  const { data: existingBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', data.slug)
    .single()

  if (existingBusiness) {
    return { success: false, error: 'Esta URL ya está en uso. Por favor elige otra.' }
  }

  // 2. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
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

  // 3. Crear el negocio asociado al usuario
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert({
      owner_id: authData.user.id,
      name: data.businessName,
      slug: data.slug,
    })
    .select()
    .single()

  if (businessError) {
    console.error('Error creating business:', businessError)
    return { success: false, error: 'Error al crear el negocio. Por favor intenta de nuevo.' }
  }

  return { success: true, data: business }
}

export async function getCurrentBusiness(): Promise<ServerActionResponse<Business & { isViewing?: boolean }>> {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const isSuperAdminUser = user.user_metadata?.is_super_admin === true
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
    .single()

  // Si encontró negocio propio, devolverlo
  if (!error && business) {
    return { success: true, data: business }
  }

  // Si es super admin y no tiene negocio propio, obtener el primero disponible
  if (isSuperAdminUser) {
    const { data: anyBusiness, error: anyError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!anyError && anyBusiness) {
      return { success: true, data: { ...anyBusiness, isViewing: true } }
    }
  }

  return { success: false, error: 'Negocio no encontrado' }
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
