---
phase: 14-recipes
plan: 05
subsystem: ui
tags: [svelte, supabase, tanstack-query, household-item-memory, recipes, category-assignment]

# Dependency graph
requires:
  - phase: 14-03
    provides: recipe detail page with handleAddToList using createAddOrIncrementItemMutation
  - phase: 11-household-item-memory-and-suggestions
    provides: searchRememberedItems and household_item_memory with lastCategoryId
provides:
  - category carry-through from recipe ingredients to shopping list items at insert time
  - AddOrIncrementItemVariables with optional categoryId field
affects: [recipe-add-to-list, list-item-ordering, store-layout-sorting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Category carry-through: look up remembered item before mutateAsync, pass categoryId so insert row gets correct category_id"
    - "searchRememberedItems used as one-off async lookup (not a reactive TanStack Query) inside an event handler"

key-files:
  created: []
  modified:
    - src/lib/queries/items.ts
    - src/routes/(protected)/oppskrifter/[id]/+page.svelte

key-decisions:
  - "Category carry-through resolves at add-time via searchRememberedItems per ingredient — no schema changes or new tables required"
  - "Increment path (existing unchecked item on list) intentionally leaves category_id untouched — only the insert path receives the looked-up category"

patterns-established:
  - "One-off memory lookup before mutation: await searchRememberedItems, take first result's lastCategoryId, pass to mutateAsync"

requirements-completed: [RECPE-02, RECPE-06, RECPE-07]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 14 Plan 05: Category Carry-Through for Recipe Ingredients Summary

**Category_id now populated from household_item_memory when recipe ingredients are added to a shopping list, ensuring store-layout ordering applies instead of landing under "Andre varer"**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T07:09:25Z
- **Completed:** 2026-03-14T07:17:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `AddOrIncrementItemVariables` type with `categoryId?: string | null` (backwards-compatible)
- Fixed `createAddOrIncrementItemMutation` insert payload to include `category_id: categoryId ?? null`
- Updated `handleAddToList` in recipe detail page to call `searchRememberedItems` per ingredient and forward `categoryId` to `mutateAsync`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AddOrIncrementItemVariables and fix insert payload** - `54f19ec` (feat)
2. **Task 2: Look up remembered category in handleAddToList** - `65f1d03` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/queries/items.ts` - Added `categoryId?: string | null` to `AddOrIncrementItemVariables`; destructured in `mutationFn`; added `category_id: categoryId ?? null` to `.insert()` payload
- `src/routes/(protected)/oppskrifter/[id]/+page.svelte` - Imported `searchRememberedItems`; updated loop in `handleAddToList` to look up remembered category per ingredient before calling `mutateAsync`

## Decisions Made

- Category carry-through resolves at add-time via `searchRememberedItems` per ingredient — no schema changes, no new dependencies, no new tables required. Two file edits suffice.
- Increment path (item already on list) intentionally left unchanged — `category_id` is only applied on new inserts, consistent with the original plan spec.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `src/lib/barcode/scanner.ts` and `tests/item-memory.spec.ts` are unrelated to this plan and were not introduced by these changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Category carry-through gap is closed. Recipe ingredients added to a shopping list will now carry `category_id` from `household_item_memory`, enabling correct store-layout section grouping.
- Human verification still needed (per 14-VERIFICATION.md): confirm a recipe ingredient with a known remembered category appears under the correct section header, not under "Andre varer".
- Phase 14 gap-closure complete.

---
*Phase: 14-recipes*
*Completed: 2026-03-14*
