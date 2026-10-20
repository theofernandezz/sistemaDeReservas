-- =============================================
-- Migration 024: Client manage-link support for appointments
-- Spec: specs/client-manage-appointment.md (PR A)
--
-- The client manages (view / cancel / reschedule) an appointment through a
-- stateless HMAC token:
--   token = f(MANAGE_LINK_SECRET, appointment_id, manage_token_version)
-- Nothing token-related is stored except the integer version. Incrementing
-- manage_token_version invalidates the previous link of that appointment.
-- Existing appointments get version 1, so their links are valid immediately.
--
-- Adds:
--   manage_token_version integer NOT NULL DEFAULT 1
--   cancelled_at         timestamptz
--   cancelled_by         text  ('client' | 'owner')
--   manage_link_sent_at  timestamptz  - last "resend my link" (basic rate limit)
--
-- IMPORTANT:
--   * Applied by hand (SQL Editor or supabase db query --linked -f <file>).
--   * Apply BEFORE deploying the code, and set MANAGE_LINK_SECRET (>= 32 chars) in the app env.
--   * Single transaction. No policy changes (PR B closes public reads).
-- =============================================

BEGIN;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS manage_token_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS manage_link_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_cancelled_by_check'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_cancelled_by_check
      CHECK (cancelled_by IS NULL OR cancelled_by IN ('client', 'owner'));
  END IF;
END $$;

-- Global resend log: one row per resend email actually queued. Used for the hourly cap
-- (counts emails sent, not appointments). RLS enabled with NO policies: service role only.
CREATE TABLE IF NOT EXISTS public.manage_link_resends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manage_link_resends_sent_at ON public.manage_link_resends (sent_at);
CREATE INDEX IF NOT EXISTS idx_manage_link_resends_appointment_id ON public.manage_link_resends (appointment_id);
ALTER TABLE public.manage_link_resends ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.appointments.manage_token_version IS 'Part of the HMAC client manage token; increment to invalidate the current link.';
COMMENT ON COLUMN public.appointments.cancelled_at IS 'When the appointment was cancelled';
COMMENT ON COLUMN public.appointments.cancelled_by IS 'Who cancelled: client | owner';
COMMENT ON COLUMN public.appointments.manage_link_sent_at IS 'Last time the manage link was re-sent by email (rate limit)';

COMMIT;
