-- =============================================
-- Migración 001: Crear tabla businesses (tenants)
-- Ejecutar en Supabase → SQL Editor
-- =============================================

-- 1. Crear tabla de negocios
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  logo text,
  phone text,
  email text,
  address text,
  instagram text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint: slug solo permite a-z, 0-9, y guiones
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- 2. Índices
CREATE UNIQUE INDEX businesses_slug_idx ON public.businesses(slug);
CREATE UNIQUE INDEX businesses_owner_idx ON public.businesses(owner_id);

-- 3. Función para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (habilitado para multi-tenant)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Dueños pueden ver y editar su negocio
CREATE POLICY "Owners can manage their business" ON public.businesses
  FOR ALL USING (owner_id = auth.uid());

-- Público puede ver negocios (para booking pages)
CREATE POLICY "Public can view businesses" ON public.businesses
  FOR SELECT USING (true);
