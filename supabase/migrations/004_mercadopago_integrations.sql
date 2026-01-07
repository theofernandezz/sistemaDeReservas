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

-- Business owners can manage their MP integration
CREATE POLICY "Business owners can manage their MP integration" ON public.mp_integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = mp_integrations.business_id 
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = mp_integrations.business_id 
      AND businesses.owner_id = auth.uid()
    )
  );
