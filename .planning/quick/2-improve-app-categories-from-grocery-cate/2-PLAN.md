# Quick Task 2: Improve app categories from grocery_categories.md and sync Supabase - Plan

## Goal

Align the app's default grocery categories with `.planning/grocery_categories.md`, update Supabase so existing households get the new structure, and keep barcode/category matching consistent.

## Tasks

### 1. Update shared category definitions
- files: `.planning/grocery_categories.md`, `src/lib/barcode/lookup.ts`, `supabase/functions/_shared/barcode.ts`
- action: Replace the old coarse category buckets with the grocery category spec and update barcode canonical mappings/names accordingly.
- verify: The app-side category name mapping and barcode canonical category set match the new document.
- done: App code recognizes the new category taxonomy.

### 2. Sync Supabase seed data and existing households
- files: `supabase/migrations/20260310000005_phase3_categories_stores.sql`, `supabase/migrations/<new quick migration>.sql`, `src/lib/types/database.ts`
- action: Update the default seed function for new households and add a new migration that rewrites existing household categories and store layouts to the new ordered set.
- verify: New households seed the new categories and existing production households can be migrated in place.
- done: Supabase schema/functions/data are aligned with the new category structure.

### 3. Update focused tests and apply to production
- files: `tests/categories.spec.ts`, `src/lib/queries/barcode.test.ts`
- action: Update assertions that rely on old category names/order and verify the new barcode-to-category mapping expectations.
- verify: Focused tests relevant to categories pass, then apply the new migration to Supabase production.
- done: The category change is covered and deployed.
