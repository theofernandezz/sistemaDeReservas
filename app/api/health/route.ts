import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Health check endpoint for monitoring
 *
 * Verifies:
 * - API is responding
 * - Database connectivity
 * - Critical environment variables are set
 *
 * Returns:
 * - 200 OK if everything is healthy
 * - 500 Internal Server Error if there are issues
 */
export async function GET() {
  const checks: {
    name: string
    status: 'ok' | 'error'
    message?: string
  }[] = []

  // 1. Check database connectivity
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('businesses').select('id').limit(1)

    if (error) {
      checks.push({
        name: 'database',
        status: 'error',
        message: 'Database query failed',
      })
    } else {
      checks.push({
        name: 'database',
        status: 'ok',
      })
    }
  } catch (error) {
    checks.push({
      name: 'database',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // 2. Check critical environment variables (without exposing values)
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'MERCADOPAGO_CLIENT_ID',
    'MERCADOPAGO_CLIENT_SECRET',
    'MP_WEBHOOK_SECRET',
    'CRON_SECRET',
  ]

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  )

  if (missingEnvVars.length > 0) {
    checks.push({
      name: 'environment',
      status: 'error',
      message: `Missing env vars: ${missingEnvVars.join(', ')}`,
    })
  } else {
    checks.push({
      name: 'environment',
      status: 'ok',
    })
  }

  // 3. Determine overall health
  const hasErrors = checks.some((check) => check.status === 'error')
  const overallStatus = hasErrors ? 'unhealthy' : 'healthy'

  // 4. Return response
  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  }

  if (hasErrors) {
    return NextResponse.json(response, { status: 500 })
  }

  return NextResponse.json(response, { status: 200 })
}
