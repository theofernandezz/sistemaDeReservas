-- =============================================================================
-- 025 - Close public READ access to public.appointments (PR B)
--
-- Applied MANUALLY, AFTER the matching code deploy. The deployed code works both
-- before and after this migration:
--   - availability reads go through get_busy_slots() (falls back to a direct query
--     only while the function does not exist yet)
--   - createAppointment, /reserva/[token], /api/upload/proof and the manage-token
--     actions use the service client (bypasses RLS)
--
-- Prod RLS differs from the repo migrations, so policies are dropped by exact
-- prod name with IF EXISTS. INSERT policies are intentionally left alone
-- ("Public can create appointments", anon_insert_appointments).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Availability RPC: only start/end/member of non-cancelled appointments.
--    SECURITY DEFINER bypasses RLS; no personal data is returned.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_busy_slots(
  p_business_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_team_member_id UUID DEFAULT NULL
)
RETURNS TABLE (start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, team_member_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_business_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION 'get_busy_slots: business_id, from and to are required';
  END IF;

  IF p_to < p_from OR p_to - p_from > INTERVAL '32 days' THEN
    RAISE EXCEPTION 'get_busy_slots: invalid date range (max 32 days)';
  END IF;

  RETURN QUERY
  SELECT a.start_time, a.end_time, a.team_member_id
  FROM public.appointments a
  WHERE a.business_id = p_business_id
    AND a.status <> 'cancelled'
    AND a.start_time >= p_from
    AND a.start_time <= p_to
    AND (p_team_member_id IS NULL OR a.team_member_id = p_team_member_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_busy_slots(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Drop the public SELECT policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view appointments by ID" ON public.appointments;
DROP POLICY IF EXISTS "anon_select_appointments" ON public.appointments;

-- -----------------------------------------------------------------------------
-- 3. Guard: abort (rolling back everything above) if any SELECT-capable policy
--    on appointments still has USING = true.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  offenders TEXT;
BEGIN
  SELECT string_agg(format('%s (%s)', p.policyname, p.cmd), ', ' ORDER BY p.policyname)
  INTO offenders
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'appointments'
    AND p.cmd IN ('SELECT', 'ALL')
    AND lower(btrim(coalesce(p.qual, ''), '() ')) = 'true';

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 025 aborted: permissive SELECT policies remain on appointments: %', offenders;
  END IF;
END
$$;

COMMIT;
