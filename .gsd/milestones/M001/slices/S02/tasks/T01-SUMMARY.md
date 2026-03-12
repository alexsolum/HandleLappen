---
id: T01
parent: S02
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T01: Plan 01

**# Phase 2 Plan 01: Database Schema, TanStack Query, and Test Scaffolds Summary**

## What Happened

# Phase 2 Plan 01: Database Schema, TanStack Query, and Test Scaffolds Summary

**One-liner:** PostgreSQL schema for lists/list_items/item_history with household-scoped RLS + TanStack Query v6 mounted in protected layout + Wave 0 Playwright stub specs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Database migration and TypeScript types | b36dce3 | supabase/migrations/20260309000004_phase2_shopping_lists.sql, src/lib/types/database.ts |
| 2 | TanStack Query setup in protected layout | 186d7a9 | src/routes/(protected)/+layout.svelte, package.json, package-lock.json |
| 3 | Test scaffolds (Wave 0 — stub specs and list helper) | dd8a5f7 | tests/helpers/lists.ts, tests/lists.spec.ts, tests/items.spec.ts, tests/realtime.spec.ts |

## What Was Built

### Database Schema (Migration 20260309000004)

Three new tables added to the Supabase database:

- **`public.lists`** — shopping lists scoped to a household, with a cascade-delete relationship to `households`
- **`public.list_items`** — items within a list, with `is_checked`, `quantity` (integer), `sort_order`, and `checked_at` columns; two indexes for efficient list queries and checked/unchecked queries
- **`public.item_history`** — write-only audit table recording when items are checked off, preserving item_name even after item deletion; `checked_by` references `auth.users`

All three tables have RLS enabled. Policies use `public.my_household_id()` (the Phase 1 SECURITY DEFINER function) for household scoping. The `lists` and `list_items` tables are registered in the `supabase_realtime` publication. `item_history` is intentionally excluded — no realtime reads needed in Phase 2.

### TypeScript Types (database.ts)

Row/Insert/Update/Relationships types for `lists`, `list_items`, and `item_history` added to the `public.Tables` object, consistent with the existing `households` and `profiles` entry style.

### TanStack Query Provider (protected layout)

`@tanstack/svelte-query@6.1.0` installed. Protected layout rewritten to:
- Instantiate `QueryClient` inside the component body (not module level) to avoid SSR data leakage between sessions
- Set `enabled: browser` as a default query option so SSR never executes queries
- Wrap all content in `<QueryClientProvider client={queryClient}>`
- Remove the logout button (moved to Husstand tab in plan 02-02)
- Add `pb-16` to main area to prevent content being hidden behind the bottom nav (coming in 02-02)

### Wave 0 Test Scaffolds

- **`tests/helpers/lists.ts`** — admin-client helper with `createTestList`, `createTestItem`, `deleteTestList`; follows the same pattern as `tests/helpers/auth.ts`
- **`tests/lists.spec.ts`** — 2 skipped stubs for LIST-01 (create list) and LIST-02 (delete list)
- **`tests/items.spec.ts`** — 4 skipped stubs for LIST-03 through LIST-05 and HIST-01
- **`tests/realtime.spec.ts`** — 1 skipped stub for LIST-06 two-context realtime test

All 7 stub tests pass (skipped) in Playwright; `npm run build` exits 0.

## Verification Results

- `npm run build`: passed (exit 0)
- Playwright stubs: 7 skipped, 0 failed
- Migration file: exists at correct path
- TypeScript types: all three tables present in database.ts
- `@tanstack/svelte-query`: appears in package.json dependencies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Playwright --project=chromium flag rejected**
- **Found during:** Task 3 verification
- **Issue:** The playwright.config.ts has no named projects; the default project has no name. Running with `--project=chromium` failed with "Project(s) 'chromium' not found."
- **Fix:** Ran the verification command without the `--project=chromium` flag. All stubs ran successfully.
- **Files modified:** None — verification approach adjusted only.

## Self-Check: PASSED

Files exist:
- supabase/migrations/20260309000004_phase2_shopping_lists.sql: FOUND
- src/lib/types/database.ts (updated): FOUND
- src/routes/(protected)/+layout.svelte (updated): FOUND
- tests/helpers/lists.ts: FOUND
- tests/lists.spec.ts: FOUND
- tests/items.spec.ts: FOUND
- tests/realtime.spec.ts: FOUND

Commits exist:
- b36dce3: feat(02-01): add Phase 2 database schema and TypeScript types
- 186d7a9: feat(02-01): install TanStack Query and wrap protected layout in QueryClientProvider
- dd8a5f7: feat(02-01): add Wave 0 test scaffolds and list admin helper
