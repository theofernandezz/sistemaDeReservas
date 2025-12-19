-- =============================================
-- Migración: Deshabilitar RLS y agregar status 'completed'
-- Ejecutar este SQL en Supabase → SQL Editor
-- =============================================

-- 1. Deshabilitar RLS en todas las tablas para permitir operaciones
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots DISABLE ROW LEVEL SECURITY;

-- 2. Actualizar el CHECK constraint de appointments para incluir 'completed'
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text]));

-- 3. (Opcional) Si quieres habilitar RLS con políticas permisivas más adelante:
-- ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on services" ON public.services FOR ALL USING (true) WITH CHECK (true);
-- 
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
--
-- ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on blocked_slots" ON public.blocked_slots FOR ALL USING (true) WITH CHECK (true);
