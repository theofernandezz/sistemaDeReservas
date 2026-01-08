import { MercadoPagoConfig, Preference } from 'mercadopago'

// Crear cliente de MP con el access_token del vendedor
export function createMPClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken })
}

// Tipo para items de preferencia
interface PreferenceItem {
  id: string
  title: string
  description?: string
  quantity: number
  unit_price: number
  currency_id?: string
}

// Crear preferencia de pago (Checkout Pro)
export async function createPaymentPreference(
  accessToken: string,
  items: PreferenceItem[],
  metadata: {
    booking_id?: string
    pending_booking_id?: string
    business_id: string
  },
  backUrls: {
    success: string
    failure: string
    pending: string
  }
) {
  const client = createMPClient(accessToken)
  const preference = new Preference(client)

  console.log('MP Preference backUrls:', JSON.stringify(backUrls))

  const result = await preference.create({
    body: {
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id || 'ARS',
      })),
      metadata: metadata,
      back_urls: {
        success: backUrls.success,
        failure: backUrls.failure,
        pending: backUrls.pending,
      },
      // auto_return solo funciona si back_urls está bien definido
      // auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`,
    },
  })

  return result
}

// Refrescar access_token usando refresh_token
export async function refreshMPToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
} | null> {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing MP credentials')
    return null
  }

  try {
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh MP token:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error refreshing MP token:', error)
    return null
  }
}
