/**
 * Cached versions of server-side data fetchers.
 * React.cache() deduplicates calls within a single render pass,
 * so layout + page calling the same function only hits the DB once.
 */
import { cache } from 'react'
import { getCurrentBusiness, isSuperAdmin, getAllBusinesses } from './auth'

export const getCachedCurrentBusiness = cache(getCurrentBusiness)
export const getCachedIsSuperAdmin = cache(isSuperAdmin)
export const getCachedAllBusinesses = cache(getAllBusinesses)
