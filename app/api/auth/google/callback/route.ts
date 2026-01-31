import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/google-calendar'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/admin/settings?error=oauth_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/admin/settings?error=no_code', request.url))
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.refresh_token) {
      console.error('No refresh token received')
      return NextResponse.redirect(new URL('/admin/settings?error=no_refresh_token', request.url))
    }

    // Store tokens in Supabase settings table
    const supabase = await createClient()

    // Upsert the google calendar settings
    const { error: dbError } = await supabase
      .from('app_settings')
      .upsert({
        key: 'google_calendar_refresh_token',
        value: tokens.refresh_token,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (dbError) {
      console.error('Error saving tokens:', dbError)
      return NextResponse.redirect(new URL('/admin/settings?error=db_error', request.url))
    }

    // Redirect back to settings with success
    return NextResponse.redirect(new URL('/admin/settings?success=google_connected', request.url))
  } catch (error: unknown) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.redirect(new URL('/admin/settings?error=token_exchange', request.url))
  }
}
