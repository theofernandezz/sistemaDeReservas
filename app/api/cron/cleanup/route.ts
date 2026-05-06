import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/server'

const CRON_SECRET = process.env.CRON_SECRET

// Cancelled appointments are deleted after 1 day
const CANCELLED_DAYS = 1
// Completed appointments are deleted after 30 days
const COMPLETED_DAYS = 30

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    console.error('CRITICAL: CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Service unavailable - cron not configured' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const urlSecret = request.nextUrl.searchParams.get('secret')
  const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret

  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const now = new Date()

    const cancelledCutoff = new Date(now.getTime() - CANCELLED_DAYS * 24 * 60 * 60 * 1000)
    const completedCutoff = new Date(now.getTime() - COMPLETED_DAYS * 24 * 60 * 60 * 1000)

    const [cancelledResult, completedResult, autoApproveResult, expiredProofResult] = await Promise.all([
      supabase
        .from('appointments')
        .delete()
        .eq('status', 'cancelled')
        .lt('start_time', cancelledCutoff.toISOString()),
      supabase
        .from('appointments')
        .delete()
        .eq('status', 'completed')
        .lt('end_time', completedCutoff.toISOString()),
      // Auto-approve proofs where the business hasn't acted within the deadline
      supabase
        .from('appointments')
        .update({ payment_status: 'paid' })
        .eq('payment_status', 'pending_confirmation')
        .lt('proof_auto_approve_at', now.toISOString()),
      // Cancel appointments where the client never uploaded a proof in time
      supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('payment_status', 'pending')
        .is('proof_url', null)
        .lt('proof_expires_at', now.toISOString()),
    ])

    if (cancelledResult.error) {
      console.error('Error deleting cancelled appointments:', cancelledResult.error)
    }
    if (completedResult.error) {
      console.error('Error deleting completed appointments:', completedResult.error)
    }
    if (autoApproveResult.error) {
      console.error('Error auto-approving payment proofs:', autoApproveResult.error)
    }
    if (expiredProofResult.error) {
      console.error('Error cancelling appointments with expired proof deadline:', expiredProofResult.error)
    }

    if (cancelledResult.error || completedResult.error || autoApproveResult.error || expiredProofResult.error) {
      return NextResponse.json({ error: 'Partial cleanup failure' }, { status: 500 })
    }

    console.log(`Cleanup cron: cancelled cutoff=${cancelledCutoff.toISOString()}, completed cutoff=${completedCutoff.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Deleted cancelled (>${CANCELLED_DAYS}d) and completed (>${COMPLETED_DAYS}d) appointments.`,
    })
  } catch (error: unknown) {
    console.error('Cleanup cron error:', error)
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
