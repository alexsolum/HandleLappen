---
phase: 03-store-layouts-and-category-ordering
plan: 02
subsystem: ui
tags: [svelte, tanstack-query, supabase, playwright, store-layouts]
requires:
  - phase: 03-store-layouts-and-category-ordering
    provides: Phase 3 schema, seeded default categories, category Playwright helpers
provides:
  - Categorized list detail view with Norwegian category headers
  - Session-scoped store selector and store-order-aware grouping
  - Category and store query factories with focused Playwright coverage
affects: [category-grouping, store-layouts, list-detail, testing]
tech-stack:
  added: []
  patterns: [Svelte derived grouping from TanStack Query data, session-only store selection via dialog sheet]
key-files:
  created:
    - src/lib/queries/categories.ts
    - src/lib/queries/stores.ts
    - src/lib/components/items/CategorySection.svelte
    - src/lib/components/stores/StoreSelector.svelte
  modified:
    - src/lib/queries/items.ts
    - src/lib/queries/lists.ts
    - src/routes/(protected)/lister/[id]/+page.svelte
    - tests/categories.spec.ts
    - tests/helpers/categories.ts
    - tests/helpers/lists.ts
key-decisions:
  - "Shared Svelte Query mutation typings were fixed inline so this plan could satisfy its TypeScript compile gate."
  - "Store selection stays session-only in +page.svelte state and is exposed through a native dialog bottom sheet."
patterns-established:
  - "List detail grouping derives active sections from categories or store layouts and appends uncategorized items as 'Andre varer'."
  - "Focused category Playwright tests seed household categories via admin helpers and assert DOM order directly from rendered section headers."
requirements-completed: [CATG-01, CATG-02]
duration: 10min
completed: 2026-03-10
---

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
