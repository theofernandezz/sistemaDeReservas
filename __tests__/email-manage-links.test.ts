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

import {
  sendAppointmentCancellationEmails,
  sendAppointmentReminder,
  sendAppointmentRescheduleEmails,
  sendManageLinkEmail,
  sendManualTransferPendingEmail,
} from '@/lib/email'

const XSS = '<img src=x onerror=alert(1)>'
const TOKEN = `11111111-1111-4111-8111-111111111111.${'T'.repeat(43)}`
const sentTo = (index: number) => send.mock.calls[index][0].to as string
const htmlOf = (index: number) => send.mock.calls[index][0].html as string

const appointmentData = {
  id: '11111111-1111-4111-8111-111111111111',
  clientName: XSS,
  clientPhone: XSS,
  clientEmail: 'c@x.com',
  serviceName: 'Corte',
  servicePrice: 10,
  date: 'lunes',
  time: '10:00',
  startDateTime: new Date('2030-01-15T13:00:00Z'),
  endDateTime: new Date('2030-01-15T14:00:00Z'),
  manageToken: TOKEN,
}

beforeEach(() => {
  send.mockClear()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
})

describe('client emails link to /turno/{token}', () => {
  it('reminder', async () => {
    await sendAppointmentReminder(appointmentData, 'b')

    expect(htmlOf(0)).toContain(`https://app.test/turno/${TOKEN}`)
    expect(htmlOf(0)).not.toContain('/cancel/')
  })

  it('manual transfer pending', async () => {
    await sendManualTransferPendingEmail(appointmentData, 'b')

    expect(htmlOf(0)).toContain(`https://app.test/turno/${TOKEN}`)
    expect(htmlOf(0)).not.toContain('/cancel/')
  })

  it('reschedule confirmation', async () => {
    await sendAppointmentRescheduleEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: 'c@x.com', oldStartTime: '2030-01-15T13:00:00Z', newStartTime: '2030-01-16T13:00:00Z', manageToken: TOKEN,
    })

    const toClient = send.mock.calls.findIndex((call) => call[0].to === 'c@x.com')
    expect(htmlOf(toClient)).toContain(`https://app.test/turno/${TOKEN}`)
  })

  it('"resend my link" goes only to the registered client_email and carries the given token', async () => {
    const result = await sendManageLinkEmail({
      businessId: 'b', clientName: 'Ana', clientEmail: 'ana@example.com', serviceName: 'Corte', startTime: '2030-01-15T13:00:00Z', manageToken: TOKEN,
    })

    expect(result).toEqual({ success: true })
    expect(send).toHaveBeenCalledTimes(1)
    expect(sentTo(0)).toBe('ana@example.com')
    expect(htmlOf(0)).toContain(`https://app.test/turno/${TOKEN}`)
  })
})

describe('client data is HTML-escaped in every email', () => {
  it('reminder and manual-transfer emails', async () => {
    await sendAppointmentReminder(appointmentData, 'b')
    await sendManualTransferPendingEmail(appointmentData, 'b')

    for (let i = 0; i < send.mock.calls.length; i++) {
      expect(htmlOf(i)).not.toContain(XSS)
      expect(htmlOf(i)).toContain('&lt;img src=x onerror=alert(1)&gt;')
    }
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('reschedule emails (client + owner)', async () => {
    await sendAppointmentRescheduleEmails({
      businessId: 'b', clientName: XSS, clientEmail: 'c@x.com', serviceName: XSS, oldStartTime: '2030-01-15T13:00:00Z', newStartTime: '2030-01-16T13:00:00Z', manageToken: TOKEN,
    })

    expect(send.mock.calls.length).toBeGreaterThan(0)
    for (let i = 0; i < send.mock.calls.length; i++) {
      expect(htmlOf(i)).not.toContain(XSS)
    }
  })

  it('manage-link email', async () => {
    await sendManageLinkEmail({
      businessId: 'b', clientName: XSS, clientEmail: 'ana@example.com', serviceName: XSS, startTime: '2030-01-15T13:00:00Z', manageToken: TOKEN,
    })

    expect(htmlOf(0)).not.toContain(XSS)
    expect(htmlOf(0)).toContain('&lt;img')
  })

  it('cancellation: payment fields and service name are escaped in the owner email', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: null, serviceName: XSS, startTime: '2030-01-15T13:00:00Z', reason: 'x', paymentStatus: XSS, paymentAmount: 10,
    })

    expect(htmlOf(0)).not.toContain(XSS)
  })
})

describe('owner cancellation email', () => {
  it('links neither to the public manage page nor to the legacy /cancel page', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: null, startTime: '2030-01-15T13:00:00Z', reason: 'x', paymentStatus: 'paid', paymentAmount: 5000,
    })

    expect(htmlOf(0)).not.toContain('/turno/')
    expect(htmlOf(0)).not.toContain('/cancel/')
  })

  it('flags a deposit even when only paymentAmount is known (no status)', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: null, startTime: '2030-01-15T13:00:00Z', reason: 'x', paymentStatus: null, paymentAmount: 3000,
    })

    expect(htmlOf(0)).toContain('manualmente')
    expect(htmlOf(0)).toContain('3000')
  })

  it('does not flag a refunded payment', async () => {
    await sendAppointmentCancellationEmails({
      businessId: 'b', clientName: 'Ana', clientEmail: null, startTime: '2030-01-15T13:00:00Z', reason: 'x', paymentStatus: 'refunded', paymentAmount: 3000,
    })

    expect(htmlOf(0)).not.toContain('manualmente')
  })
})
