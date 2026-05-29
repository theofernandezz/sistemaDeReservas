/**
 * POST /api/upload/proof
 *
 * Public endpoint — no session required. Accepts a proof-of-payment file
 * and an appointmentId, uploads to Supabase Storage, and transitions the
 * appointment to 'pending_confirmation'.
 *
 * SETUP: Create a bucket named "payment-proofs" in Supabase Storage.
 *   - Public bucket: YES (so the URL is accessible to the business dashboard)
 *   - Allowed MIME types: image/jpeg, image/png, image/heic, image/heif,
 *                         image/webp, application/pdf
 *   - Max file size: 10 MB
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/server'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
])

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const appointmentId = formData.get('appointmentId')

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (typeof appointmentId !== 'string' || !appointmentId.trim()) {
      return NextResponse.json({ error: 'appointmentId requerido' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Sube una imagen (JPG, PNG, HEIC, WEBP) o PDF.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo supera el límite de 10 MB' },
        { status: 400 }
      )
    }

    // Use service client — public request, no user session
    const supabase = createServiceClient()

    // Validate appointment exists and is awaiting proof
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, business_id, status, payment_status')
      .eq('id', appointmentId.trim())
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Esta reserva fue cancelada y ya no acepta comprobantes' },
        { status: 409 }
      )
    }

    if (appointment.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta reserva no está esperando un comprobante' },
        { status: 409 }
      )
    }

    // Build storage path: {businessId}/{appointmentId}/{timestamp}-{random}.{ext}
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = EXTENSION_MAP[file.type] ?? 'bin'
    const storagePath = `${appointment.business_id}/${appointmentId}/${timestamp}-${random}.${ext}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Proof upload error:', uploadError)

      if (uploadError.message.includes('Bucket not found')) {
        return NextResponse.json(
          {
            error:
              'Almacenamiento no configurado. Crea un bucket "payment-proofs" en Supabase Storage.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('payment-proofs').getPublicUrl(uploadData.path)

    const now = new Date()
    const autoApproveAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h

    // Update appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        payment_status: 'pending_confirmation',
        proof_url: publicUrl,
        proof_uploaded_at: now.toISOString(),
        proof_auto_approve_at: autoApproveAt.toISOString(),
      })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('Error updating appointment after proof upload:', updateError)
      return NextResponse.json({ error: 'Error al actualizar la reserva' }, { status: 500 })
    }

    // Create notification for the business
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'proof_uploaded',
      title: 'Nuevo comprobante',
      message: 'Un cliente subió un comprobante de pago',
      appointment_id: appointmentId,
      business_id: appointment.business_id,
    })

    if (notifError) {
      // Non-fatal — log and continue
      console.error('Error creating proof notification:', notifError)
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: unknown) {
    console.error('Proof upload route error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
