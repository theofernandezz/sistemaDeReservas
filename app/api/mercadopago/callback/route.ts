import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/utils/supabase/server'
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
    return closePopupWithResult('error', 'denied')
  }

  if (!code || !state) {
    return closePopupWithResult('error', 'invalid')
  }

  // Validar state contra cookie
  const cookieStore = await cookies()
  const savedState = cookieStore.get('mp_oauth_state')?.value

  if (!savedState || savedState !== state) {
    console.error('State mismatch:', { savedState, state })
    return closePopupWithResult('error', 'invalid_state')
  }

  // Limpiar cookie de state
  cookieStore.delete('mp_oauth_state')

  // Intercambiar code por access_token
  const clientId = process.env.MERCADOPAGO_CLIENT_ID
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing MP environment variables')
    return closePopupWithResult('error', 'config')
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
      return closePopupWithResult('error', 'token')
    }

    const tokenData = await tokenResponse.json()

    // tokenData contiene:
    // - access_token
    // - refresh_token
    // - expires_in (segundos)
    // - user_id (ID del usuario en MP)
    // - public_key

    // Obtener el business_id - primero verificar si hay uno activo (super admin visitando)
    const cookieStore = await cookies()
    const activeBusinessId = cookieStore.get('active_business_id')?.value

    let businessId: string | null = null

    if (activeBusinessId) {
      // Verificar que el business existe
      const { data: activeBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', activeBusinessId)
        .single()

      if (activeBiz) {
        businessId = activeBiz.id
      }
    }

    // Si no hay business activo, buscar el del usuario
    if (!businessId) {
      const { data: ownBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (ownBusiness) {
        businessId = ownBusiness.id
      }
    }

    if (!businessId) {
      console.error('Business not found for user:', user.id)
      return closePopupWithResult('error', 'no_business')
    }

    // Calcular fecha de expiración
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Guardar o actualizar la integración usando service role
    // (bypasses RLS porque estamos guardando tokens de OAuth)
    const serviceSupabase = createServiceClient()
    const { error: upsertError } = await serviceSupabase
      .from('mp_integrations')
      .upsert({
        business_id: businessId,
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
      return closePopupWithResult('error', 'save')
    }

    // Éxito!
    return closePopupWithResult('success')

  } catch (err) {
    console.error('MP OAuth exception:', err)
    return closePopupWithResult('error', 'exception')
  }
}

// Helper para cerrar popup y comunicar resultado
function closePopupWithResult(status: 'success' | 'error', errorCode?: string) {
  const params = status === 'success'
    ? 'mp_success=true'
    : `mp_error=${errorCode || 'unknown'}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Conectando...</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.location.href = '/dashboard/settings?${params}';
            window.close();
          } else {
            window.location.href = '/dashboard/settings?${params}';
          }
        </script>
        <p>Redirigiendo...</p>
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
