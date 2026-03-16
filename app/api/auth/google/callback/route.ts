import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/google-calendar'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=no_code', request.url))
  }

  try {
    const tokens = await getTokensFromCode(code)

    if (!tokens.refresh_token) {
      console.error('No refresh token received')
      return NextResponse.redirect(new URL('/dashboard/settings?error=no_refresh_token', request.url))
    }

    const supabase = await createClient()

    // Obtain the business_id of the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=not_authenticated', request.url))
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (businessError || !business) {
      console.error('Could not find business for user:', businessError)
      return NextResponse.redirect(new URL('/dashboard/settings?error=no_business', request.url))
    }

    // Save token in google_integrations filtered by business_id (same pattern as MercadoPago)
    const { error: dbError } = await supabase
      .from('google_integrations')
      .upsert({
        business_id: business.id,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id'
      })

    if (dbError) {
      console.error('Error saving Google tokens:', dbError)
      return NextResponse.redirect(new URL('/dashboard/settings?error=db_error', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard/settings?success=google_connected', request.url))
  } catch (error: unknown) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=token_exchange', request.url))
  }
}
