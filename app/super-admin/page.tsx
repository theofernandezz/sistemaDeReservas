import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SuperAdminPanel } from '../super-admin/super-admin-panel'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar que sea super admin
  if (!user.user_metadata?.is_super_admin) {
    redirect('/dashboard')
  }

  // Obtener todos los negocios con información del owner
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      created_at,
      owner_id
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching businesses:', error)
  }

  // Obtener emails de los owners
  // Nota: En producción podrías tener una tabla de profiles
  const businessesWithOwners = businesses || []

  return <SuperAdminPanel businesses={businessesWithOwners} userEmail={user.email || ''} />
}
