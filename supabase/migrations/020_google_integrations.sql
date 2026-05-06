-- =============================================
-- Migración 020: Crear tabla google_integrations
-- Para almacenar tokens de Google Calendar OAuth
-- Ejecutar en Supabase → SQL Editor
-- =============================================

-- 1. Crear tabla de integraciones de Google Calendar
CREATE TABLE public.google_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id)
);

-- 2. Índice para búsquedas
CREATE INDEX google_integrations_business_idx ON public.google_integrations(business_id);

-- 3. Trigger para updated_at
CREATE TRIGGER update_google_integrations_updated_at
  BEFORE UPDATE ON public.google_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

-- Solo el dueño del negocio puede gestionar su integración de Google
CREATE POLICY "Business owners can manage their Google integration" ON public.google_integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = google_integrations.business_id
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = google_integrations.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

