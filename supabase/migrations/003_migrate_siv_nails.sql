-- =============================================
-- Migración 003: Migrar Siv Nails como primer tenant
-- 
-- INSTRUCCIONES:
-- 1. Primero ejecuta 001 y 002
-- 2. Obtén el UUID del usuario dueño de Siv Nails
-- 3. Reemplaza 'YOUR_USER_ID_HERE' con ese UUID
-- 4. Ejecuta este script
-- =============================================

-- Reemplazar este valor con el UUID real del usuario
DO $$
DECLARE
  owner_uuid uuid := 'YOUR_USER_ID_HERE'; -- <- CAMBIAR ESTO
  new_business_id uuid;
BEGIN
  -- 1. Crear el negocio Siv Nails
  INSERT INTO public.businesses (owner_id, name, slug, description, phone, instagram, address)
  VALUES (
    owner_uuid,
    'Siv Nails',
    'siv-nails',
    'Servicio profesional de uñas en Villa Pueyrredón',
    NULL, -- agregar teléfono si lo tienen
    '@siv.nails_',
    'Villa Pueyrredón, CABA'
  )
  RETURNING id INTO new_business_id;

  -- 2. Asignar todos los servicios existentes a Siv Nails
  UPDATE public.services 
  SET business_id = new_business_id 
  WHERE business_id IS NULL;

  -- 3. Asignar todas las citas existentes a Siv Nails
  UPDATE public.appointments 
  SET business_id = new_business_id 
  WHERE business_id IS NULL;

  -- 4. Asignar todos los bloqueos existentes a Siv Nails
  UPDATE public.blocked_slots 
  SET business_id = new_business_id 
  WHERE business_id IS NULL;

  -- 5. Asignar todos los addons existentes a Siv Nails
  UPDATE public.service_addons 
  SET business_id = new_business_id 
  WHERE business_id IS NULL;

  RAISE NOTICE 'Siv Nails migrado exitosamente con ID: %', new_business_id;
END $$;

-- Verificar migración
SELECT 
  'services' as tabla, 
  COUNT(*) as total, 
  COUNT(business_id) as con_business_id 
FROM public.services
UNION ALL
SELECT 'appointments', COUNT(*), COUNT(business_id) FROM public.appointments
UNION ALL
SELECT 'blocked_slots', COUNT(*), COUNT(business_id) FROM public.blocked_slots
UNION ALL
SELECT 'service_addons', COUNT(*), COUNT(business_id) FROM public.service_addons;
