-- =============================================
-- Migración 002: Agregar business_id a tablas existentes
-- Ejecutar DESPUÉS de 001_create_businesses.sql
-- =============================================

-- 1. Agregar columna business_id a todas las tablas
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.blocked_slots 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.service_addons 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- 2. Crear índices para business_id (mejora performance de queries)
CREATE INDEX IF NOT EXISTS services_business_id_idx ON public.services(business_id);
CREATE INDEX IF NOT EXISTS appointments_business_id_idx ON public.appointments(business_id);
CREATE INDEX IF NOT EXISTS blocked_slots_business_id_idx ON public.blocked_slots(business_id);
CREATE INDEX IF NOT EXISTS service_addons_business_id_idx ON public.service_addons(business_id);

-- 3. Habilitar RLS en todas las tablas
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para SERVICES
-- Dueños pueden gestionar servicios de su negocio
CREATE POLICY "Business owners can manage services" ON public.services
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Público puede ver servicios activos (para booking)
CREATE POLICY "Public can view active services" ON public.services
  FOR SELECT USING (is_active = true);

-- 5. Políticas RLS para APPOINTMENTS
-- Dueños pueden gestionar citas de su negocio
CREATE POLICY "Business owners can manage appointments" ON public.appointments
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Público puede crear citas (booking) - INSERT only
CREATE POLICY "Public can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (true);

-- Público puede ver sus propias citas por email (para cancelar)
CREATE POLICY "Public can view own appointments" ON public.appointments
  FOR SELECT USING (true);

-- 6. Políticas RLS para BLOCKED_SLOTS
-- Dueños pueden gestionar bloqueos de su negocio
CREATE POLICY "Business owners can manage blocked slots" ON public.blocked_slots
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Público puede ver bloqueos (para calcular disponibilidad)
CREATE POLICY "Public can view blocked slots" ON public.blocked_slots
  FOR SELECT USING (true);

-- 7. Políticas RLS para SERVICE_ADDONS
-- Dueños pueden gestionar addons de su negocio
CREATE POLICY "Business owners can manage addons" ON public.service_addons
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Público puede ver addons activos
CREATE POLICY "Public can view active addons" ON public.service_addons
  FOR SELECT USING (is_active = true);
