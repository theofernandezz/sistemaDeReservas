import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const authUrl = getGoogleAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error generating auth URL' }, { status: 500 })
  }
}
