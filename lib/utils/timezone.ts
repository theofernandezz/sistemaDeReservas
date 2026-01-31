/**
 * Timezone utilities for consistent UTC handling
 * 
 * Pattern: Store all dates in UTC in the database (TIMESTAMPTZ)
 * Convert to local time only when displaying to users
 * Use ISO strings for database operations
 */

/**
 * Convert a local Date or date string to UTC ISO string
 * This is used when saving dates to the database
 */
export function toUTC(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided to toUTC')
  }
  return d.toISOString()
}

/**
 * Convert a UTC ISO string from the database to a local Date object
 * This is used when working with dates from the database
 */
export function fromUTC(date: string): Date {
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date string provided to fromUTC')
  }
  return d
}

/**
 * Get the start of a day in UTC for database queries
 * Accepts a date string in YYYY-MM-DD format (assumed to be in local timezone)
 * Returns an ISO string representing the start of that day in UTC
 */
export function startOfDayUTC(dateString: string): string {
  // Parse the date string (YYYY-MM-DD) and treat it as local time
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date at start of day in local timezone, then convert to UTC
  const localStartOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
  
  return localStartOfDay.toISOString()
}

/**
 * Get the end of a day in UTC for database queries
 * Accepts a date string in YYYY-MM-DD format (assumed to be in local timezone)
 * Returns an ISO string representing the end of that day in UTC
 */
export function endOfDayUTC(dateString: string): string {
  // Parse the date string (YYYY-MM-DD) and treat it as local time
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date at end of day in local timezone (23:59:59.999), then convert to UTC
  const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
  
  return localEndOfDay.toISOString()
}

/**
 * Get the day of week from a UTC date string
 * Returns 0 = Sunday, 1 = Monday, etc.
 * This converts UTC to local first to get the correct day
 */
export function getDayOfWeekFromUTC(utcDateString: string): number {
  const localDate = fromUTC(utcDateString)
  return localDate.getDay()
}

/**
 * Create a slot time in UTC for database queries
 * Accepts a date string (YYYY-MM-DD) and time string (HH:mm)
 * Both assumed to be in local timezone
 * Returns an ISO string in UTC
 */
export function createSlotTimeUTC(dateString: string, timeString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const [hours, minutes] = timeString.split(':').map(Number)
  
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
  
  return localDate.toISOString()
}

/**
 * Format a UTC date string for display in local timezone
 * Uses the browser/system's locale settings
 */
export function formatForDisplay(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? fromUTC(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  return d.toLocaleString('es-AR', defaultOptions)
}

/**
 * Format a UTC date string for display as date only
 */
export function formatDateForDisplay(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? fromUTC(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }
  
  return d.toLocaleDateString('es-AR', defaultOptions)
}

/**
 * Format a UTC date string for display as time only
 */
export function formatTimeForDisplay(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? fromUTC(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  return d.toLocaleTimeString('es-AR', defaultOptions)
}

/**
 * Check if a UTC date is in the past (with optional buffer in minutes)
 * Used to determine if a slot is available for booking
 */
export function isPastDate(utcDateString: string, bufferMinutes: number = 0): boolean {
  const date = fromUTC(utcDateString)
  const now = new Date()
  const bufferMs = bufferMinutes * 60 * 1000
  
  return date.getTime() < (now.getTime() + bufferMs)
}

/**
 * Check if two time ranges overlap
 * All dates should be UTC ISO strings from the database
 */
export function doTimeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = fromUTC(start1).getTime()
  const e1 = fromUTC(end1).getTime()
  const s2 = fromUTC(start2).getTime()
  const e2 = fromUTC(end2).getTime()
  
  return s1 < e2 && e1 > s2
}

/**
 * Add minutes to a UTC date string
 * Returns a new UTC ISO string
 */
export function addMinutesToUTC(utcDateString: string, minutes: number): string {
  const date = fromUTC(utcDateString)
  const newDate = new Date(date.getTime() + minutes * 60 * 1000)
  return newDate.toISOString()
}

/**
 * Get current time in UTC ISO string format
 * Use this instead of new Date().toISOString() for consistency
 */
export function nowUTC(): string {
  return new Date().toISOString()
}
