import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'))

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (nextPath) {
        return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
      }

      if (user) {
        // Check if user already has a business
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id, settings')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!existingBusiness) {
          // Create empty business for the user (using service client to bypass RLS)
          const serviceClient = createServiceClient()
          const { data: newBusiness, error: createError } = await serviceClient
            .from('businesses')
            .insert({
              owner_id: user.id,
              name: 'Mi Negocio', // Placeholder, will be updated in onboarding
              slug: `negocio-${user.id.slice(0, 8)}`, // Temp slug
              admin_notification_email: user.email ?? null,
            })
            .select('id, settings')
            .single()

          if (createError) {
            console.error('Error creating business in callback:', createError)
            // Continue to onboarding anyway - it will handle creation there
          }

          // Redirect to onboarding for new users
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }

        // Check if onboarding is complete (has business hours configured)
        const needsOnboarding = !existingBusiness?.settings?.businessHours ||
          existingBusiness.settings.businessHours.length === 0

        if (needsOnboarding) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
      }

      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    }
  }

  // Return the user to login with error
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
}

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null
  if (!nextPath.startsWith('/')) return null
  if (nextPath.startsWith('//')) return null
  return nextPath
}
