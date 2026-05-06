-- Migration 019: Payment proof fields on appointments
-- Adds columns to support manual transfer proof-of-payment upload flow.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_auto_approve_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_rejection_reason text;

-- proof_expires_at:     deadline for the client to upload a proof (set at booking creation)
-- proof_auto_approve_at: when the business hasn't acted, the proof is auto-approved
-- payment_status already has 'pending'|'paid'|'refunded'; extend with new values:
--   'pending_confirmation' → proof uploaded, waiting for business review
--   'rejected'             → business rejected the proof

-- payment_amount and payment_status should already exist from earlier migrations.
-- Add them only if they're missing so this migration is safe to re-run.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(12, 2);

-- Index to efficiently find appointments that need auto-approval
CREATE INDEX IF NOT EXISTS idx_appointments_proof_auto_approve
  ON appointments (proof_auto_approve_at)
  WHERE payment_status = 'pending_confirmation';

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_appointments_proof_expires
  ON appointments (proof_expires_at)
  WHERE payment_status = 'pending' AND proof_url IS NULL;
