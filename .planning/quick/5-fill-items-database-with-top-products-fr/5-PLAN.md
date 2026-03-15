---
quick_task: 5
title: Fill items database with top products from kassal.app
type: execute
wave: 1
files_modified:
  - src/lib/server/kassal/seed-items.ts
  - src/lib/server/db/seed.ts
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Top 50-100 products from Kassal API are fetched successfully"
    - "Products are enriched with brand and image_url via Phase 19 utilities"
    - "Existing products are updated if name matches, new products inserted"
    - "Seed script runs without errors and logs completion"
  artifacts:
    - path: "src/lib/server/kassal/seed-items.ts"
      provides: "Kassal API fetching and product enrichment for seeding"
    - path: "src/lib/server/db/seed.ts"
      provides: "Database insert/update logic for items"
  key_links:
    - from: "src/lib/server/kassal/seed-items.ts"
      to: "src/lib/server/kassal/extract.ts"
      via: "extractKassalProduct utility"
    - from: "src/lib/server/kassal/seed-items.ts"
      to: "src/lib/server/kassal/enrich.ts"
      via: "isJunkBrand, getOFFImage enrichment"
---

<objective>
Populate the items table with the top 50-100 products from Kassal.app, enabling users to quickly add common household products to shopping lists without barcode scanning.

Purpose: Accelerate list creation by providing a curated seed of popular products matching typical household shopping patterns.
Output: Seed script that imports Kassal top products with enriched metadata (brand, image_url) into the items table.
</objective>

<execution_context>
@C:/Users/HP/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

## Phase 19 Integration

From Phase 19-01, use existing utilities:
- `extractKassalProduct` (src/lib/server/kassal/extract.ts) — handles Kassal API v1 data structure (data.products[0])
- `isJunkBrand` filter — strips junk values: none/n/a/ukjent/unknown/na/-/empty
- `getOFFImage` — fetches brand-specific images from OpenFoodFacts
- Product enrichment pipeline — already tested and working

## Kassal API Details

- Endpoint: `https://kassal.app/api/v1/products` with query filters (trending/popular)
- Expected response shape: `{ data: { products: [...] } }`
- No auth required (public API)
- Typical response: 10-20 products per request, paginated via offset
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Kassal seed-items utility</name>
  <files>src/lib/server/kassal/seed-items.ts</files>
  <action>
Create a new utility module that:
1. Fetches top products from Kassal API v1 (`https://kassal.app/api/v1/products?trending=true&limit=100`)
2. Extracts product data using `extractKassalProduct` from extract.ts (handles nested data.products[0] structure)
3. Enriches each product:
   - Filter out junk brands using `isJunkBrand`
   - Fetch brand images via `getOFFImage`
   - Normalize names (lowercase, trim)
4. Returns array of enriched products: `{ name, category, brand, image_url }`
5. Includes error handling: log warnings for failed enrichments, continue with partial data

Export: `async function fetchAndEnrichTopProducts(): Promise<{name, category, brand, image_url}[]>`
  </action>
  <verify>
    <automated>Node command: node -e "import('./src/lib/server/kassal/seed-items.ts').then(m => m.fetchAndEnrichTopProducts().then(p => console.log('Fetched:', p.length, 'products')))"</automated>
  </verify>
  <done>Utility fetches 50+ products, enriches with brand/image_url, exports async function, handles errors gracefully</done>
</task>

<task type="auto">
  <name>Task 2: Implement items table seed script</name>
  <files>src/lib/server/db/seed.ts</files>
  <action>
Add a `seedItems()` function to the existing seed.ts that:
1. Calls `fetchAndEnrichTopProducts()`
2. For each product:
   - Check if product with same name already exists in items table
   - If exists: UPDATE with fresh brand, image_url, category data
   - If new: INSERT with name, category, brand, image_url
3. Use Supabase `upsert()` on (name) unique constraint (create constraint if missing via migration)
4. Log: total imported, updated count, any errors
5. Return: { imported: number, updated: number, errors: string[] }

Export: `async function seedItems(): Promise<{imported, updated, errors}>`

Integration with main seed function:
- If seed.ts has a main export (e.g., `export async function main()`), add `await seedItems()` call
- If not, add CLI entry point: `if (import.meta.url === \`file://\${process.argv[1]}\`) await seedItems()`
  </action>
  <verify>
    <automated>npm run db:seed (or npx tsx src/lib/server/db/seed.ts)</automated>
  </verify>
  <done>Seed script runs without errors, logs import count, items table contains 50+ products with names/brands/images</done>
</task>

<task type="auto">
  <name>Task 3: Verify seed data in database</name>
  <files>src/lib/server/db/seed.ts</files>
  <action>
After seed completes, query items table to confirm:
1. Row count >= 50
2. Sample 5 random rows have: name, category, brand (not junk), image_url (valid HTTPS URL)
3. No duplicate names exist
4. Log sample rows: `SELECT name, brand, image_url FROM items LIMIT 5`

Add verification queries to seed script or create a separate verification script that executes after seed.
  </action>
  <verify>
    <automated>SELECT COUNT(*) FROM items; (expect >= 50)</automated>
  </verify>
  <done>Items table has 50+ products, no duplicates, all have valid brand/image data</done>
</task>

</tasks>

<verification>
Execute seed script: `npm run db:seed`
- No errors logged
- Import count logged (expect 50+)
- Items table populated

Query verification:
```sql
SELECT COUNT(*) as total FROM items;
SELECT name, brand, image_url FROM items LIMIT 5;
```

Expected: >= 50 items, sample rows have non-junk brand and valid image URLs.
</verification>

<success_criteria>
- Seed script executes without errors
- 50-100 top products imported to items table
- Each product has: name, category, brand (filtered for junk), image_url
- Existing products updated with fresh Kassal data
- Database ready for users to quickly add common items to shopping lists
</success_criteria>

<output>
After completion, create `.planning/quick/5-fill-items-database-with-top-products-fr/5-SUMMARY.md` with:
- Execution time
- Total products imported/updated
- Sample product names
- Any enrichment failures
- Git commit hash
</output>
