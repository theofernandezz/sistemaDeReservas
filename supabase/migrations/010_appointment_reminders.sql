-- Migration: Add reminder tracking fields to appointments
-- Created: 2026-01-23

-- Add reminder tracking fields
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS email_reminder_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_reminder_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent_at timestamptz;

-- Add index for efficient querying of pending reminders
CREATE INDEX IF NOT EXISTS idx_appointments_email_reminder 
ON public.appointments (start_time, email_reminder_sent) 
WHERE email_reminder_sent = false;
