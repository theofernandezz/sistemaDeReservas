import type { SupabaseClient } from '@supabase/supabase-js'
import { computeAvailableSlots } from '@/lib/availability'

/** Expected, user-readable failure: the message is safe to show to the client. */
export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookingValidationError'
  }
}

export interface ResolvedAddon {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export type BookingPaymentMode = 'manual_transfer' | 'mercadopago' | 'none'
export type PaymentOption = 'deposit' | 'full'

export interface ServerBookingState {
  status: 'pending' | 'confirmed'
  payment_status: 'pending' | null
}

// Argentina is UTC-3 with no DST (same assumption as lib/utils/timezone.ts)
const ART_OFFSET_MS = 3 * 60 * 60 * 1000

/**
 * Add-ons come from the DB by id: they must exist, be active and belong to the service's business.
 * Name/price/duration sent by the client are never read.
 */
export async function resolveAddons(
  db: SupabaseClient,
  businessId: string,
  addonIds: string[] | undefined
): Promise<ResolvedAddon[]> {
  const ids = [...new Set(addonIds ?? [])]
  if (ids.length === 0) return []

  const { data, error } = await db
    .from('service_addons')
    .select('id, name, price, duration_minutes')
    .in('id', ids)
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (error) throw error
  const rows = (data ?? []) as ResolvedAddon[]
  if (rows.length !== ids.length) {
    throw new BookingValidationError('Alguno de los extras seleccionados no está disponible')
  }
  return rows
}

export function totalDurationMinutes(serviceMinutes: number, addons: ResolvedAddon[]): number {
  return serviceMinutes + addons.reduce((sum, addon) => sum + addon.duration_minutes, 0)
}

export function totalPrice(servicePrice: number, addons: ResolvedAddon[]): number {
  return servicePrice + addons.reduce((sum, addon) => sum + addon.price, 0)
}

/** Server-computed end: start + service duration + add-on durations. */
export function computeEndTime(startISO: string, durationMinutes: number): string {
  return new Date(new Date(startISO).getTime() + durationMinutes * 60_000).toISOString()
}

/**
 * Business hours, breaks, blocked slots, overlap, minAdvanceHours, maxAdvanceDays and
 * "ends after closing" all live in computeAvailableSlots: we only ask whether the slot is open.
 */
export async function assertSlotAvailable(
  db: SupabaseClient,
  params: { serviceId: string; businessId: string; startISO: string; durationMinutes: number; teamMemberId?: string | null }
): Promise<string | null> {
  const local = new Date(new Date(params.startISO).getTime() - ART_OFFSET_MS).toISOString()
  const date = local.slice(0, 10)
  const time = local.slice(11, 16)

  const isOpen = async (teamMemberId: string): Promise<boolean> => {
    const slots = await computeAvailableSlots(db, params.serviceId, date, {
      teamMemberId,
      durationMinutes: params.durationMinutes,
    })
    return slots.some((slot) => slot.time === time && slot.available)
  }

  if (params.teamMemberId) {
    if (await isOpen(params.teamMemberId)) return params.teamMemberId
    throw new BookingValidationError('Este horario no está disponible. Por favor seleccioná otro.')
  }

  // "Any professional": the slots shown are the union of all active members, so accept the slot if
  // any of them is free for the whole duration. Deterministic pick: lowest member id.
  const { data: members, error } = await db
    .from('team_members')
    .select('id')
    .eq('business_id', params.businessId)
    .eq('is_active', true)
    .order('id', { ascending: true })
  if (error) throw error

  const sorted = [...((members ?? []) as { id: string }[])].sort((a, b) => a.id.localeCompare(b.id))
  for (const member of sorted) {
    if (await isOpen(member.id)) return member.id
  }
  throw new BookingValidationError('Este horario no está disponible. Por favor seleccioná otro.')
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Same rule the public confirm form uses to pick the flow, decided from DB settings. */
export async function resolvePaymentMode(
  db: SupabaseClient,
  businessId: string,
  totalToCharge: number
): Promise<BookingPaymentMode> {
  const [{ data: business, error: bizError }, { data: mpIntegration }] = await Promise.all([
    db.from('businesses').select('settings').eq('id', businessId).single(),
    db.from('mp_integrations').select('id').eq('business_id', businessId).single(),
  ])
  if (bizError) throw bizError

  const settings = (business?.settings && typeof business.settings === 'object'
    ? business.settings
    : {}) as Record<string, unknown>
  const manual = (settings.manualTransfer && typeof settings.manualTransfer === 'object'
    ? settings.manualTransfer
    : {}) as Record<string, unknown>

  const manualReady =
    manual.enabled === true &&
    nonEmptyString(manual.alias) &&
    nonEmptyString(manual.cvu) &&
    nonEmptyString(manual.accountHolder)

  if (settings.paymentFlowMode === 'manual_transfer' && manualReady) return 'manual_transfer'
  if (mpIntegration && totalToCharge > 0) return 'mercadopago'
  return 'none'
}

export function stateForPaymentMode(mode: BookingPaymentMode): ServerBookingState {
  switch (mode) {
    case 'manual_transfer':
      // confirmed: reminders filter on it and approving the proof never confirms
      return { status: 'confirmed', payment_status: 'pending' }
    case 'mercadopago':
      // Confirmed by the MP webhook once the payment is approved
      return { status: 'pending', payment_status: null }
    case 'none':
      return { status: 'confirmed', payment_status: null }
  }
}

/** Deposit (business deposit_percentage) or full total, always computed here. */
export function computePaymentAmount(total: number, option: PaymentOption, depositPercentage: number | null): number {
  if (option === 'full') return total
  const percentage = depositPercentage || 100
  if (percentage < 0 || percentage > 100) {
    throw new BookingValidationError('Configuración de depósito inválida')
  }
  return Math.round((total * percentage) / 100)
}
