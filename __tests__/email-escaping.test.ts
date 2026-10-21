import { describe, it, expect, beforeEach, vi } from 'vitest'

const send = vi.fn().mockResolvedValue({ error: null })
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        single: () =>
          Promise.resolve({
            data: { name: 'Salon', slug: 'salon', email_from: 'a@b.com', email_from_name: 'Salon', admin_notification_email: 'owner@b.com', email_brand_color: '#000' },
            error: null,
          }),
      }
      return q
    },
  }),
}))

import { sendAppointmentCancellationEmails, sendClientConfirmation, sendNewAppointmentNotification } from '@/lib/email'

const XSS = '<script>alert(1)</script>'

function htmlOf(callIndex: number): string {
  return send.mock.calls[callIndex][0].html as string
}

beforeEach(() => {
  send.mockClear()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
})

describe('email HTML escaping and links', () => {
  it('escapes client name and reason in cancellation emails', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: XSS, clientEmail: 'c@x.com', startTime: '2030-01-01T10:00:00Z', reason: XSS,
    })
    for (let i = 0; i < send.mock.calls.length; i++) {
      expect(htmlOf(i)).not.toContain(XSS)
      expect(htmlOf(i)).toContain('&lt;script&gt;')
    }
  })

  it('owner cancellation email warns about payment/deposit', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: null, startTime: '2030-01-01T10:00:00Z',
      reason: 'x', paymentStatus: 'paid', paymentAmount: 5000,
    })
    expect(htmlOf(0)).toContain('manualmente')
    expect(htmlOf(0)).toContain('5000')
  })

  it('owner cancellation email has no payment warning when nothing was paid', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: null, startTime: '2030-01-01T10:00:00Z',
      reason: 'x', paymentStatus: null, paymentAmount: null,
    })
    expect(htmlOf(0)).not.toContain('manualmente')
  })

  it('client confirmation links to /turno/{token}; owner notification links to the dashboard', async () => {
    const data = {
      id: 'apt-1', clientName: XSS, clientPhone: XSS, clientEmail: 'c@x.com', serviceName: 'Corte', servicePrice: 10,
      date: 'lunes', time: '10:00', startDateTime: new Date(), endDateTime: new Date(), manageToken: 'T'.repeat(43),
    }
    await sendClientConfirmation(data, 'b')
    await sendNewAppointmentNotification(data, 'b')

    expect(htmlOf(0)).toContain(`https://app.test/turno/${'T'.repeat(43)}`)
    expect(htmlOf(0)).not.toContain('/cancel/')
    expect(htmlOf(1)).toContain('https://app.test/dashboard')
    expect(htmlOf(1)).not.toContain('/cancel/')
    expect(htmlOf(1)).not.toContain('/turno/')
    expect(htmlOf(0)).not.toContain(XSS)
    expect(htmlOf(1)).not.toContain(XSS)
  })
})
