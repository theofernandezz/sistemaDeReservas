/**
 * Centralized configuration utilities
 */

/**
 * Get the application URL for the current environment
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (explicitly set in .env)
 * 2. VERCEL_URL (automatically set by Vercel)
 * 3. Fallback to buki.devora.lat
 *
 * @returns Full application URL with protocol (https in production)
 */
export function getAppUrl(): string {
  // 1. Check for explicitly set app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // 2. Check for Vercel URL (automatically set in Vercel deployments)
  if (process.env.VERCEL_URL) {
    // VERCEL_URL doesn't include protocol
    // Always use https in production (Vercel provides SSL)
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. Fallback to production domain
  return 'https://buki.devora.lat'
}

/**
 * Get the base URL for API calls (same as app URL)
 */
export function getApiUrl(): string {
  return getAppUrl()
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Get environment name
 */
export function getEnvironment(): 'production' | 'development' | 'test' {
  return (process.env.NODE_ENV as 'production' | 'development' | 'test') || 'development'
}
