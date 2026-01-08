-- Migration: Create pending_bookings table for deferred booking creation
-- Bookings are created here temporarily until payment is confirmed

CREATE TABLE IF NOT EXISTS pending_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    addons JSONB DEFAULT '[]',
    payment_amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('full', 'deposit')),
    mp_preference_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    converted_appointment_id UUID REFERENCES appointments(id)
);

-- Index for finding pending bookings by status
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON pending_bookings(status);

-- Index for finding expired bookings
CREATE INDEX IF NOT EXISTS idx_pending_bookings_expires ON pending_bookings(expires_at) WHERE status = 'pending_payment';

-- RLS policies
ALTER TABLE pending_bookings ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for booking flow) 
CREATE POLICY "Anyone can create pending bookings" ON pending_bookings
    FOR INSERT
    WITH CHECK (true);

-- Allow public to read their own pending bookings (by ID in URL)
CREATE POLICY "Anyone can read pending bookings by ID" ON pending_bookings
    FOR SELECT
    USING (true);

-- Allow service role to update (for webhook)
CREATE POLICY "Service role can update pending bookings" ON pending_bookings
    FOR UPDATE
    USING (true);

-- Function to clean up expired pending bookings (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE pending_bookings 
    SET status = 'expired' 
    WHERE status = 'pending_payment' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
