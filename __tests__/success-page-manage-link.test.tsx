import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/app/actions/manage-appointment', () => ({ getAppointmentByToken: vi.fn() }))

import { createClient } from '@/utils/supabase/server'
import { getAppointmentByToken } from '@/app/actions/manage-appointment'
import { ProofUploadCard } from '@/components/booking/proof-upload-card'
import type { ManagedAppointmentView } from '@/lib/manage-appointment-types'
import SuccessPage from '@/app/[slug]/booking/success/page'
import CopyLinkButton from '@/app/[slug]/booking/success/copy-link-button'

const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'
const PENDING_ID = '77777777-7777-4777-8777-777777777777'
const TOKEN = `${APPOINTMENT_ID}.${'a'.repeat(43)}`

function view(overrides: Partial<ManagedAppointmentView> = {}): ManagedAppointmentView {
  return {
    id: APPOINTMENT_ID,
    status: 'confirmed',
    startTime: '2030-01-15T13:00:00.000Z',
    endTime: '2030-01-15T14:00:00.000Z',
    clientName: 'Ana',
    serviceName: 'Corte',
    servicePrice: 100,
    businessName: 'Salon',
    businessSlug: 'salon',
    paymentStatus: 'paid',
    proofUrl: null,
    rescheduleCount: 0,
    cancellationHours: 24,
    rescheduleHours: 24,
    canCancel: true,
    cancelBlockedReason: null,
    canReschedule: true,
    rescheduleBlockedReason: null,
    ...overrides,
  }
}

function fakeSessionClient(pending: unknown, settings: unknown = {}) {
  const make = (table: string) => {
    const q = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      single: vi.fn(() =>
        Promise.resolve({
          data: table === 'businesses' ? { name: 'Salon', phone: null, settings, deposit_percentage: 30 } : pending,
          error: null,
        })
      ),
    }
    return q
  }
  vi.mocked(createClient).mockResolvedValue({ from: (table: string) => make(table) } as never)
}

/** Collect the `link` prop of every CopyLinkButton in the (unrendered) element tree. */
function copyLinks(node: ReactNode): string[] {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(copyLinks)
  const element = node as ReactElement<{ children?: ReactNode; link?: string }>
  const own = element.type === CopyLinkButton && element.props.link ? [element.props.link] : []
  return [...own, ...copyLinks(element.props?.children)]
}

/** Every string found in props/children of the (unrendered) element tree: text, hrefs, links. */
function allStrings(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(allStrings)
  const props = (node as ReactElement<Record<string, unknown>>).props ?? {}
  return Object.values(props).flatMap((value) => allStrings(value as ReactNode))
}

/** Props of every ProofUploadCard in the tree. */
function proofCards(node: ReactNode): Record<string, unknown>[] {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(proofCards)
  const element = node as ReactElement<Record<string, unknown>>
  const own = element.type === ProofUploadCard ? [element.props] : []
  return [...own, ...proofCards(element.props?.children as ReactNode)]
}

async function renderTree(search: { token?: string; pending?: string; status?: string }) {
  return SuccessPage({ searchParams: Promise.resolve(search), params: Promise.resolve({ slug: 'salon' }) })
}

async function renderPage(search: { token?: string; pending?: string; status?: string }) {
  return copyLinks(await renderTree(search))
}

const MAIL_NOTICE = 'Te mandamos el link para gestionar tu turno por mail.'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
  fakeSessionClient(null)
})

describe('booking success page - /turno/{token} link', () => {
  it('direct / MP-with-existing-appointment flow: ?token= valid -> link to /turno/{token}', async () => {
    vi.mocked(getAppointmentByToken).mockResolvedValue({ success: true, data: view() })

    const links = await renderPage({ token: TOKEN })

    expect(getAppointmentByToken).toHaveBeenCalledWith(TOKEN)
    expect(links).toEqual([`https://app.test/turno/${TOKEN}`])
  })

  it.each([
    ['converted by the webhook', 'paid', undefined],
    ['not converted yet', 'pending_payment', 'pending'],
  ])('pending_bookings flow (%s): mail notice, no token and no /turno/ anywhere', async (_label, pendingStatus, urlStatus) => {
    fakeSessionClient({
      id: PENDING_ID,
      status: pendingStatus,
      start_time: '2030-01-15T13:00:00.000Z',
      end_time: '2030-01-15T14:00:00.000Z',
      client_name: 'Ana',
      service: { name: 'Corte', price: 100 },
    })

    const tree = await renderTree({ pending: PENDING_ID, status: urlStatus })
    const strings = allStrings(tree)

    expect(copyLinks(tree)).toEqual([])
    expect(strings.some((s) => s.includes('/turno/'))).toBe(false)
    expect(getAppointmentByToken).not.toHaveBeenCalled()
    if (pendingStatus === 'paid') {
      expect(strings.some((s) => s.includes(MAIL_NOTICE))).toBe(true)
    }
  })

  it('manual transfer: proofUrl from the appointment view is passed to ProofUploadCard', async () => {
    fakeSessionClient(null, {
      paymentFlowMode: 'manual_transfer',
      manualTransfer: { enabled: true, alias: 'a.b', cvu: '', accountHolder: 'X' },
    })
    vi.mocked(getAppointmentByToken).mockResolvedValue({
      success: true,
      data: view({ status: 'pending', paymentStatus: 'pending', proofUrl: 'https://files.test/proof.png' }),
    })

    const cards = proofCards(await renderTree({ token: TOKEN, status: 'pending' }))

    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ token: TOKEN, currentProofUrl: 'https://files.test/proof.png' })
  })

  it('an invalid token shows no link and loads no appointment data', async () => {
    vi.mocked(getAppointmentByToken).mockResolvedValue({ success: false, code: 'INVALID_TOKEN', error: 'inválido' })

    const links = await renderPage({ token: 'garbage' })

    expect(links).toEqual([])
  })
})
