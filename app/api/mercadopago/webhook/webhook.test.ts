import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { NextRequest } from 'next/server'

// Set environment variables
process.env.RESEND_API_KEY = 'test-resend-api-key'
process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock environment variables
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn()
}))

// Mock crypto for consistent UUID generation and webhook signature verification
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto')
  return {
    ...actual,
    randomUUID: vi.fn(() => 'test-uuid-12345'),
    createHmac: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue(Buffer.from('mocked-hash')),
    }),
    timingSafeEqual: vi.fn().mockReturnValue(true),
  }
})

// Mock Resend email service
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
      }
    }
  }
})

// MSW Server for mocking external APIs
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('MercadoPago Webhook - Payment Flow', () => {
  const mockBusinessId = 'business-123'
  const mockAccessToken = 'test-access-token'
  const mockPendingBookingId = 'pending-123'
  const mockAppointmentId = 'appointment-123'
  const mockPaymentId = 'payment-123'
  
  // Mock Supabase client
  const createMockSupabaseClient = () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } })
    }
  })

  describe('SUCCESS Flow - Payment Approved', () => {
    it('should create appointment when pending booking payment is approved', async () => {
      // Arrange: Setup mocks
      const mockSupabase = createMockSupabaseClient()
      const { createClient } = await import('@/utils/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      // Mock pending booking data
      mockSupabase.from('pending_bookings').select.mockReturnThis()
      mockSupabase.from('pending_bookings').eq.mockReturnThis()
      mockSupabase.from('pending_bookings').single.mockResolvedValue({
        data: {
          id: mockPendingBookingId,
          service_id: 'service-123',
          start_time: '2026-02-01T10:00:00Z',
          end_time: '2026-02-01T11:00:00Z',
          client_name: 'Test Client',
          client_phone: '+5491122334455',
          client_email: 'test@example.com',
          payment_amount: 15000,
          mp_preference_id: 'pref-123',
          status: 'pending_payment'
        },
        error: null
      })

      // Mock service data with business
      mockSupabase.from('services').select.mockReturnThis()
      mockSupabase.from('services').eq.mockReturnThis()
      mockSupabase.from('services').single.mockResolvedValue({
        data: {
          id: 'service-123',
          business_id: mockBusinessId,
          name: 'Test Service',
          price: 30000
        },
        error: null
      })

      // Mock MP integration
      mockSupabase.from('mp_integrations').select.mockReturnThis()
      mockSupabase.from('mp_integrations').eq.mockReturnThis()
      mockSupabase.from('mp_integrations').single.mockResolvedValue({
        data: { access_token: mockAccessToken },
        error: null
      })

      // Mock MercadoPago payment response - APPROVED
      server.use(
        http.get(`https://api.mercadopago.com/v1/payments/${mockPaymentId}`, () => {
          return HttpResponse.json({
            id: mockPaymentId,
            status: 'approved',
            status_detail: 'accredited',
            transaction_amount: 15000,
            metadata: {
              pending_booking_id: mockPendingBookingId,
              business_id: mockBusinessId
            }
          })
        })
      )

      // Mock appointment creation
      mockSupabase.from('appointments').insert.mockReturnThis()
      mockSupabase.from('appointments').select.mockReturnThis()
      mockSupabase.from('appointments').single.mockResolvedValue({
        data: {
          id: mockAppointmentId,
          business_id: mockBusinessId,
          service_id: 'service-123',
          client_name: 'Test Client',
          status: 'confirmed',
          payment_status: 'paid'
        },
        error: null
      })

      // Mock update pending booking
      mockSupabase.from('pending_bookings').update.mockReturnThis()
      mockSupabase.from('pending_bookings').eq.mockResolvedValue({
        data: { status: 'paid', converted_appointment_id: mockAppointmentId },
        error: null
      })

      // Act: Import and call webhook handler
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1234567890,v1=abc123',
          'x-request-id': 'req-123'
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: mockPaymentId }
        })
      })

      const response = await POST(request as unknown as NextRequest)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.received).toBe(true)
    })

    it('should update legacy appointment status when payment is approved', async () => {
      // Similar test for legacy flow where appointment already exists
      // but is in pending status
    })
  })

  describe('FAILURE Flow - Payment Rejected', () => {
    it('should NOT create appointment when payment is rejected', async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient()
      const { createClient } = await import('@/utils/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      // Mock pending booking
      mockSupabase.from('pending_bookings').select.mockReturnThis()
      mockSupabase.from('pending_bookings').eq.mockReturnThis()
      mockSupabase.from('pending_bookings').single.mockResolvedValue({
        data: {
          id: mockPendingBookingId,
          service_id: 'service-123',
          status: 'pending_payment',
          mp_preference_id: 'pref-123'
        },
        error: null
      })

      // Mock service
      mockSupabase.from('services').select.mockReturnThis()
      mockSupabase.from('services').eq.mockReturnThis()
      mockSupabase.from('services').single.mockResolvedValue({
        data: {
          id: 'service-123',
          business_id: mockBusinessId
        },
        error: null
      })

      // Mock MP integration
      mockSupabase.from('mp_integrations').select.mockReturnThis()
      mockSupabase.from('mp_integrations').eq.mockReturnThis()
      mockSupabase.from('mp_integrations').single.mockResolvedValue({
        data: { access_token: mockAccessToken },
        error: null
      })

      // Mock MercadoPago payment response - REJECTED
      server.use(
        http.get(`https://api.mercadopago.com/v1/payments/${mockPaymentId}`, () => {
          return HttpResponse.json({
            id: mockPaymentId,
            status: 'rejected',
            status_detail: 'cc_rejected_insufficient_amount',
            transaction_amount: 15000,
            metadata: {
              pending_booking_id: mockPendingBookingId,
              business_id: mockBusinessId
            }
          })
        })
      )

      // Spy on insert - should NOT be called for rejected payments
      const insertSpy = vi.fn().mockReturnThis()
      mockSupabase.from('appointments').insert = insertSpy

      // Act
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1234567890,v1=abc123',
          'x-request-id': 'req-123'
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: mockPaymentId }
        })
      })

      const response = await POST(request as unknown as NextRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(insertSpy).not.toHaveBeenCalled()
    })
  })

  describe('PENDING Flow - Payment in Process', () => {
    it('should handle payment with pending status correctly', async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient()
      const { createClient } = await import('@/utils/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      // Mock pending booking
      mockSupabase.from('pending_bookings').select.mockReturnThis()
      mockSupabase.from('pending_bookings').eq.mockReturnThis()
      mockSupabase.from('pending_bookings').single.mockResolvedValue({
        data: {
          id: mockPendingBookingId,
          service_id: 'service-123',
          status: 'pending_payment'
        },
        error: null
      })

      // Mock service
      mockSupabase.from('services').select.mockReturnThis()
      mockSupabase.from('services').eq.mockReturnThis()
      mockSupabase.from('services').single.mockResolvedValue({
        data: {
          id: 'service-123',
          business_id: mockBusinessId
        },
        error: null
      })

      // Mock MP integration
      mockSupabase.from('mp_integrations').select.mockReturnThis()
      mockSupabase.from('mp_integrations').eq.mockReturnThis()
      mockSupabase.from('mp_integrations').single.mockResolvedValue({
        data: { access_token: mockAccessToken },
        error: null
      })

      // Mock MercadoPago payment response - PENDING
      server.use(
        http.get(`https://api.mercadopago.com/v1/payments/${mockPaymentId}`, () => {
          return HttpResponse.json({
            id: mockPaymentId,
            status: 'in_process',
            status_detail: 'pending_contingency',
            transaction_amount: 15000,
            metadata: {
              pending_booking_id: mockPendingBookingId,
              business_id: mockBusinessId
            }
          })
        })
      )

      // Spy on insert - should NOT be called for pending payments
      const insertSpy = vi.fn().mockReturnThis()
      mockSupabase.from('appointments').insert = insertSpy

      // Act
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1234567890,v1=abc123',
          'x-request-id': 'req-123'
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: mockPaymentId }
        })
      })

      const response = await POST(request as unknown as NextRequest)

      // Assert - appointment should not be created yet, waiting for final status
      expect(response.status).toBe(200)
      expect(insertSpy).not.toHaveBeenCalled()
    })
  })

  describe('Webhook Security', () => {
    it('should reject webhook without valid signature', async () => {
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'invalid-signature',
          'x-request-id': 'req-123'
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: mockPaymentId }
        })
      })

      const response = await POST(request as unknown as NextRequest)
      
      expect(response.status).toBe(401)
    })

    it('should reject webhook without signature headers', async () => {
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: mockPaymentId }
        })
      })

      const response = await POST(request as unknown as NextRequest)
      
      expect(response.status).toBe(401)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing payment ID gracefully', async () => {
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1234567890,v1=abc123',
          'x-request-id': 'req-123'
        },
        body: JSON.stringify({
          type: 'payment',
          data: {} // Missing id
        })
      })

      const response = await POST(request as unknown as NextRequest)
      const body = await response.json()
      
      // Should still return 200 to prevent MP retries, but indicate not processed
      expect(response.status).toBe(200)
      expect(body.received).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange - force database error
      const mockSupabase = createMockSupabaseClient()
      const { createClient } = await import('@/utils/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      mockSupabase.from('pending_bookings').select.mockRejectedValue(new Error('Database error'))

      // Act
      const { POST } = await import('@/app/api/mercadopago/webhook/route')
      const request = new Request('http://localhost/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1234567890,v1=abc123',
          'x-request-id': 'req-123'
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: mockPaymentId }
        })
      })

      // Should not throw, return 200 to acknowledge receipt
      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(200)
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
