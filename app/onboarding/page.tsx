import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import OnboardingWizard from '@/components/onboarding/onboarding-wizard'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('settings')
    .eq('owner_id', user.id)
    .maybeSingle()

  const params = await searchParams
  const isDevPreview = process.env.NODE_ENV === 'development' && params.preview === '1'

  if (!isDevPreview && business?.settings?.businessHours && business.settings.businessHours.length > 0) {
    redirect('/dashboard')
  }

  return <OnboardingWizard />
}
