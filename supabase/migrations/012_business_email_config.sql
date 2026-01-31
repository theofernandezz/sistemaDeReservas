-- =============================================
-- Migración: Agregar configuración de emails por business
-- Permite a cada negocio configurar sus propios emails
-- =============================================

-- 1. Agregar columnas de email a businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS email_from text,
ADD COLUMN IF NOT EXISTS email_from_name text,
ADD COLUMN IF NOT EXISTS admin_notification_email text,
ADD COLUMN IF NOT EXISTS email_brand_color text DEFAULT '#db2777';

-- 2. Comentarios para documentación
COMMENT ON COLUMN public.businesses.email_from IS 'Email de envío (from) para notificaciones del negocio';
COMMENT ON COLUMN public.businesses.email_from_name IS 'Nombre mostrado en el remitente de emails';
COMMENT ON COLUMN public.businesses.admin_notification_email IS 'Email donde se reciben notificaciones de nuevas reservas';
COMMENT ON COLUMN public.businesses.email_brand_color IS 'Color de marca para emails (hex)';

-- 3. Índice para búsqueda rápida (opcional)
CREATE INDEX IF NOT EXISTS businesses_email_from_idx ON public.businesses(email_from);

-- 4. Actualizar registros existentes con valores por defecto
UPDATE public.businesses 
SET email_from_name = name
WHERE email_from_name IS NULL;

-- 5. Function to get business email config
CREATE OR REPLACE FUNCTION get_business_email_config(business_id uuid)
RETURNS TABLE (
  email_from text,
  email_from_name text,
  admin_notification_email text,
  email_brand_color text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.email_from,
    b.email_from_name,
    b.admin_notification_email,
    b.email_brand_color
  FROM public.businesses b
  WHERE b.id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
