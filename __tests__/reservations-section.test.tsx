import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/actions', () => ({ updateBusinessSettings: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

import { updateBusinessSettings } from '@/app/actions'
import { ReservationsSection } from '@/app/dashboard/settings/sections/reservations-section'

// Inputs in DOM order: minAdvance, maxAdvanceDays, cancellationHours, rescheduleHours.
// The labels are not associated with the inputs (no htmlFor), so role + order is the only accessible handle.
function rescheduleInput(): HTMLInputElement {
  return screen.getAllByRole('spinbutton')[3] as HTMLInputElement
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateBusinessSettings).mockResolvedValue({ success: true, data: {} as never })
})

describe('ReservationsSection - rescheduleHours', () => {
  it('shows an editable "Reprogramación permitida hasta" field with the saved value', () => {
    render(<ReservationsSection reservationSettings={{ cancellationHours: 12, rescheduleHours: 6 }} />)

    expect(screen.getByText('Reprogramación permitida hasta')).toBeInTheDocument()
    expect(rescheduleInput()).toHaveValue(6)
  })

  it('defaults to 24 when never configured', () => {
    render(<ReservationsSection reservationSettings={{}} />)
    expect(rescheduleInput()).toHaveValue(24)
  })

  it('keeps a saved 0 as 0 (not coerced to 24)', () => {
    render(<ReservationsSection reservationSettings={{ rescheduleHours: 0 }} />)
    expect(rescheduleInput()).toHaveValue(0)
  })

  it('persists an edited value, and persists 0 as 0', async () => {
    render(<ReservationsSection reservationSettings={{ cancellationHours: 12, rescheduleHours: 6 }} />)

    fireEvent.change(rescheduleInput(), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => expect(updateBusinessSettings).toHaveBeenCalledTimes(1))
    expect(updateBusinessSettings).toHaveBeenCalledWith(
      expect.objectContaining({ rescheduleHours: 0, cancellationHours: 12 })
    )
  })

  it('persists a positive edited value next to cancellationHours', async () => {
    render(<ReservationsSection reservationSettings={{ cancellationHours: 12, rescheduleHours: 6 }} />)

    fireEvent.change(rescheduleInput(), { target: { value: '48' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() =>
      expect(updateBusinessSettings).toHaveBeenCalledWith(expect.objectContaining({ rescheduleHours: 48 }))
    )
  })
})
