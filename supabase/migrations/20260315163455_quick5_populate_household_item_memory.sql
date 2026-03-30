-- Quick Task 5: Populate household_item_memory with 82 products from items catalog
-- Assigns each item to every household for Varekatalog visibility
-- Deduplicates by normalized_name (lowercase) per household

INSERT INTO household_item_memory (
  household_id,
  normalized_name,
  display_name,
  last_category_id,
  product_image_url,
  brand,
  use_count,
  last_used_at,
  created_at,
  updated_at
)
SELECT
  h.id AS household_id,
  LOWER(TRIM(i.name)) AS normalized_name,
  TRIM(i.name) AS display_name,
  NULL AS last_category_id,  -- will be resolved per-household on first add
  i.image_url AS product_image_url,
  i.brand,
  0 AS use_count,
  NULL AS last_used_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM
  items i
CROSS JOIN
  households h
WHERE
  NOT EXISTS (
    SELECT 1 FROM household_item_memory him
    WHERE him.household_id = h.id
    AND him.normalized_name = LOWER(TRIM(i.name))
  )
ON CONFLICT (household_id, normalized_name) DO NOTHING;
