-- =============================================
-- Migration 014: Re-enable RLS with corrected policies
-- Replaces disable_rls_fix.sql with proper security policies
-- IMPORTANT: This must be run AFTER 013_fix_pending_bookings.sql
-- =============================================

-- =============================================================================
-- PART 1: Drop ALL existing policies to avoid conflicts
-- =============================================================================

-- Drop ALL existing policies on services
DROP POLICY IF EXISTS "Business owners can manage services" ON public.services;
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
DROP POLICY IF EXISTS "Business owners can manage own services" ON public.services;

-- Drop ALL existing policies on appointments
DROP POLICY IF EXISTS "Business owners can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can view appointments by ID" ON public.appointments;
DROP POLICY IF EXISTS "Business owners can manage own appointments" ON public.appointments;

-- Drop ALL existing policies on blocked_slots
DROP POLICY IF EXISTS "Business owners can manage blocked slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Public can view blocked slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Business owners can manage own blocked slots" ON public.blocked_slots;

-- Drop ALL existing policies on pending_bookings
DROP POLICY IF EXISTS "Anyone can create pending bookings" ON public.pending_bookings;
DROP POLICY IF EXISTS "Anyone can read pending bookings by ID" ON public.pending_bookings;
DROP POLICY IF EXISTS "Public can read pending bookings by ID" ON public.pending_bookings;
DROP POLICY IF EXISTS "Service role can update pending bookings" ON public.pending_bookings;
DROP POLICY IF EXISTS "Business owners can manage own pending bookings" ON public.pending_bookings;

-- =============================================================================
-- PART 2: Re-enable RLS on all tables
-- =============================================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
-- pending_bookings already has RLS enabled from migration 006

-- =============================================================================
-- PART 3: SERVICES - Corrected policies
-- =============================================================================

-- Business owners can manage their own services
CREATE POLICY "Business owners can manage own services" ON public.services
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can view active services for booking (multi-tenant safe)
CREATE POLICY "Public can view active services" ON public.services
  FOR SELECT USING (is_active = true);

-- =============================================================================
-- PART 4: APPOINTMENTS - Corrected policies
-- =============================================================================

-- Business owners can manage appointments in their business
CREATE POLICY "Business owners can manage own appointments" ON public.appointments
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can create appointments (booking flow)
CREATE POLICY "Public can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (true);

-- Public can view appointments by ID (for viewing confirmation/cancellation)
-- This is intentionally permissive for the booking flow UX
-- Consider adding token-based auth in the future
CREATE POLICY "Public can view appointments by ID" ON public.appointments
  FOR SELECT USING (true);

-- =============================================================================
-- PART 5: BLOCKED_SLOTS - Corrected policies
-- =============================================================================

-- Business owners can manage their own blocked slots
CREATE POLICY "Business owners can manage own blocked slots" ON public.blocked_slots
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can view blocked slots for availability calculation
-- Filter by business_id in application code for multi-tenancy
CREATE POLICY "Public can view blocked slots" ON public.blocked_slots
  FOR SELECT USING (true);

-- =============================================================================
-- PART 6: PENDING_BOOKINGS - New policies with business_id
-- =============================================================================

-- Business owners can manage their own pending bookings
CREATE POLICY "Business owners can manage own pending bookings" ON public.pending_bookings
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can create pending bookings (booking flow)
-- Already exists from migration 006: "Anyone can create pending bookings"

-- Public can read pending bookings by ID (for payment flow)
-- This is needed for the payment confirmation page
CREATE POLICY "Public can read pending bookings by ID" ON public.pending_bookings
  FOR SELECT USING (true);

-- Service role can update pending bookings (webhook flow)
-- This allows the webhook to mark bookings as paid
CREATE POLICY "Service role can update pending bookings" ON public.pending_bookings
  FOR UPDATE USING (
    -- Allow service role key (used by webhook)
    auth.jwt()->>'role' = 'service_role'
  );

-- =============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- =============================================================================

-- Test as business owner:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO 'your-user-id';
-- SELECT * FROM services WHERE business_id = 'your-business-id';

-- Test as public (anon):
-- SET LOCAL ROLE anon;
-- SELECT * FROM services WHERE is_active = true;

-- =============================================================================
-- NOTES
-- =============================================================================

-- Security considerations:
-- 1. Appointments SELECT policy is permissive (USING true) to allow public access
--    to confirmation pages. Consider adding token-based auth for better security.
-- 2. Blocked slots SELECT is permissive to allow availability calculation.
--    Application code must filter by business_id.
-- 3. Pending bookings can be updated by service_role (webhook) to process payments.
-- 4. All business owner policies properly filter by business_id through businesses.owner_id.

-- Multi-tenancy:
-- All policies now properly isolate data by business_id when appropriate.
-- Public policies intentionally allow cross-business reads where needed for UX.
