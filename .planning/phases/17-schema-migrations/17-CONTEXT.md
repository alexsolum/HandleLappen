# Phase 17: Schema Migrations - Context

**Gathered:** 2026-03-14  
**Status:** Decisions Locked

<domain>
## Phase Boundary

Pre-create the nullable columns that future enrichment work will read or write before any application code attempts to persist image or brand metadata. This phase is purely schema, so the tables must remain stable in production while ensuring the eventual data flows have the columns they expect.

## Core Decisions

### 1. Column footprint
- `barcode_product_cache` gets `image_url text` and `brand text`. These fields mirror what Kassal.app will supply and stay nullable so existing rows are unaffected.
- `household_item_memory` and `list_items` get `product_image_url text` and `brand text`. The `product_` prefix keeps the column semantically tied to the shopping list row while still remaining nullable, consistent with the migration note.
- No defaults are applied; all four columns simply default to `NULL` so the migration can run safely even while business logic hasn’t been wired to populate them yet.

### 2. Indexes & validation
- The new columns remain plain text columns and do not gain new indexes or additional check constraints in Phase 17. The decision is to avoid introducing unnecessary schema changes while we are still collecting data, so any lookups on `brand` or `image_url` will wait for later phases to optimize.
- No extra validation (length/URL format) is enforced yet; downstream enrichment can supply whatever Kassal.app provides and Phase 19/20 can gate stricter checks if needed.

### 3. Column population strategy
- Manual insert/update paths continue to leave the new columns `NULL`. The plan is to fill them only when barcode scanning (and later image upload flows) supply data, so there is no need to modify every list-item insert now. Insert statements may still explicitly reference the column with `NULL`, but the schema accepts missing values.
</domain>

<code_context>
## Schema references
- `supabase/migrations/20260310000006_phase4_barcode_cache.sql`: defines `barcode_product_cache`. We will append `image_url`/`brand` alongside the existing `expires_at`, `status`, and audit columns, keeping the current constraints & indexes untouched.
- `supabase/migrations/20260312190000_phase11_household_item_memory.sql`: defines `household_item_memory` and its helper functions/triggers (`upsert_household_item_memory`, `sync_household_item_memory`). Column additions have to respect the existing RLS policies and trigger updates.
- `supabase/migrations/20260309000004_phase2_shopping_lists.sql`: defines `list_items`. The new columns join the basic `name`, `quantity`, and timestamp columns, and any future writes or reads touching `list_items.product_image_url` or `.brand` should expect `NULL` until the Phase 19/20 enrichment pipeline is in place.
</code_context>

<deferred>
## Deferred ideas
- Propagating `product_image_url` and `brand` into household item memory / list item rows (covered by Area 2) is scheduled for later phases when the enriched scan pipeline is complete; Phase 19 enriches the cache/DTO path and Phase 20 writes and renders the row-level fields.
- Any additional indexing, constraint tightening, or RLS tuning (e.g., exposing the new columns via Supabase row policies) will be re-evaluated once we know how frequently the columns are queried by Phase 19/20 UI work.
- Backfill or migration scripts that copy existing image/brand data (if any) into the new columns are postponed until Kassal enrichment is live.
</deferred>

---
*Phase: 17-schema-migrations*
*Context gathered: 2026-03-14*
