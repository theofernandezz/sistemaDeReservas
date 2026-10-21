// @vitest-environment node
import { readFileSync } from 'fs'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({ getCurrentBusiness: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendNewAppointmentNotification: vi.fn().mockResolvedValue({ success: true }),
  sendClientConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendManualTransferPendingEmail: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/google-calendar', () => ({ createCalendarEvent: vi.fn() }))
// Real implementation by default; the createAppointment test overrides it once (slot rules are tested elsewhere)
vi.mock('@/lib/availability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/availability')>()
  return { ...actual, computeAvailableSlots: vi.fn(actual.computeAvailableSlots) }
})

import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/utils/supabase/server'
import { computeAvailableSlots } from '@/lib/availability'
import { buildManageToken } from '@/lib/manage-token'
import { createAppointment } from '@/app/actions'
import { getPublicAppointmentWithProof } from '@/app/actions/proof'
import ReservaPage from '@/app/reserva/[token]/page'
import { POST as uploadProof } from '@/app/api/upload/proof/route'

const SECRET = 'test-secret-test-secret-test-secret-0123456789'
const APPT_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const SERVICE_ID = '44444444-4444-4444-8444-444444444444'

beforeEach(() => {
  process.env.MANAGE_LINK_SECRET = SECRET
})
afterEach(() => {
  vi.clearAllMocks()
})

// ─── Availability: RPC first, tolerant of the pre-migration state ────────────

function availabilityClient(rpcResult: { data: unknown; error: { code: string } | null }) {
  const tables: string[] = []
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  function table(name: string) {
    tables.push(name)
    const q = {
      select: () => q,
      gte: () => q,
      lte: () => q,
      eq: () => q,
      neq: () => q,
      single: () => {
        if (name === 'services') return Promise.resolve({ data: { duration_minutes: 60, business_id: 'biz-1' }, error: null })
        if (name === 'businesses') return Promise.resolve({ data: { settings: {} }, error: null })
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    }
    return q
  }
  return { client: { from: table, rpc } as unknown as SupabaseClient, rpc, tables }
}

const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

describe('availability reads appointments through get_busy_slots', () => {
  it('uses the RPC and never queries appointments directly', async () => {
    const { client, rpc, tables } = availabilityClient({ data: [], error: null })
    await computeAvailableSlots(client, 'svc-1', tomorrow(), { teamMemberId: 'any' }).catch(() => undefined)

    expect(rpc).toHaveBeenCalledWith('get_busy_slots', expect.objectContaining({ p_business_id: 'biz-1' }))
    expect(tables).not.toContain('appointments')
  })

  it('falls back to the direct query only while the RPC does not exist (pre-025)', async () => {
    const { client, tables } = availabilityClient({ data: null, error: { code: 'PGRST202' } })
    const fallback = availabilityClient({ data: [], error: null })
    vi.mocked(createServiceClient).mockReturnValue(fallback.client as never)
    await computeAvailableSlots(client, 'svc-1', tomorrow(), { teamMemberId: 'any' }).catch(() => undefined)

    // the fallback read must NOT use the (anon) client it was given
    expect(tables).not.toContain('appointments')
    expect(fallback.tables).toContain('appointments')
  })

  it('does not swallow other RPC errors', async () => {
    const { client, tables } = availabilityClient({ data: null, error: { code: '57014' } })
    await expect(computeAvailableSlots(client, 'svc-1', tomorrow(), { teamMemberId: 'any' })).rejects.toMatchObject({ code: '57014' })
    expect(tables).not.toContain('appointments')
  })
})

// ─── createAppointment: no anon access to appointments ───────────────────────

describe('createAppointment does not touch appointments with the anon client', () => {
  it('runs the overlap check and INSERT ... RETURNING with the service client', async () => {
    const anonTables: string[] = []
    const serviceTables: string[] = []
    const make = (log: string[]) => (name: string) => {
      log.push(name)
      const q = {
        select: () => q,
        insert: () => q,
        update: () => q,
        eq: () => q,
        neq: () => q,
        or: () => q,
        single: () =>
          Promise.resolve(
            name === 'services'
              ? { data: { id: SERVICE_ID, business_id: 'biz-1', name: 'Corte', price: 1, duration_minutes: 60 }, error: null }
              : { data: { id: APPT_ID, manage_token_version: 1 }, error: null }
          ),
        then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      }
      return q
    }
    vi.mocked(createClient).mockResolvedValue({
      from: make(anonTables),
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>)
    vi.mocked(createServiceClient).mockReturnValue({ from: make(serviceTables) } as unknown as ReturnType<typeof createServiceClient>)

    const start = new Date(Date.now() + 72 * 3600 * 1000)
    const arTime = new Date(start.getTime() - 3 * 3600 * 1000).toISOString().slice(11, 16)
    vi.mocked(computeAvailableSlots).mockResolvedValueOnce([{ time: arTime, available: true }])
    const result = await createAppointment({
      service_id: SERVICE_ID,
      start_time: start.toISOString(),
      team_member_id: '99999999-9999-4999-8999-999999999999',
      client_name: 'Ana',
      client_phone: '1122334455',
      client_email: 'ana@example.com',
    })

    expect(result.success).toBe(true)
    expect(anonTables).not.toContain('appointments')
    expect(serviceTables.filter((t) => t === 'appointments').length).toBeGreaterThanOrEqual(2)
  })
})

// ─── /reserva/[token] and /api/upload/proof require the manage token ─────────

function appointmentServiceClient(row: Record<string, unknown> | null) {
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: () => Promise.resolve({ data: row, error: null }),
    single: () => Promise.resolve({ data: row, error: null }),
    update: () => q,
    insert: () => Promise.resolve({ error: null }),
  }
  const storage = {
    from: () => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'p' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://files.test/p' } }),
    }),
  }
  vi.mocked(createServiceClient).mockReturnValue({ from: () => q, storage } as unknown as ReturnType<typeof createServiceClient>)
}

const proofRow = { id: APPT_ID, business_id: 'biz-1', status: 'pending', payment_status: 'pending', manage_token_version: 1 }

function uploadRequest(token: string | null) {
  const form = new FormData()
  form.append('file', new File(['x'], 'p.png', { type: 'image/png' }))
  if (token !== null) form.append('token', token)
  return new NextRequest('http://localhost/api/upload/proof', { method: 'POST', body: form })
}

describe('POST /api/upload/proof', () => {
  it('rejects a bare appointment id (the id is not a credential)', async () => {
    appointmentServiceClient(proofRow)
    expect((await uploadProof(uploadRequest(APPT_ID))).status).toBe(400)
  })

  it('rejects a missing token', async () => {
    appointmentServiceClient(proofRow)
    expect((await uploadProof(uploadRequest(null))).status).toBe(400)
  })

  it('rejects a token of another appointment / another version', async () => {
    appointmentServiceClient(proofRow)
    expect((await uploadProof(uploadRequest(buildManageToken(OTHER_ID, 1)))).status).toBe(404)
    expect((await uploadProof(uploadRequest(buildManageToken(APPT_ID, 2)))).status).toBe(404)
  })

  it('accepts a valid token', async () => {
    appointmentServiceClient(proofRow)
    const res = await uploadProof(uploadRequest(buildManageToken(APPT_ID, 1)))
    expect(res.status).toBe(200)
  })
})

describe('getPublicAppointmentWithProof', () => {
  const row = { ...proofRow, client_name: 'Ana' }

  it('rejects a bare id, a wrong token and a stale version', async () => {
    appointmentServiceClient(row)
    expect((await getPublicAppointmentWithProof(APPT_ID)).success).toBe(false)
    expect((await getPublicAppointmentWithProof(buildManageToken(OTHER_ID, 1))).success).toBe(false)
    expect((await getPublicAppointmentWithProof(buildManageToken(APPT_ID, 2))).success).toBe(false)
  })

  it('returns the appointment for a valid token, without the token version', async () => {
    appointmentServiceClient(row)
    const result = await getPublicAppointmentWithProof(buildManageToken(APPT_ID, 1))
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ id: APPT_ID, client_name: 'Ana' })
    expect(result.data).not.toHaveProperty('manage_token_version')
  })
})

// ─── /reserva with a bare id (old email links) ───────────────────────────────

describe('/reserva/[token] with a bare appointment id', () => {
  it('redirects to the /cancel/{id} resend page instead of 404', async () => {
    await expect(ReservaPage({ params: Promise.resolve({ token: APPT_ID }) })).rejects.toThrow(/NEXT_REDIRECT/)
    try {
      await ReservaPage({ params: Promise.resolve({ token: APPT_ID }) })
    } catch (e) {
      expect(String((e as { digest?: string }).digest)).toContain(`/cancel/${APPT_ID}`)
    }
  })
})

// ─── Migration 025 ────────────────────────────────────────────────────────────

describe('migration 025', () => {
  const sql = readFileSync('supabase/migrations/025_close_public_appointments_read.sql', 'utf8')

  it('drops both public SELECT policies by exact name, in one transaction', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Public can view appointments by ID" ON public.appointments')
    expect(sql).toContain('DROP POLICY IF EXISTS "anon_select_appointments" ON public.appointments')
    expect(sql.match(/^BEGIN;/gm)).toHaveLength(1)
    expect(sql.match(/^COMMIT;/gm)).toHaveLength(1)
  })

  it('defines the RPC as SECURITY DEFINER with a fixed search_path, executable by anon', () => {
    expect(sql).toMatch(/SECURITY DEFINER\s+SET search_path = public, pg_temp/)
    expect(sql).toContain('TO anon, authenticated')
    expect(sql).toContain('RETURNS TABLE (start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, team_member_id UUID)')
  })

  it('ends with a guard that raises when a SELECT true policy remains', () => {
    expect(sql).toMatch(/cmd IN \('SELECT', 'ALL'\)[\s\S]*= 'true'[\s\S]*RAISE EXCEPTION/)
  })
})
