import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// Callback de Mercado Pago OAuth
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Si hay error, redirigir con mensaje
  if (error) {
    console.error('MP OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?mp_error=denied', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?mp_error=invalid', request.url))
  }

  // Validar state contra cookie
  const cookieStore = await cookies()
  const savedState = cookieStore.get('mp_oauth_state')?.value

  if (!savedState || savedState !== state) {
    console.error('State mismatch:', { savedState, state })
    return NextResponse.redirect(new URL('/dashboard/settings?mp_error=invalid_state', request.url))
  }

  // Limpiar cookie de state
  cookieStore.delete('mp_oauth_state')

  // Intercambiar code por access_token
  const clientId = process.env.MERCADOPAGO_CLIENT_ID
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing MP environment variables')
    return NextResponse.redirect(new URL('/dashboard/settings?mp_error=config', request.url))
  }

  try {
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('MP token error:', errorData)
      return NextResponse.redirect(new URL('/dashboard/settings?mp_error=token', request.url))
    }

    const tokenData = await tokenResponse.json()

    // tokenData contiene:
    // - access_token
    // - refresh_token
    // - expires_in (segundos)
    // - user_id (ID del usuario en MP)
    // - public_key

    // Obtener el business_id del usuario
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      console.error('Business not found:', bizError)
      return NextResponse.redirect(new URL('/dashboard/settings?mp_error=no_business', request.url))
    }

    // Calcular fecha de expiración
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Guardar o actualizar la integración
    const { error: upsertError } = await supabase
      .from('mp_integrations')
      .upsert({
        business_id: business.id,
        mp_user_id: tokenData.user_id.toString(),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        public_key: tokenData.public_key || null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id',
      })

    if (upsertError) {
      console.error('Error saving MP integration:', upsertError)
      return NextResponse.redirect(new URL('/dashboard/settings?mp_error=save', request.url))
    }

    // Éxito!
    return NextResponse.redirect(new URL('/dashboard/settings?mp_success=true', request.url))

  } catch (err) {
    console.error('MP OAuth exception:', err)
    return NextResponse.redirect(new URL('/dashboard/settings?mp_error=exception', request.url))
  }
}
