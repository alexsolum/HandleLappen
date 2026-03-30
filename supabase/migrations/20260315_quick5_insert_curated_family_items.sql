-- Quick Task 5: Insert 67 curated family grocery items with Unsplash images
-- Reflects realistic family shopping across all app categories

-- Step 1: Insert 67 curated family items with proper category names and image URLs
INSERT INTO items (name, category, image_url) VALUES
('Melk 1,5L', 'Meieriprodukter', 'https://images.unsplash.com/photo-1550583573-b03b30a4e9c1?w=400&h=400&fit=crop'),
('Yoghurt naturell', 'Meieriprodukter', 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=400&h=400&fit=crop'),
('Ost', 'Ost', 'https://images.unsplash.com/photo-1452894695090-fdf0dbeaf977?w=400&h=400&fit=crop'),
('Smør', 'Meieriprodukter', 'https://images.unsplash.com/photo-1572862918895-f65d92a43a17?w=400&h=400&fit=crop'),
('Egg', 'Egg', 'https://images.unsplash.com/photo-1570527002731-764a5f864b8d?w=400&h=400&fit=crop'),
('Brød', 'Brød og bakervarer', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop'),
('Brødskiver', 'Brød og bakervarer', 'https://images.unsplash.com/photo-1585080591681-07ccb855cbf1?w=400&h=400&fit=crop'),
('Havregryn', 'Frokostblanding og havregryn', 'https://images.unsplash.com/photo-1609318743402-7e8242dcd74f?w=400&h=400&fit=crop'),
('Ris', 'Pasta, ris og kornprodukter', 'https://images.unsplash.com/photo-1586867581162-53c5e51b5fe2?w=400&h=400&fit=crop'),
('Spagetti', 'Pasta, ris og kornprodukter', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop'),
('Pasta', 'Pasta, ris og kornprodukter', 'https://images.unsplash.com/photo-1608272670147-2ce06a3d8ad6?w=400&h=400&fit=crop'),
('Mel', 'Bakevarer og bakeingredienser', 'https://images.unsplash.com/photo-1585857269498-bf47c7b21fa3?w=400&h=400&fit=crop'),
('Sukker', 'Bakevarer og bakeingredienser', 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b11?w=400&h=400&fit=crop'),
('Bakepulver', 'Bakevarer og bakeingredienser', 'https://images.unsplash.com/photo-1599599810721-53c315e5d7fd?w=400&h=400&fit=crop'),
('Salt', 'Krydder', 'https://images.unsplash.com/photo-1599599810991-5576145eaf6e?w=400&h=400&fit=crop'),
('Pepper', 'Krydder', 'https://images.unsplash.com/photo-1599599810723-08c7d3647b5d?w=400&h=400&fit=crop'),
('Olje', 'Sauser og matoljer', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop'),
('Dressing', 'Sauser og matoljer', 'https://images.unsplash.com/photo-1577751577649-5f5f45b9da3a?w=400&h=400&fit=crop'),
('Ketchup', 'Sauser og matoljer', 'https://images.unsplash.com/photo-1599599810724-08c7d3647b5d?w=400&h=400&fit=crop'),
('Mayones', 'Sauser og matoljer', 'https://images.unsplash.com/photo-1577651632440-42a34437df73?w=400&h=400&fit=crop'),
('Kyllingfilet', 'Kylling og kalkun', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop'),
('Kjøttdeig', 'Ferskt kjøtt', 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=400&fit=crop'),
('Biff', 'Ferskt kjøtt', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop'),
('Svinekjøtt', 'Ferskt kjøtt', 'https://images.unsplash.com/photo-1587110450766-7f42f6911d24?w=400&h=400&fit=crop'),
('Laksefilet', 'Fisk og sjømat', 'https://images.unsplash.com/photo-1545328285-e39efc1fc28f?w=400&h=400&fit=crop'),
('Torsk', 'Fisk og sjømat', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop'),
('Torskefilet', 'Fisk og sjømat', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop'),
('Dill', 'Urter og ferdigkuttede grønnsaker', 'https://images.unsplash.com/photo-1464226184081-280282ac64f9?w=400&h=400&fit=crop'),
('Tomater', 'Frukt og grønt', 'https://images.unsplash.com/photo-1592921570552-bfed82f8b5f7?w=400&h=400&fit=crop'),
('Løk', 'Frukt og grønt', 'https://images.unsplash.com/photo-1568697899326-ef4352be2f70?w=400&h=400&fit=crop'),
('Hvitløk', 'Frukt og grønt', 'https://images.unsplash.com/photo-1584265311797-fac07cbbce5f?w=400&h=400&fit=crop'),
('Poteter', 'Frukt og grønt', 'https://images.unsplash.com/photo-1585238341710-4dd0c06ff000?w=400&h=400&fit=crop'),
('Agurk', 'Frukt og grønt', 'https://images.unsplash.com/photo-1589927121110-1c72e48e0c91?w=400&h=400&fit=crop'),
('Paprika', 'Frukt og grønt', 'https://images.unsplash.com/photo-1585518419759-f854b34b8b40?w=400&h=400&fit=crop'),
('Brokkoli', 'Frukt og grønt', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop'),
('Gulrot', 'Frukt og grønt', 'https://images.unsplash.com/photo-1584866584329-594a82e24e37?w=400&h=400&fit=crop'),
('Salat', 'Frukt og grønt', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=400&fit=crop'),
('Spinat', 'Frukt og grønt', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=400&fit=crop'),
('Epple', 'Frukt og grønt', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop'),
('Banan', 'Frukt og grønt', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop'),
('Appelsin', 'Frukt og grønt', 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b11?w=400&h=400&fit=crop'),
('Sitron', 'Frukt og grønt', 'https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?w=400&h=400&fit=crop'),
('Jordbær', 'Frukt og grønt', 'https://images.unsplash.com/photo-1585518419759-f854b34b8b40?w=400&h=400&fit=crop'),
('Blåbær', 'Frukt og grønt', 'https://images.unsplash.com/photo-1590504866505-84a1ebc7dfe6?w=400&h=400&fit=crop'),
('Druer', 'Frukt og grønt', 'https://images.unsplash.com/photo-1579298910411-5ca5f38d2df6?w=400&h=400&fit=crop'),
('Melk kaffe', 'Drikkevarer', 'https://images.unsplash.com/photo-1511537190424-ae21b50e9f0d?w=400&h=400&fit=crop'),
('Kaffe', 'Kaffe og te', 'https://images.unsplash.com/photo-1559056199-641a0ac8b3f7?w=400&h=400&fit=crop'),
('Te', 'Kaffe og te', 'https://images.unsplash.com/photo-1597318780843-ffb5f8ba8e44?w=400&h=400&fit=crop'),
('Kakao', 'Drikkevarer', 'https://images.unsplash.com/photo-1578432537150-15c6900d7d7d?w=400&h=400&fit=crop'),
('Juice', 'Drikkevarer', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop'),
('Vann', 'Drikkevarer', 'https://images.unsplash.com/photo-1582471051032-5bbf6eafb0b3?w=400&h=400&fit=crop'),
('Brus', 'Drikkevarer', 'https://images.unsplash.com/photo-1566476253487-2e6c6b07cc50?w=400&h=400&fit=crop'),
('Husholdningsrull', 'Husholdningsartikler', 'https://images.unsplash.com/photo-1586016621840-ab53cbb20e7a?w=400&h=400&fit=crop'),
('Toalettpapir', 'Husholdningsartikler', 'https://images.unsplash.com/photo-1585538326910-c6102ca31dba?w=400&h=400&fit=crop'),
('Oppvaskdusk', 'Husholdningsartikler', 'https://images.unsplash.com/photo-1585537539521-f750c8bc8fa1?w=400&h=400&fit=crop'),
('Oppvaskmiddel', 'Husholdningsartikler', 'https://images.unsplash.com/photo-1585538326910-c6102ca31dba?w=400&h=400&fit=crop'),
('Tøymykner', 'Husholdningsartikler', 'https://images.unsplash.com/photo-1585537539521-f750c8bc8fa1?w=400&h=400&fit=crop'),
('Vaskeposer', 'Husholdningsartikler', 'https://images.unsplash.com/photo-1585538326910-c6102ca31dba?w=400&h=400&fit=crop'),
('Såpe', 'Personlig hygiene', 'https://images.unsplash.com/photo-1585542340198-b48bb1221bbd?w=400&h=400&fit=crop'),
('Tannkrem', 'Personlig hygiene', 'https://images.unsplash.com/photo-1585542340198-b48bb1221bbd?w=400&h=400&fit=crop'),
('Tannbørste', 'Personlig hygiene', 'https://images.unsplash.com/photo-1585542340198-b48bb1221bbd?w=400&h=400&fit=crop'),
('Shampoo', 'Personlig hygiene', 'https://images.unsplash.com/photo-1585542340198-b48bb1221bbd?w=400&h=400&fit=crop'),
('Tomatsuppe', 'Hermetikk og glassvarer', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop'),
('Bønner', 'Hermetikk og glassvarer', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop'),
('Mais', 'Hermetikk og glassvarer', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop'),
('Tunfisk', 'Hermetikk og glassvarer', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop'),
('Hakkekjøtt', 'Hermetikk og glassvarer', 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=400&fit=crop')
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

-- Step 2: Populate household_item_memory from items (CROSS JOIN pattern)
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
  NULL AS last_category_id,
  i.image_url AS product_image_url,
  i.brand,
  0 AS use_count,
  NOW() AS last_used_at,
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
