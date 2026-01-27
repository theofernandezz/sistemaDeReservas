-- Migration: Add reschedule tracking fields to appointments
-- Created: 2026-01-26

-- Add reschedule tracking fields
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS rescheduled_from timestamptz,
ADD COLUMN IF NOT EXISTS reschedule_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_rescheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS google_event_id text;

-- Add index for efficient querying of rescheduled appointments
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_count
ON public.appointments (reschedule_count)
WHERE reschedule_count > 0;

-- Add comment for documentation
COMMENT ON COLUMN public.appointments.rescheduled_from IS 'Original start_time before first reschedule';
COMMENT ON COLUMN public.appointments.reschedule_count IS 'Number of times this appointment has been rescheduled';
COMMENT ON COLUMN public.appointments.last_rescheduled_at IS 'Timestamp of last reschedule operation';
COMMENT ON COLUMN public.appointments.google_event_id IS 'Google Calendar event ID for sync';
