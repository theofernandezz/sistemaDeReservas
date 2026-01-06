-- =============================================
-- Migración 004: Crear tabla mp_integrations
-- Para almacenar tokens de Mercado Pago Connect
-- Ejecutar en Supabase → SQL Editor
-- =============================================

-- 1. Crear tabla de integraciones de Mercado Pago
CREATE TABLE public.mp_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  mp_user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  public_key text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id)
);

-- 2. Índice para búsquedas
CREATE INDEX mp_integrations_business_idx ON public.mp_integrations(business_id);

-- 3. Trigger para updated_at
CREATE TRIGGER update_mp_integrations_updated_at
  BEFORE UPDATE ON public.mp_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE public.mp_integrations ENABLE ROW LEVEL SECURITY;

-- Los dueños pueden gestionar su integración de MP
CREATE POLICY "Owners can manage their MP integration" ON public.mp_integrations
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Super admins pueden ver todas las integraciones
CREATE POLICY "Super admins can view all MP integrations" ON public.mp_integrations
  FOR SELECT USING (
    (SELECT (raw_user_meta_data->>'is_super_admin')::boolean 
     FROM auth.users 
     WHERE id = auth.uid()) = true
  );
