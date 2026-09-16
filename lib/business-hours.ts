import type { BusinessSettings } from '@/types/database.types'

const AR_TZ = 'America/Argentina/Buenos_Aires'

type DayHours = NonNullable<BusinessSettings['businessHours']>[number]

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export interface OpenStatus {
  isOpen: boolean
  closesAt: string
}

/**
 * Calcula si el negocio está abierto ahora mismo (hora de Argentina),
 * en base a los horarios configurados en settings.businessHours.
 * Devuelve null si el negocio no cargó horarios.
 */
export function getOpenStatus(
  businessHours: BusinessSettings['businessHours'] | undefined,
  now: Date = new Date()
): OpenStatus | null {
  if (!businessHours || businessHours.length === 0) return null

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')

  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dayOfWeek = weekdayMap[weekdayShort]
  const nowMinutes = hour * 60 + minute

  const today: DayHours | undefined = businessHours.find((d) => d.dayOfWeek === dayOfWeek)
  if (!today || !today.isOpen) return { isOpen: false, closesAt: '' }

  const start = toMinutes(today.startTime)
  const end = toMinutes(today.endTime)
  if (nowMinutes < start || nowMinutes >= end) return { isOpen: false, closesAt: '' }

  const inBreak = today.breaks?.some(
    (b) => nowMinutes >= toMinutes(b.start) && nowMinutes < toMinutes(b.end)
  )
  if (inBreak) return { isOpen: false, closesAt: '' }

  return { isOpen: true, closesAt: today.endTime }
}

/**
 * Chequeo liviano por día de semana (sin hora), para marcar "Cerrado"
 * en un selector de fechas sin tener que pedir los slots de cada día.
 * Sin horarios cargados, asume abierto (no bloquea nada).
 */
export function isDayOpen(
  businessHours: BusinessSettings['businessHours'] | undefined,
  dayOfWeek: number
): boolean {
  if (!businessHours || businessHours.length === 0) return true
  const day = businessHours.find((d) => d.dayOfWeek === dayOfWeek)
  return day ? day.isOpen : true
}
