import { createClient, createServiceClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Verify auth before doing anything
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usá JPG, PNG o WebP.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'La imagen debe ser menor a 5MB' }, { status: 400 })
    }

    // Use service client for storage — auth is already verified above
    const supabase = createServiceClient()

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const filename = `public/service-${timestamp}-${randomString}.jpg`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data, error } = await supabase.storage
      .from('service-image')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)

      if (error.message.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage no configurado. Creá un bucket "service-image" en Supabase Storage.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('service-image')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl })
  } catch (error: unknown) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al subir imagen' },
      { status: 500 }
    )
  }
}
