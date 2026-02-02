-- =============================================
-- Migration 013: Add missing columns to pending_bookings
-- Adds client_email and business_id columns that are used by webhook
-- but were missing from the original schema
-- =============================================

-- Add client_email column (used for confirmations)
ALTER TABLE pending_bookings
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Add business_id for proper RLS and multi-tenancy
ALTER TABLE pending_bookings
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Create index for business_id lookups
CREATE INDEX IF NOT EXISTS idx_pending_bookings_business_id
ON pending_bookings(business_id);

-- Create composite index for common query pattern (status + business_id)
CREATE INDEX IF NOT EXISTS idx_pending_bookings_business_status
ON pending_bookings(business_id, status)
WHERE status = 'pending_payment';

-- Backfill business_id from services table for existing records
-- This is safe because service_id has NOT NULL constraint
UPDATE pending_bookings pb
SET business_id = s.business_id
FROM services s
WHERE pb.service_id = s.id
AND pb.business_id IS NULL;

-- Now make business_id NOT NULL (after backfill)
ALTER TABLE pending_bookings
ALTER COLUMN business_id SET NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN pending_bookings.client_email IS 'Client email address for payment confirmations (optional)';
COMMENT ON COLUMN pending_bookings.business_id IS 'Business that owns this pending booking - required for RLS';
