import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Get the origin from the request
  const origin = request.nextUrl.origin

  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  })
}
