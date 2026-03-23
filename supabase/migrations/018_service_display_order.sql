-- Add persistent display order for services so businesses can control visible order.

ALTER TABLE services
ADD COLUMN IF NOT EXISTS display_order integer;

WITH ranked_services AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id
      ORDER BY created_at ASC, name ASC, id ASC
    ) AS rank_order
  FROM services
)
UPDATE services
SET display_order = ranked_services.rank_order
FROM ranked_services
WHERE services.id = ranked_services.id
  AND services.display_order IS NULL;

ALTER TABLE services
ALTER COLUMN display_order SET DEFAULT 0;

UPDATE services
SET display_order = 0
WHERE display_order IS NULL;

ALTER TABLE services
ALTER COLUMN display_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS services_business_id_display_order_idx
  ON services (business_id, display_order);
