-- =============================================
-- Migration 016: Add missing FK constraints for services and service_addons
-- Same issue as 015 — migration 002 used ADD COLUMN IF NOT EXISTS which
-- silently skipped the REFERENCES clause when columns already existed.
-- =============================================

-- services.business_id -> businesses.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_business_id_fkey'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Clean up orphaned services before validating
DELETE FROM public.services
WHERE business_id IS NOT NULL
  AND business_id NOT IN (SELECT id FROM public.businesses);

ALTER TABLE public.services VALIDATE CONSTRAINT services_business_id_fkey;

-- service_addons.business_id -> businesses.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_addons_business_id_fkey'
  ) THEN
    ALTER TABLE public.service_addons
      ADD CONSTRAINT service_addons_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Clean up orphaned addons before validating
DELETE FROM public.service_addons
WHERE business_id IS NOT NULL
  AND business_id NOT IN (SELECT id FROM public.businesses);

ALTER TABLE public.service_addons VALIDATE CONSTRAINT service_addons_business_id_fkey;
