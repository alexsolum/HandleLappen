---
phase: 17
slug: schema-migrations
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Svelte Check 4.4.2 plus manual Postgres schema inspection |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run check`
- **Before `$gsd-verify-work`:** `npm run check` must be green and migration smoke evidence must be recorded
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | schema-expand | static | `npm run check` | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | schema-compat, schema-read-safety, schema-nonregression | manual-db | `npm run check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers this phase. No new test harness files are required because Phase 17 is schema-only and relies on `npm run check` plus manual database smoke validation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| New columns exist on `barcode_product_cache`, `household_item_memory`, and `list_items` with `text` type, nullable, and no defaults | schema-expand | Requires querying the migrated database schema | Apply the migration on a disposable Supabase branch or local database, then query `information_schema.columns` for the six new columns and confirm `is_nullable = YES` with `column_default = NULL` |
| Trigger-backed writes still succeed after the migration | schema-compat | The project has no automated database integration test for trigger execution | In an isolated migrated database, create or reuse one household fixture, one list fixture owned by that household, and one category fixture if category-update coverage is used. Insert one `list_items` row with the minimal valid columns (`list_id`, `name`, optional `quantity`) and assert `household_item_memory` contains a row for the normalized item name and matching household. Update the inserted row's `name` and optionally `category_id`, then assert the remembered row updates as expected without trigger errors |
| Existing list rows remain readable with null new columns | schema-read-safety | Current repo tests do not execute a migrated database read path | Seed or identify one pre-existing-style `list_items` row whose new columns remain `NULL`, read it back through the same SQL/select shape the app uses today, and confirm the row still resolves without DTO or rendering assumptions requiring non-null `product_image_url` or `brand` |
| Existing indexes and constraints on touched tables are preserved | schema-nonregression | Requires inspecting Postgres catalog metadata after migration | After applying the migration, query `pg_indexes` and `pg_constraint` for `barcode_product_cache`, `household_item_memory`, and `list_items`, then compare the result against the pre-migration baseline from current schema files to confirm no prior index or constraint disappeared or changed unexpectedly |

---

## Manual Verification Status

- **Schema expansion**: completed via code review in this session; columns are defined and documented in `supabase/migrations/20260314000000_phase17_schema_migrations.sql`.
- **Trigger compatibility & null-safe reads**: blocked because the execution environment cannot reach a Supabase branch/local Postgres. Run the documented SQL steps once a disposable database is available, then capture the results (info_schema queries, insert/update flows, `pg_indexes`/`pg_constraint` diff) in the execution summary.
- **Index/constraint non-regression**: same blockage as above; compare catalog metadata after the migration can run once DB access is restored.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-14
