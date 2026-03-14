# Phase 17: Schema Migrations - Research

**Gathered:** 2026-03-14  
**Status:** Research complete

## Goals & Constraints
- Phase 17 is an enabling schema phase for v2.0. It exists so later barcode-enrichment work can write brand and image metadata without racing the database schema.
- The required footprint is fixed by context and roadmap:
  - `public.barcode_product_cache`: add nullable `image_url text`, `brand text`
  - `public.household_item_memory`: add nullable `product_image_url text`, `brand text`
  - `public.list_items`: add nullable `product_image_url text`, `brand text`
- All new columns must be nullable and must not add defaults, indexes, checks, backfill logic, or RLS changes in this phase.
- This phase has no direct user-facing requirement; success is purely "schema is ready and current behavior is unchanged."

## Effective Current Schema

### `barcode_product_cache`
- Defined in `20260310000006_phase4_barcode_cache.sql`.
- Current table already stores canonical barcode lookup state: `normalized_name`, `canonical_category`, `confidence`, `source`, `status`, `provider_payload`, fetch timestamps, and audit timestamps.
- Existing constraints are limited to EAN format, `status`, and `confidence` bounds.
- Existing indexes are only on `expires_at` and `(status, expires_at)`.
- RLS is enabled, but all access is effectively restricted to `service_role`. That means adding nullable metadata columns is schema-only here; no policy work is needed.

### `list_items`
- Base table is created in `20260309000004_phase2_shopping_lists.sql`.
- Effective current schema also includes `category_id uuid references public.categories on delete set null`, added in `20260310000005_phase3_categories_stores.sql`.
- Table is on the `supabase_realtime` publication already, so any schema change here affects the hot path for active list rows.
- RLS is household-scoped through `list_id -> lists.household_id`.

### `household_item_memory`
- Defined in `20260312190000_phase11_household_item_memory.sql`.
- Table stores remembered item name/category state per household, keyed by `(household_id, normalized_name)`.
- It is written by `public.upsert_household_item_memory(...)`, which is invoked from `public.sync_household_item_memory()` triggers on `public.list_items`.
- Current writes explicitly target a column list. That is important: adding nullable columns does not require changing the function just to keep existing inserts working.

## Standard Stack
- Use one new forward-only Supabase SQL migration under [`supabase/migrations`](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations).
- Use plain Postgres `alter table ... add column ... text` statements.
- Validate with direct schema inspection queries against Postgres/Supabase after the migration is applied.
- Keep application code, triggers, RPC signatures, and DTOs out of Phase 17 unless verification proves a compile/runtime dependency.

## Architecture Patterns

### 1. Expand-only migration
- This phase should be a pure expand step:
  - add columns
  - do not populate them
  - do not tighten constraints
  - do not modify read/write paths yet
- That matches the roadmap dependency chain: Phase 17 prepares the schema, Phase 19 writes cache metadata, and Phase 20 surfaces it in client-facing rows.

### 2. Preserve write compatibility on live tables
- `list_items` and `household_item_memory` are active tables with existing trigger activity.
- Because the new columns are nullable and existing insert/update statements use explicit target columns, current writes remain valid without function changes.
- The planning target is therefore "non-breaking schema extension," not "schema + trigger refactor."

### 3. Keep naming aligned with downstream semantics
- `barcode_product_cache.image_url` mirrors the provider payload concept directly.
- `list_items.product_image_url` and `household_item_memory.product_image_url` keep the column meaning explicit at the row level and avoid ambiguity with future recipe/admin image fields.
- `brand` should stay `text` everywhere for consistency with the Phase 19/20 pipeline.

### 4. Defer propagation logic
- Phase 17 should not attempt to copy values from cache into list rows or household memory.
- Population belongs to the application/data-flow phases:
  - Phase 19: barcode cache enrichment and DTO transport
  - Phase 20: list-item and memory writes plus UI rendering

## Don't Hand-Roll
- Do not hand-roll URL validation, brand normalization, or payload parsing in this migration.
- Do not hand-roll backfill logic inside the schema migration transaction.
- Do not hand-roll trigger rewrites "just in case" for `sync_household_item_memory` or `upsert_household_item_memory`; adding nullable columns does not require it.
- Do not hand-roll new indexes before real query patterns exist.
- Do not hand-roll RLS updates for the new columns; existing table-level policies already govern row access.

## Common Pitfalls
- Treating the Phase 2 `list_items` file as the full current schema. Planning must account for the later `category_id` column added in Phase 3 because Phase 11 trigger logic already depends on it.
- Expanding scope into Phase 19/20 by updating DTOs, edge functions, or Svelte components here. That creates unnecessary coupling and turns an infrastructure phase into a cross-stack rollout.
- Assuming `household_item_memory` writes need to populate the new columns immediately. They can remain `NULL` until later phases introduce a real metadata source.
- Adding defaults such as empty string. That would blur the meaning of "metadata not yet known" versus "known but empty."
- Adding indexes on `brand` or image columns prematurely. Current requirements do not justify the write/read cost.

## Validation Architecture
- A validation architecture section is warranted for this phase because the work is infrastructure-only. There is no user-facing behavior to verify; the phase passes or fails based on schema shape and non-regression of existing write paths.
- Validation should be split into two layers:

### Schema validation
- Confirm all six columns exist with the expected names, table targets, type `text`, and `is_nullable = YES`.
- Confirm no unexpected default values were introduced.

### Compatibility validation
- Confirm existing trigger-driven writes still succeed:
  - insert a `list_items` row through the normal schema path
  - verify `household_item_memory` still upserts successfully
  - update `list_items.name` or `category_id` and verify the trigger still runs
- Confirm no RLS or publication changes were introduced as part of the migration.

- For planning purposes, this means the phase should include explicit post-migration verification steps, not just "migration file exists."

## Planning Implications
- The plan can likely stay to a single implementation task plus verification, unless the team prefers a separate verification task for discipline.
- The migration should touch only one new SQL file; existing migration files should remain immutable.
- The migration order must be after the existing March 12 Phase 11 migration so all currently assumed tables/functions already exist.
- Documentation in the phase plan should explicitly call out Phase 19/20 as downstream consumers of these columns so later work does not rename fields ad hoc.

## Code Examples

```sql
alter table public.barcode_product_cache
  add column image_url text,
  add column brand text;

alter table public.household_item_memory
  add column product_image_url text,
  add column brand text;

alter table public.list_items
  add column product_image_url text,
  add column brand text;
```

```sql
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'barcode_product_cache' and column_name in ('image_url', 'brand'))
    or (table_name in ('household_item_memory', 'list_items') and column_name in ('product_image_url', 'brand'))
  )
order by table_name, column_name;
```

## Recommended Research Conclusions
- Phase 17 should be planned as a minimal, single-migration expand step.
- No trigger, function, RPC, or RLS edits are required unless actual migration verification exposes an unexpected dependency.
- The critical verification target is not UI behavior; it is "existing writes still succeed and the six new nullable text columns exist exactly as specified."

## References
- [`17-CONTEXT.md`](C:/Users/HP/Documents/Koding/HandleAppen/.planning/phases/17-schema-migrations/17-CONTEXT.md)
- [`REQUIREMENTS.md`](C:/Users/HP/Documents/Koding/HandleAppen/.planning/REQUIREMENTS.md)
- [`STATE.md`](C:/Users/HP/Documents/Koding/HandleAppen/.planning/STATE.md)
- [`20260309000004_phase2_shopping_lists.sql`](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260309000004_phase2_shopping_lists.sql)
- [`20260310000005_phase3_categories_stores.sql`](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260310000005_phase3_categories_stores.sql)
- [`20260310000006_phase4_barcode_cache.sql`](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260310000006_phase4_barcode_cache.sql)
- [`20260312190000_phase11_household_item_memory.sql`](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260312190000_phase11_household_item_memory.sql)
