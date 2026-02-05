-- =============================================
-- Migration 017: Restore INSERT policy on pending_bookings
-- Migration 014 dropped "Anyone can create pending bookings" (line 29)
-- but never re-created it — the comment at line 111 said "Already exists"
-- which was incorrect. Public booking flow (anon) needs this to insert.
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pending_bookings'
      AND policyname = 'Anyone can create pending bookings'
  ) THEN
    CREATE POLICY "Anyone can create pending bookings"
      ON public.pending_bookings
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
