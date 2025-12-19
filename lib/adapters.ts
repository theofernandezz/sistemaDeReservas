import { Service } from '@/types/database.types'
import { FrontendService } from '@/types/frontend.types'

/**
 * Convert database Service to frontend format
 */
export function dbServiceToFrontend(service: Service): FrontendService {
  return {
    id: service.id,
    title: service.name,
    durationMin: service.duration_minutes,
    price: Number(service.price),
    description: service.description || '',
    image: service.image || undefined,
    active: service.is_active
  }
}

/**
 * Convert frontend Service to database create format
 */
export function frontendServiceToDB(service: Partial<FrontendService>) {
  return {
    name: service.title || '',
    duration_minutes: service.durationMin || 60,
    price: service.price || 0,
    description: service.description || '',
    image: service.image || null,
    is_active: service.active !== false
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(0)}`
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

/**
 * Format date for display (ejemplo: "20 Dec, 2024")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Format time for display (ejemplo: "14:30")
 */
export function formatTime(time: string): string {
  return time
}
