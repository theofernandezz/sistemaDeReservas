-- =============================================
-- Migración 005: Agregar campos de pago
-- Para Checkout Pro de Mercado Pago
-- Ejecutar en Supabase → SQL Editor
-- =============================================

-- 1. Agregar configuración de pagos a businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS deposit_percentage integer DEFAULT 50;

-- 2. Agregar campos de pago a appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS mp_preference_id text;

-- 3. Índice para buscar por payment_id
CREATE INDEX IF NOT EXISTS appointments_payment_id_idx ON public.appointments(payment_id);

-- 4. Comentarios para documentación
COMMENT ON COLUMN public.businesses.deposit_percentage IS 'Porcentaje de seña a cobrar (0-100)';
COMMENT ON COLUMN public.appointments.payment_status IS 'pending, paid, refunded';
COMMENT ON COLUMN public.appointments.payment_id IS 'ID del pago en Mercado Pago';
COMMENT ON COLUMN public.appointments.payment_amount IS 'Monto de la seña cobrada';
COMMENT ON COLUMN public.appointments.mp_preference_id IS 'ID de la preferencia de MP';
