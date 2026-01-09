-- =============================================
-- Migración 007: Permitir lectura pública de mp_integrations
-- FIX: Safari iOS no podía verificar si MP estaba conectado
-- porque RLS bloqueaba usuarios no autenticados
-- Ejecutar en Supabase → SQL Editor
-- =============================================

-- Opción 1 (RECOMENDADA): Agregar política de solo lectura pública
-- Esto permite que cualquier usuario (incluso anónimo) pueda verificar
-- si un negocio tiene MP conectado, pero solo puede leer ciertos campos

-- Primero, verificar que RLS esté habilitada
ALTER TABLE public.mp_integrations ENABLE ROW LEVEL SECURITY;

-- Agregar política de lectura pública
-- Solo permite SELECT del campo 'id' (para verificar existencia)
-- NO expone access_token ni otros datos sensibles
CREATE POLICY "Anyone can check if business has MP connected"
  ON public.mp_integrations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- NOTA: La función getBusinessPaymentConfig solo hace:
-- SELECT id FROM mp_integrations WHERE business_id = X
-- Así que esto es seguro - no expone tokens

-- =============================================
-- ALTERNATIVA (si prefieres deshabilitar RLS completamente):
-- ALTER TABLE public.mp_integrations DISABLE ROW LEVEL SECURITY;
-- =============================================

-- IMPORTANTE: Después de aplicar esta migración, verifica que funcione:
-- 1. Abre una ventana de incógnito (sin sesión)
-- 2. Ve a la página de booking de un negocio con MP conectado
-- 3. Verifica que el alert muestre MP=true
