import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Inicia el flujo OAuth de Mercado Pago
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Generar state para prevenir CSRF
  const state = crypto.randomBytes(32).toString('hex')

  // Guardar state en cookie
  const cookieStore = await cookies()
  cookieStore.set('mp_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutos
  })

  // Construir URL de autorización de MP
  const clientId = process.env.MERCADOPAGO_CLIENT_ID
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error('Missing MP environment variables')
    return NextResponse.redirect(new URL('/dashboard/settings?error=config', request.url))
  }

  const authUrl = new URL('https://auth.mercadopago.com/authorization')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
