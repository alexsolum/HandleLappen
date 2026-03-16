-- Add brand and image columns to barcode_product_cache
ALTER TABLE "public"."barcode_product_cache"
ADD COLUMN "image_url" text,
ADD COLUMN "brand" text;

-- Add brand and image columns to household_item_memory
ALTER TABLE "public"."household_item_memory"
ADD COLUMN "product_image_url" text,
ADD COLUMN "brand" text;

-- Add brand and image columns to list_items
ALTER TABLE "public"."list_items"
ADD COLUMN "product_image_url" text,
ADD COLUMN "brand" text;
