import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { NextRequest } from 'next/server'
import * as crypto from 'crypto'

// Set environment variables
process.env.RESEND_API_KEY = 'test-resend-api-key'
const WEBHOOK_SECRET = 'test-webhook-secret'
process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

// Side effects (email / calendar) are not under test here
vi.mock('@/lib/email', () => ({
  sendNewAppointmentNotification: vi.fn().mockResolvedValue(undefined),
  sendClientConfirmation: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/google-calendar', () => ({
  createCalendarEvent: vi.fn().mockResolvedValue(undefined),
}))

import { createClient, createServiceClient } from '@/utils/supabase/server'

// MSW Server for mocking external APIs
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

type QueryResult = { data: unknown; error: unknown }

/**
 * Fake Supabase client. One persistent builder per table so that the test
 * configuration and spies are the SAME objects the handler uses.
 * - `list`: result when the query is awaited directly (select/update chains)
 * - `single`: result of .single()
 */
interface TableConfig {
  list?: QueryResult
  single?: QueryResult
  listError?: Error
}

function createFakeDb(tables: Record<string, TableConfig>) {
  const empty: QueryResult = { data: null, error: null }
  const builders = new Map<string, ReturnType<typeof buildTable>>()

  function buildTable(cfg: TableConfig) {
    const list = cfg.list ?? { data: [], error: null }
    const single = cfg.single ?? empty
    const q = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      not: vi.fn(() => q),
      insert: vi.fn(() => q),
      update: vi.fn(() => q),
      single: vi.fn(() => Promise.resolve(single)),
      then: (resolve: (v: QueryResult) => unknown, reject: (e: unknown) => unknown) =>
        (cfg.listError ? Promise.reject(cfg.listError) : Promise.resolve(list)).then(resolve, reject),
    }
    return q
  }

  const client = {
    from: vi.fn((table: string) => {
      if (!builders.has(table)) builders.set(table, buildTable(tables[table] ?? {}))
      return builders.get(table)!
    }),
  }
  return { client, table: (name: string) => client.from(name) }
}

const BUSINESS_ID = 'business-123'
const PENDING_ID = '11111111-1111-4111-8111-111111111111'
const APPOINTMENT_ID = 'appointment-123'
const PAYMENT_ID = '987654321'
const ACCESS_TOKEN = 'test-access-token'

const pendingBooking = {
  id: PENDING_ID,
  service_id: 'service-123',
  start_time: '2026-02-01T10:00:00Z',
  end_time: '2026-02-01T11:00:00Z',
  client_name: 'Test Client',
  client_phone: '+5491122334455',
  client_email: null,
  addons: [],
  payment_amount: 15000,
  mp_preference_id: 'pref-123',
  status: 'pending_payment',
  service: { business_id: BUSINESS_ID, name: 'Test Service', price: 30000 },
}

function signedHeaders(dataId: string): Record<string, string> {
  const ts = '1234567890'
  const requestId = 'req-123'
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex')
  return {
    'Content-Type': 'application/json',
    'x-signature': `ts=${ts},v1=${hash}`,
    'x-request-id': requestId,
  }
}

function webhookRequest(body: unknown, headers: Record<string, string>): NextRequest {
  return new Request('http://localhost/api/mercadopago/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function mockMpPayment(status: string, amount = 15000) {
  const calls = { count: 0, authHeader: null as string | null }
  server.use(
    http.get(`https://api.mercadopago.com/v1/payments/${PAYMENT_ID}`, ({ request }) => {
      calls.count++
      calls.authHeader = request.headers.get('authorization')
      return HttpResponse.json({
        id: PAYMENT_ID,
        status,
        transaction_amount: amount,
        metadata: { pending_booking_id: PENDING_ID },
      })
    })
  )
  return calls
}

function setup(tables: Record<string, TableConfig>) {
  const service = createFakeDb(tables)
  // Anon/session client: no data at all, like prod after RLS is closed
  const anon = createFakeDb({})
  vi.mocked(createServiceClient).mockReturnValue(service.client as unknown as ReturnType<typeof createServiceClient>)
  vi.mocked(createClient).mockResolvedValue(anon.client as unknown as Awaited<ReturnType<typeof createClient>>)
  return { service, anon }
}

const pendingTables = (): Record<string, TableConfig> => ({
  pending_bookings: { list: { data: [pendingBooking], error: null } },
  mp_integrations: { single: { data: { access_token: ACCESS_TOKEN }, error: null } },
  appointments: { single: { data: { id: APPOINTMENT_ID }, error: null } },
})

async function callWebhook(body: unknown, headers: Record<string, string>) {
  const { POST } = await import('@/app/api/mercadopago/webhook/route')
  return POST(webhookRequest(body, headers))
}

const paymentBody = { type: 'payment', data: { id: PAYMENT_ID } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MercadoPago Webhook - Payment Flow', () => {
  describe('SUCCESS Flow - Payment Approved', () => {
    it('should create the appointment using the service client when payment is approved', async () => {
      const { service, anon } = setup(pendingTables())
      const mp = mockMpPayment('approved')

      const response = await callWebhook(paymentBody, signedHeaders(PAYMENT_ID))

      expect(response.status).toBe(200)
      // Uses the service client, never the anon/session one
      expect(createServiceClient).toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
      expect(anon.client.from).not.toHaveBeenCalled()
      // access_token was read and used against MP
      expect(service.table('mp_integrations').select).toHaveBeenCalledWith('access_token')
      expect(mp.authHeader).toBe(`Bearer ${ACCESS_TOKEN}`)
      // Appointment created with the right data
      const insert = service.table('appointments').insert
      expect(insert).toHaveBeenCalledTimes(1)
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: BUSINESS_ID,
          service_id: 'service-123',
          status: 'confirmed',
          payment_status: 'paid',
          payment_id: PAYMENT_ID,
          payment_amount: 15000,
        })
      )
      // Pending booking marked as paid and linked
      expect(service.table('pending_bookings').update).toHaveBeenCalledWith({
        status: 'paid',
        converted_appointment_id: APPOINTMENT_ID,
      })
    })

    it('should NOT create the appointment when the paid amount does not match', async () => {
      const { service } = setup(pendingTables())
      const mp = mockMpPayment('approved', 1)

      const response = await callWebhook(paymentBody, signedHeaders(PAYMENT_ID))

      expect(response.status).toBe(200)
      expect(mp.count).toBeGreaterThan(0)
      expect(service.table('appointments').insert).not.toHaveBeenCalled()
    })

    it('should confirm a legacy appointment when payment is approved', async () => {
      const legacyId = '22222222-2222-4222-8222-222222222222'
      const { service } = setup({
        pending_bookings: { list: { data: [], error: null } },
        mp_integrations: { single: { data: { access_token: ACCESS_TOKEN }, error: null } },
        appointments: {
          list: {
            data: [{ id: legacyId, mp_preference_id: 'p', payment_status: 'pending', service: { business_id: BUSINESS_ID } }],
            error: null,
          },
        },
      })
      server.use(
        http.get(`https://api.mercadopago.com/v1/payments/${PAYMENT_ID}`, () =>
          HttpResponse.json({ id: PAYMENT_ID, status: 'approved', transaction_amount: 100, metadata: { booking_id: legacyId } })
        )
      )

      const response = await callWebhook(paymentBody, signedHeaders(PAYMENT_ID))

      expect(response.status).toBe(200)
      expect(createClient).not.toHaveBeenCalled()
      expect(service.table('appointments').update).toHaveBeenCalledWith(
        expect.objectContaining({ payment_status: 'paid', payment_id: PAYMENT_ID, status: 'confirmed' })
      )
    })
  })

  describe('FAILURE Flow - Payment Rejected', () => {
    it('should NOT create appointment when payment is rejected', async () => {
      const { service } = setup(pendingTables())
      const mp = mockMpPayment('rejected')

      const response = await callWebhook(paymentBody, signedHeaders(PAYMENT_ID))

      expect(response.status).toBe(200)
      // The handler really reached the payment check (not a silent early failure)
      expect(mp.count).toBeGreaterThan(0)
      expect(service.table('appointments').insert).not.toHaveBeenCalled()
    })
  })

  describe('PENDING Flow - Payment in Process', () => {
    it('should NOT create appointment while payment is in process', async () => {
      const { service } = setup(pendingTables())
      const mp = mockMpPayment('in_process')

      const response = await callWebhook(paymentBody, signedHeaders(PAYMENT_ID))

      expect(response.status).toBe(200)
      expect(mp.count).toBeGreaterThan(0)
      expect(service.table('appointments').insert).not.toHaveBeenCalled()
    })
  })

  describe('Webhook Security', () => {
    it('should reject webhook with an invalid signature format', async () => {
      const { service } = setup(pendingTables())
      const response = await callWebhook(paymentBody, {
        'Content-Type': 'application/json',
        'x-signature': 'invalid-signature',
        'x-request-id': 'req-123',
      })

      expect(response.status).toBe(401)
      expect(createServiceClient).not.toHaveBeenCalled()
      expect(service.client.from).not.toHaveBeenCalled()
    })

    it('should reject webhook with a well-formed but wrong signature', async () => {
      const { service } = setup(pendingTables())
      const headers = signedHeaders(PAYMENT_ID)
      headers['x-signature'] = `ts=1234567890,v1=${'0'.repeat(64)}`

      const response = await callWebhook(paymentBody, headers)

      expect(response.status).toBe(401)
      expect(createServiceClient).not.toHaveBeenCalled()
      expect(service.client.from).not.toHaveBeenCalled()
    })

    it('should reject webhook without signature headers', async () => {
      setup(pendingTables())
      const response = await callWebhook(paymentBody, { 'Content-Type': 'application/json' })

      expect(response.status).toBe(401)
      expect(createServiceClient).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing payment ID gracefully', async () => {
      setup(pendingTables())
      const response = await callWebhook({ type: 'payment', data: {} }, signedHeaders(PAYMENT_ID))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.received).toBe(true)
      expect(createServiceClient).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully without creating anything', async () => {
      const tables = pendingTables()
      tables.pending_bookings = { listError: new Error('Database error') }
      const { service } = setup(tables)
      mockMpPayment('approved')

      const response = await callWebhook(paymentBody, signedHeaders(PAYMENT_ID))

      expect(response.status).toBe(200)
      // The failing query was actually hit
      expect(service.table('pending_bookings').select).toHaveBeenCalled()
      expect(service.table('appointments').insert).not.toHaveBeenCalled()
    })
  })
})

describe('Payment Action Tests', () => {
  describe('createPendingBookingPreference', () => {
    it('should validate payment amount server-side', async () => {
      // Test that client-provided amounts are verified against server calculation
    })

    it('should reject amounts outside allowed range', async () => {
      // Test PAYMENT_LIMITS enforcement
    })

    it('should handle missing MP integration gracefully', async () => {
      // Test error when business doesn't have MP connected
    })
  })
})
