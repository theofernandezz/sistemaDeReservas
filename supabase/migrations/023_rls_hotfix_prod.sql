-- =============================================
-- Migration 023: RLS hotfix for prod
-- Spec: specs/rls-hotfix-prod.md
--
-- Prod's pg_policies differs from what migrations 001-022 would produce
-- (policies were added by hand). This migration removes the permissive
-- ones that give cross-tenant access or expose secrets, adds the owner
-- policy that service_addons is missing, and aborts if any other
-- permissive policy is left on the affected tables.
--
-- IMPORTANT:
--   * Deploy the MercadoPago webhook change (service client) BEFORE
--     applying this: it relied on "Anyone can check if business has MP
--     connected" to read mp_integrations.access_token as anon.
--   * Applied by hand (supabase db query --linked -f <file> or SQL Editor).
--   * Single transaction: if the final guard raises, nothing is applied.
--   * Only DROP POLICY / CREATE POLICY / ENABLE RLS. No data is touched.
-- =============================================

BEGIN;

-- =============================================================================
-- PART 1: app_settings (holds google_calendar_refresh_token, admin email)
-- With RLS on and no policies, only the service role can access it.
-- =============================================================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.app_settings;

-- =============================================================================
-- PART 2: mp_integrations (access_token exposed to anon)
-- Remaining: owner SELECT + owner DELETE. Writes go through the service client.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can check if business has MP connected" ON public.mp_integrations;
DROP POLICY IF EXISTS "Service role can insert MP integration" ON public.mp_integrations;
DROP POLICY IF EXISTS "Service role can update MP integration" ON public.mp_integrations;

-- =============================================================================
-- PART 3: appointments / services / blocked_slots (any authenticated = full access)
-- Owner-scoped "Business owners can manage own ..." policies remain.
-- =============================================================================

DROP POLICY IF EXISTS admin_full_appointments ON public.appointments;
DROP POLICY IF EXISTS admin_full_services ON public.services;
DROP POLICY IF EXISTS admin_full_blocked_slots ON public.blocked_slots;

-- =============================================================================
-- PART 4: service_addons
-- Drop the open write policies and the read-all policy (exposes inactive addons),
-- then give owners scoped write access. "Public can view active addons"
-- (SELECT public, is_active = true) stays for anon.
-- =============================================================================

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.service_addons;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.service_addons;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.service_addons;
DROP POLICY IF EXISTS "Allow public read" ON public.service_addons;

DROP POLICY IF EXISTS "Business owners can manage own addons" ON public.service_addons;
CREATE POLICY "Business owners can manage own addons" ON public.service_addons
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- PART 5: Make sure RLS is enabled (no-op if already on)
-- =============================================================================

ALTER TABLE public.app_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_integrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons   ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 6: Guard - abort (rolling back everything above) if any policy on these
-- tables still has USING/WITH CHECK = true and is not in the reviewed allowlist.
-- An unlisted permissive policy means prod drifted from the spec: review it
-- by hand, then either drop it here or add it to the allowlist.
-- =============================================================================

DO $$
DECLARE
  offenders TEXT;
BEGIN
  SELECT string_agg(format('%s.%s (%s)', p.tablename, p.policyname, p.cmd), ', ' ORDER BY p.tablename, p.policyname)
  INTO offenders
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename IN ('app_settings', 'mp_integrations', 'appointments', 'services', 'blocked_slots', 'service_addons')
    AND (
      lower(btrim(coalesce(p.qual, ''), '() ')) = 'true'
      OR lower(btrim(coalesce(p.with_check, ''), '() ')) = 'true'
    )
    AND (p.tablename, p.policyname) NOT IN (
      -- appointments (public booking flow; P1 follow-up, see spec "Out of scope")
      ('appointments', 'Business owners can manage own appointments'),
      ('appointments', 'Public can create appointments'),
      ('appointments', 'Public can view appointments by ID'),
      ('appointments', 'anon_insert_appointments'),
      ('appointments', 'anon_select_appointments'),
      -- services
      ('services', 'Business owners can manage own services'),
      ('services', 'Public can view active services'),
      ('services', 'anon_select_services'),
      -- blocked_slots
      ('blocked_slots', 'Business owners can manage own blocked slots'),
      ('blocked_slots', 'Public can view blocked slots'),
      ('blocked_slots', 'anon_select_blocked_slots'),
      -- mp_integrations
      ('mp_integrations', 'Business owners select own MP integration'),
      ('mp_integrations', 'Business owners delete own MP integration'),
      -- service_addons
      ('service_addons', 'Public can view active addons'),
      ('service_addons', 'Business owners can manage own addons')
    );

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 023 aborted: unlisted permissive RLS policies remain: %', offenders;
  END IF;
END
$$;

COMMIT;
