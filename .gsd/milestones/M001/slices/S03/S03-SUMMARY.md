---
id: S03
parent: M001
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
# S03: Store Layouts And Category Ordering

**# Phase 3 Plan 1: Database and onboarding foundation Summary**

## What Happened

# Phase 3 Plan 1: Database and onboarding foundation Summary

**Phase 3 database foundation with household-scoped category/store tables, seeded Norwegian default categories, and skipped Playwright coverage scaffolding**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-10T19:31:52+01:00
- **Completed:** 2026-03-10T19:39:16+01:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added the Phase 3 Supabase migration for `categories`, `stores`, `store_layouts`, `list_items.category_id`, RLS policies, realtime publication, and `seed_default_categories`.
- Added Wave 0 Playwright coverage scaffolding with skipped category tests and admin helpers for categories and stores.
- Wired `seed_default_categories` into the onboarding household-creation flow and refreshed generated database types so the RPC compiles cleanly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Phase 3 database migration** - `3eb0bd8` (feat)
2. **Task 2: Create Wave 0 Playwright test scaffold** - `0895e61` (test)
3. **Task 3: Wire seed_default_categories into the onboarding flow** - `fa3f13a` (feat)

## Files Created/Modified
- `supabase/migrations/20260310000005_phase3_categories_stores.sql` - Phase 3 schema, RLS, realtime, and seed RPC.
- `tests/helpers/categories.ts` - Service-role admin helpers for categories and stores.
- `tests/categories.spec.ts` - Skipped Wave 0 category/store layout Playwright spec.
- `src/routes/velkommen/+page.server.ts` - Calls `seed_default_categories` after a new household is inserted.
- `src/lib/types/database.ts` - Regenerated Supabase types for new tables and RPC signatures.
- `.planning/phases/03-store-layouts-and-category-ordering/deferred-items.md` - Captures pre-existing out-of-scope verification failures.

## Decisions Made
- Seed failures during onboarding are non-fatal and logged for observability, matching the plan’s recovery requirement.
- Local schema verification used `supabase db push --local` because the repo is not linked to a remote Supabase project.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched migration application to local Supabase mode**
- **Found during:** Task 1 (Create Phase 3 database migration)
- **Issue:** `npx supabase db push` failed because the repo is not linked to a remote project.
- **Fix:** Applied the migration with `npx supabase db push --local` and verified the created objects directly through the local Postgres container.
- **Files modified:** none
- **Verification:** `npx supabase db diff --local --schema public`; direct `docker exec ... psql` checks for tables, `category_id`, RPC, and realtime publication.
- **Committed in:** `3eb0bd8`

**2. [Rule 3 - Blocking] Regenerated database types after adding seed RPC**
- **Found during:** Task 3 (Wire seed_default_categories into the onboarding flow)
- **Issue:** `supabase.rpc('seed_default_categories', ...)` failed TypeScript because generated Supabase types did not include the new RPC or schema additions.
- **Fix:** Regenerated `src/lib/types/database.ts` from the local Supabase instance.
- **Files modified:** `src/lib/types/database.ts`
- **Verification:** `npx tsc --noEmit` no longer reports any error in `src/routes/velkommen/+page.server.ts` for `seed_default_categories`.
- **Committed in:** `fa3f13a`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to complete the planned work locally. No architectural scope change.

## Issues Encountered
- `npx playwright test tests/auth.spec.ts` still fails in existing login/logout flows before category seeding becomes relevant. Logged to `deferred-items.md`.
- `npx tsc --noEmit` still reports pre-existing generic typing errors in `src/lib/queries/items.ts` and `src/lib/queries/lists.ts`. Logged to `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 follow-up plans can now assume the category/store schema exists locally, new households get seeded categories, and category test files/helpers already exist.
- Before using full-project `tsc` or auth-suite results as hard gates in later plans, the deferred query typing and auth-flow failures should be cleared.

## Self-Check: PASSED

- Found `supabase/migrations/20260310000005_phase3_categories_stores.sql`
- Found `tests/categories.spec.ts`
- Found `tests/helpers/categories.ts`
- Found `src/routes/velkommen/+page.server.ts`
- Found `src/lib/types/database.ts`
- Found commits `3eb0bd8`, `0895e61`, and `fa3f13a`

---
*Phase: 03-store-layouts-and-category-ordering*
*Completed: 2026-03-10*

# Phase 3 Plan 2: Store-ordered categorized list view Summary

**Categorized shopping list UI with Norwegian section headers, uncategorized fallback grouping, and a session-only store selector that swaps category order** 

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-10T19:40:00+01:00
- **Completed:** 2026-03-10T19:50:10+01:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added category and store layout query factories, plus `category_id` support in list item query results and optimistic items.
- Refactored the list detail page to render active items under category headers, hide empty categories, and place uncategorized items in `Andre varer`.
- Added a `Butikk` selector bottom sheet and enabled focused Playwright coverage for category grouping and default ordering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add category_id to items query + create categories/store-layout query factories** - `d45609c` (feat)
2. **Task 2: Refactor list view with category grouping and StoreSelector** - `7c882e6` (feat)

## Files Created/Modified
- `src/lib/queries/categories.ts` - Category and store-layout query factories for ordered grouping.
- `src/lib/queries/stores.ts` - Minimal stores query factory needed to populate the store selector.
- `src/lib/queries/items.ts` - Adds `category_id` to list item reads and optimistic inserts.
- `src/lib/queries/lists.ts` - Fixes shared mutation typings so `npx tsc --noEmit` passes.
- `src/lib/components/items/CategorySection.svelte` - Renders section headers and grouped item rows inside the continuous card.
- `src/lib/components/stores/StoreSelector.svelte` - Bottom-sheet store picker with session-only selection state.
- `src/routes/(protected)/lister/[id]/+page.svelte` - Wires queries, grouping derivation, and selector UI into the list detail view.
- `tests/categories.spec.ts` - Replaces the first two skipped tests with real grouping and default-order checks.
- `tests/helpers/categories.ts` - Adds category listing helper for seeded household data.
- `tests/helpers/lists.ts` - Extends item seeding helper with optional `category_id`.

## Decisions Made
- Fixed the pre-existing Svelte Query mutation generic signatures in the shared query files because this plan’s verification gate requires a clean TypeScript compile.
- Added `src/lib/queries/stores.ts` as a minimal compatibility query under Rule 3 so the planned page import could compile before later store-management work lands.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing shared query mutation typings**
- **Found during:** Task 1 (Add category_id to items query + create categories/store-layout query factories)
- **Issue:** `npx tsc --noEmit` failed on existing `createMutation` signatures in `src/lib/queries/items.ts` and `src/lib/queries/lists.ts`, blocking the plan’s compile gate.
- **Fix:** Added explicit local row/variable/context types and typed `createMutation`/query cache interactions so the shared query layer compiles cleanly.
- **Files modified:** `src/lib/queries/items.ts`, `src/lib/queries/lists.ts`
- **Verification:** `npx tsc --noEmit`
- **Committed in:** `d45609c`

**2. [Rule 3 - Blocking] Added minimal stores query factory**
- **Found during:** Task 2 (Refactor list view with category grouping and StoreSelector)
- **Issue:** The plan required importing `createStoresQuery` from `$lib/queries/stores`, but that file/export did not exist in the branch yet.
- **Fix:** Added `src/lib/queries/stores.ts` with a household-scoped stores query for the selector.
- **Files modified:** `src/lib/queries/stores.ts`, `src/routes/(protected)/lister/[id]/+page.svelte`
- **Verification:** `npx tsc --noEmit`; `npx playwright test tests/categories.spec.ts -g "category grouping|default order" --reporter=list`
- **Committed in:** `7c882e6`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to execute the planned work locally. No architectural scope change.

## Issues Encountered
- `npx playwright test --reporter=list` still fails in pre-existing auth/household flows (`tests/auth.spec.ts`, `tests/household.spec.ts`) and an existing list-delete timeout in `tests/lists.spec.ts`. The plan-specific category tests passed and no category regressions were observed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The list detail page now exposes the core category-grouping behavior needed for store layout refinement and future category assignment flows.
- Remaining full-suite failures are logged as deferred work and should be cleared before using the full Playwright suite as a hard release gate.

## Self-Check: PASSED

- Found `.planning/phases/03-store-layouts-and-category-ordering/03-02-SUMMARY.md`
- Found commits `d45609c` and `7c882e6`

---
*Phase: 03-store-layouts-and-category-ordering*
*Completed: 2026-03-10*

# Phase 03 Plan 03: Butikker Layouts and Category CRUD Summary

**Butikker navigation, per-store drag ordering, and default category CRUD with Realtime invalidation are now live for store-specific shopping layouts.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-03-10T18:57:13Z
- **Completed:** 2026-03-10T19:31:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Activated the Butikker tab and shipped the store list flow, including standard-layout entry and add/delete store actions.
- Added per-store category reordering backed by `svelte-dnd-action` and persisted `store_layouts` updates.
- Added default category drag ordering, add/rename/delete flows, Realtime invalidation, and Playwright coverage for the new store/category screens.

## Task Commits

Each task was committed atomically where code changed:

1. **Task 1: Install svelte-dnd-action, create stores.ts (queries + mutations), activate Butikker tab** - `06f9252` (`feat`)
2. **Task 2: Build Butikker tab routes (store list, per-store reorder, standard layout + CRUD)** - `03526f8` (`feat`)
3. **Task 3: Human verification checkpoint** - Approved by user (`approved`), no code commit

**Plan metadata:** Pending final docs commit

## Files Created/Modified
- `package.json` - Adds `svelte-dnd-action` for drag-to-reorder interactions.
- `src/lib/queries/stores.ts` - Centralizes store queries plus store/category CRUD and reorder mutations.
- `src/lib/components/lists/BottomNav.svelte` - Activates the Butikker tab and routes it to `/butikker`.
- `src/lib/components/stores/StoreRow.svelte` - Renders tappable store cards with delete affordance.
- `src/lib/components/stores/DraggableCategoryRow.svelte` - Renders draggable category rows with optional rename controls and grip handle touch behavior.
- `src/routes/(protected)/butikker/+page.svelte` - Implements the Butikker landing screen and store creation flow.
- `src/routes/(protected)/butikker/[id]/+page.svelte` - Implements per-store category reordering.
- `src/routes/(protected)/butikker/standard/+page.svelte` - Implements default layout CRUD and drag ordering with Realtime invalidation.
- `tests/categories.spec.ts` - Covers store layout navigation and category CRUD flows.

## Decisions Made
- Per-store layout screens remain reorder-only; category editing stays centralized in `Standard rekkefolge` to keep store overrides focused on ordering.
- New category creation immediately creates `store_layouts` rows for existing stores so every store inherits the new category without manual repair.
- Human verification approval was recorded as the gate completion for Task 3 after the UI and persistence checks passed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for `03-04` to add per-item category assignment on top of the completed category/store layout foundation.
- No new blockers were introduced by this plan.

## Self-Check: PASSED

- Verified `.planning/phases/03-store-layouts-and-category-ordering/03-03-SUMMARY.md` exists.
- Verified task commits `06f9252` and `03526f8` exist in `git log --oneline --all`.

---
*Phase: 03-store-layouts-and-category-ordering*
*Completed: 2026-03-10*

# Phase 03 Plan 04: Item Category Assignment Summary

**List rows now support post-add category picking and long-press item editing with optimistic recategorization across grouped store-layout sections.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-10T20:20:00+01:00
- **Completed:** 2026-03-10T20:45:27+01:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added optimistic `assign category` and `update item` mutations so category/name/quantity edits update the grouped list immediately.
- Added a 500 ms long-press interaction on item rows that opens an item detail sheet without delaying normal tap-to-check behavior.
- Added an auto-opening category picker after item creation and Playwright coverage for skip, assign, and long-press flows.

## Task Commits

Each task was committed atomically where code changed:

1. **Task 1: Add assignCategoryMutation + long-press to ItemRow** - `a03bb87` (`feat`)
2. **Task 2: Build CategoryPickerModal and ItemDetailSheet; wire into list view** - `64f72e2` (`feat`)

**Plan metadata:** Pending final docs commit

## Files Created/Modified
- `src/lib/queries/items.ts` - Adds optimistic category assignment and item update mutations.
- `src/lib/components/items/ItemRow.svelte` - Adds long-press detection while preserving fast tap check-off and swipe-delete coexistence.
- `src/lib/components/items/CategoryPickerModal.svelte` - Adds the post-create category bottom sheet with skip behavior.
- `src/lib/components/items/ItemDetailSheet.svelte` - Adds the long-press item edit sheet for name, quantity, and category.
- `src/lib/components/items/CategorySection.svelte` - Passes the selected item through to the long-press handler.
- `src/routes/(protected)/lister/[id]/+page.svelte` - Wires pending-category and detail-sheet state plus the new mutations into the list page.
- `tests/categories.spec.ts` - Covers modal appearance, immediate group movement, and long-press editing affordances.
- `tests/items.spec.ts` - Updates item tests to dismiss the new category step in uncategorized add flows.

## Decisions Made
- The pending category modal is opened from `addItemMutation` success so it targets the persisted item id instead of an optimistic placeholder.
- Long-press cancels on movement beyond the swipe threshold and blocks the click only after a successful long-press, keeping tap-to-check unchanged.
- Category picker and detail sheet components are conditionally rendered only when active to avoid hidden dialog DOM affecting the list surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prevented hidden dialog content from polluting list assertions**
- **Found during:** Task 2 (Build CategoryPickerModal and ItemDetailSheet; wire into list view)
- **Issue:** Always-mounted dialog components introduced duplicate hidden category text in the DOM and made an existing category grouping test ambiguous.
- **Fix:** Conditionally mounted the category picker and detail sheet only while active, and tightened the category header assertion to target section headers directly.
- **Files modified:** `src/routes/(protected)/lister/[id]/+page.svelte`, `tests/categories.spec.ts`
- **Verification:** `npx playwright test tests/categories.spec.ts tests/items.spec.ts --reporter=list`
- **Committed in:** `64f72e2` (part of task commit)

**2. [Rule 1 - Bug] Updated existing item tests for the new mandatory post-add category prompt**
- **Found during:** Task 2 (Build CategoryPickerModal and ItemDetailSheet; wire into list view)
- **Issue:** The new category picker intentionally opened after uncategorized item adds and blocked legacy tests from clicking the list row afterward.
- **Fix:** Dismissed the picker via `Hopp over` in existing uncategorized item tests so they reflect the current UX while preserving their original assertions.
- **Files modified:** `tests/items.spec.ts`
- **Verification:** `npx playwright test tests/categories.spec.ts tests/items.spec.ts --reporter=list`
- **Committed in:** `64f72e2` (part of task commit)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both fixes were direct consequences of the new category-assignment UX and were necessary to keep the existing list behavior and tests consistent.

## Issues Encountered

- The plan-level TypeScript and targeted Playwright gates passed, but the full Playwright suite still reports pre-existing failures in `tests/auth.spec.ts` and `tests/lists.spec.ts`. These were logged to `deferred-items.md` because they are outside the category-assignment surface changed by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- List-level item categorization is ready for downstream barcode- or suggestion-based category assignment work.
- Remaining full-suite failures are unrelated auth/list tests and should be addressed separately before treating the overall e2e suite as healthy.

## Self-Check: PASSED

- Verified `.planning/phases/03-store-layouts-and-category-ordering/03-04-SUMMARY.md` exists.
- Verified task commits `a03bb87` and `64f72e2` exist in `git log --oneline --all`.

---
*Phase: 03-store-layouts-and-category-ordering*
*Completed: 2026-03-10*
