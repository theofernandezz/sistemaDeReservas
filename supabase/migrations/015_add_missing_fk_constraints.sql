-- =============================================
-- Migration 015: Add missing FK constraints
-- Migration 002 used ADD COLUMN IF NOT EXISTS which silently skipped
-- the REFERENCES clause when the columns already existed without FK.
-- PostgREST needs these FKs to resolve resource embedding (joins).
-- =============================================

-- appointments.business_id -> businesses.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_business_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.appointments VALIDATE CONSTRAINT appointments_business_id_fkey;

-- blocked_slots.business_id -> businesses.id (same issue, preventive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blocked_slots_business_id_fkey'
  ) THEN
    ALTER TABLE public.blocked_slots
      ADD CONSTRAINT blocked_slots_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.blocked_slots VALIDATE CONSTRAINT blocked_slots_business_id_fkey;
