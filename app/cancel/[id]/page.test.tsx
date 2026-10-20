import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/app/actions/manage-appointment', () => ({
  getAppointmentByToken: vi.fn(),
  resendManageLink: vi.fn(),
}))

import { createClient, createServiceClient } from '@/utils/supabase/server'
import { getAppointmentByToken } from '@/app/actions/manage-appointment'
import CancelPage from './page'
import ResendLinkButton from './resend-link-button'

const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'

function findAll(node: ReactNode, predicate: (element: ReactElement<{ children?: ReactNode }>) => boolean): ReactElement<{ children?: ReactNode; appointmentId?: string }>[] {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate))
  const element = node as ReactElement<{ children?: ReactNode }>
  return [...(predicate(element) ? [element] : []), ...findAll(element.props?.children, predicate)]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('/cancel/[id] (legacy link)', () => {
  it('loads no appointment data with the bare id and only offers to resend the link', async () => {
    const tree = await CancelPage({ params: Promise.resolve({ id: APPOINTMENT_ID }) })

    expect(createClient).not.toHaveBeenCalled()
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(getAppointmentByToken).not.toHaveBeenCalled()
    const resend = findAll(tree, (element) => element.type === ResendLinkButton)
    expect(resend).toHaveLength(1)
    expect(resend[0].props.appointmentId).toBe(APPOINTMENT_ID)
  })
})
