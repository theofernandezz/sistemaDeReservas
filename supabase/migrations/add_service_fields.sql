-- Agregar columnas description e image a la tabla services
ALTER TABLE services
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image TEXT;

-- Actualizar servicios existentes con valores por defecto si es necesario
UPDATE services 
SET description = 'Servicio profesional de calidad' 
WHERE description IS NULL;

UPDATE services 
SET image = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800'
WHERE image IS NULL;
