---
phase: 17-schema-migrations
plan: 01
type: execute
wave: 1
depends_on:
  - 16-dark-mode-and-user-settings
files_modified:
  - supabase/migrations/20260314000000_phase17_schema_migrations.sql
  - .planning/phases/17-schema-migrations/17-VALIDATION.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "Nullable `image_url` and `brand` columns exist on `barcode_product_cache` so cached scan results can later include enrichment metadata."
    - "`household_item_memory` and `list_items` both expose `product_image_url` and `brand` without defaults so triggers and existing rows remain stable."
    - "No existing indexes or constraints on the touched tables are disrupted; the migrations run safely on production data."
    - "Post-migration verification proves existing trigger-backed `list_items` writes still succeed after the schema expands."
    - "New columns are documented for the follow-up enrichment phases (Phase 19/20) as the schema they expect."
  artifacts:
    - path: "supabase/migrations/20260314000000_phase17_schema_migrations.sql"
      provides: "ALTER TABLE statements adding the four nullable columns and a brief migration comment linking to ENRICH/DISP phases."
    - path: ".planning/phases/17-schema-migrations/17-VALIDATION.md"
      provides: "Nyquist validation contract covering schema inspection and trigger-compatibility smoke checks."
    - path: ".planning/phases/17-schema-migrations/17-CONTEXT.md"
      provides: "Phase boundary, locked decisions, and integration references for schema changes."
    - path: ".planning/phases/17-schema-migrations/17-RESEARCH.md"
      provides: "Research notes on the migration scope and downstream dependencies."
  key_links:
    - from: "supabase/migrations/20260310000006_phase4_barcode_cache.sql"
      to: "supabase/migrations/20260314000000_phase17_schema_migrations.sql"
      via: "add image_url + brand columns to the existing cache table"
    - from: "supabase/migrations/20260312190000_phase11_household_item_memory.sql"
      to: "supabase/migrations/20260314000000_phase17_schema_migrations.sql"
      via: "extend household item memory with product metadata columns that mirror the list item additions"
    - from: "supabase/migrations/20260309000004_phase2_shopping_lists.sql"
      to: "supabase/migrations/20260314000000_phase17_schema_migrations.sql"
      via: "extend list rows with product metadata columns without altering existing behavior"
---

<objective>
Add the nullable enrichment columns that downstream phases will populate so that Phase 19/20 have the schema they depend on.
</objective>

<execution_context>
@C:/Users/HP/.codex/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/17-schema-migrations/17-CONTEXT.md
@.planning/phases/17-schema-migrations/17-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Phase 17 migration adding nullable enrichment columns</name>
  <files>
    supabase/migrations/20260314000000_phase17_schema_migrations.sql
  </files>
  <action>
Add a new migration file that:
1. Alters `barcode_product_cache` to add `image_url text NULL` and `brand text NULL`.
2. Alters `household_item_memory` to add `product_image_url text NULL` and `brand text NULL`, keeping the existing trigger/functions untouched because current writes use explicit target columns and can continue leaving the new columns `NULL`.
3. Alters `list_items` to add the same `product_image_url`/`brand` columns so shopping list rows carry the metadata later.
4. Includes short comments describing these additions as prerequisites for the ENRICH and DISP phases and noting their nullable nature.
Ensure the migration uses a timestamped filename that runs after previous migrations and document the new file in Phase 17 notes.
  </action>
  <verify>
    <automated>npm run check</automated>
  </verify>
  <done>The new Phase 17 migration exists, runs without schema/load errors, and leaves the four columns ready for future writes.</done>
</task>

<task type="manual">
  <name>Task 2: Verify schema shape and trigger compatibility on an isolated database</name>
  <files>
    supabase/migrations/20260314000000_phase17_schema_migrations.sql
    .planning/phases/17-schema-migrations/17-VALIDATION.md
  </files>
  <action>
Apply the migration to a disposable Supabase branch or equivalent local dev database, then:
1. Query `information_schema.columns` to confirm all six new columns exist with `data_type = text`, `is_nullable = YES`, and no defaults.
2. Create or reuse a household fixture plus one `lists` row for that household, then insert one `list_items` row with the minimal valid columns (`list_id`, `name`, optional `quantity`) and assert `sync_household_item_memory` creates or updates the normalized remembered row for that household.
3. Update the inserted row's `name` and, if fixture setup includes a category, `category_id`; assert the trigger-backed update path still succeeds and that the remembered row reflects the expected latest display/category state.
4. Read back at least one pre-existing-style `list_items` row with `product_image_url` and `brand` still `NULL` using the same column selection shape the app currently relies on, and confirm the row remains consumable without requiring non-null values.
5. Query `pg_indexes` and `pg_constraint` for `barcode_product_cache`, `household_item_memory`, and `list_items`, then compare the results to the pre-migration schema baseline so the execution record proves no existing index or constraint was dropped or altered.
6. Store the exact SQL fixture/setup and assertion queries in the execution summary or referenced evidence so later verification can cite concrete, reproducible checks.
  </action>
  <verify>
    <automated>npm run check</automated>
  </verify>
  <done>The migration has isolated-database proof that the new nullable columns exist as designed, existing `list_items` rows remain null-safe to read, trigger-backed writes remain compatible, and prior indexes/constraints are unchanged.</done>
</task>

</tasks>

<must_have_self_check>
- Migration only adds nullable columns; no data backfill or non-null defaults are introduced.
- The new migration docs reference Phase 19/20 so follow-up work knows why the columns exist.
- `npm run check` passes after the SQL-only change (ensures no schema tooling regression).
- Execution includes isolated database evidence that existing trigger-backed writes on `list_items` still succeed after the schema expands.
</must_have_self_check>
