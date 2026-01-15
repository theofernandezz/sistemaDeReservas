import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import OnboardingWizard from '@/components/onboarding/onboarding-wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user has a business and if onboarding is needed
  const { data: business } = await supabase
    .from('businesses')
    .select('settings')
    .eq('owner_id', user.id)
    .single()

  // If business already has businessHours configured, redirect to dashboard
  if (business?.settings?.businessHours && business.settings.businessHours.length > 0) {
    redirect('/dashboard')
  }

  return <OnboardingWizard />
}
