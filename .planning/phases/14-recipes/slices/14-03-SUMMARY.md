---
phase: 14-recipes
plan: "03"
subsystem: ui
tags: [svelte, tanstack-query, playwright, typescript, bottom-sheet]

# Dependency graph
requires:
  - phase: 14-recipes
    plan: "01"
    provides: recipes + recipe_ingredients tables, TypeScript types, createRecipeDetailQuery, createDeleteRecipeMutation, createAddOrIncrementItemMutation
  - phase: 14-recipes
    plan: "02"
    provides: build-clean query layer, fixed createDeleteRecipeMutation accessor pattern

provides:
  - Recipe detail page at /oppskrifter/[id] with hero image, ingredient checkboxes, and Add to List
  - ListPickerSheet component for recipe ingredient-to-list flow
  - Playwright tests covering detail load, ingredient toggle, add-to-list, and delete

affects:
  - 14-04 (edit page at /oppskrifter/[id]/rediger links from detail header)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dialog bottom sheet reused from ListTargetSheet pattern — showModal/close driven by $effect watching open prop"
    - "createAddOrIncrementItemMutation called sequentially per ingredient — handles duplicates by incrementing quantity"
    - "Set<string> for ingredient selection state — toggling creates a new Set to trigger Svelte reactivity"

key-files:
  created:
    - src/routes/(protected)/oppskrifter/[id]/+page.server.ts
    - src/routes/(protected)/oppskrifter/[id]/+page.svelte
    - src/lib/components/recipes/ListPickerSheet.svelte
  modified:
    - tests/recipes.spec.ts

key-decisions:
  - "Add to List iterates selected ingredients sequentially calling createAddOrIncrementItemMutation per item — consistent with existing pattern, no batch mutation needed"
  - "ListPickerSheet passes both listId and listName to onSelect callback so toast can show list name without a second query"
  - "All ingredients pre-selected on detail load — user deselects what they don't need (faster path for adding full recipes)"

patterns-established:
  - "Recipe detail: hero image + ingredient checklist + sticky Add to List bar above BottomNav"
  - "Toast duration: 3000ms, shown via setTimeout, cleared on subsequent toasts"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 14 Plan 03: Recipe Detail & Add to List Summary

**Recipe detail view at /oppskrifter/[id] with ingredient selection checkboxes and Add to List flow using ListPickerSheet + createAddOrIncrementItemMutation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T06:53:43Z
- **Completed:** 2026-03-14T06:57:00Z
- **Tasks:** 2 tasks (detail page + tests)
- **Files created/modified:** 4

## Accomplishments

- Created `/oppskrifter/[id]` server load with 404 guard — validates recipe exists before rendering
- Full detail view: hero image (full width), recipe name and description, ingredient checkbox list with pre-selection of all items, select-all / select-none shortcuts, and selected count display
- Sticky "Legg til N ingredienser i liste" action bar positioned above bottom nav, disabled when 0 selected
- `ListPickerSheet` component — dialog-based bottom sheet matching existing `ListTargetSheet` pattern, passes both `listId` and `listName` to `onSelect`
- Add to List logic: iterates selected ingredients, calls `createAddOrIncrementItemMutation` per item (handles duplicates by incrementing quantity), shows toast "La til N ingredienser i [List Name]"
- Edit button links to `/oppskrifter/[id]/rediger` (implemented in 14-04), delete shows confirmation dialog then calls `createDeleteRecipeMutation` and redirects
- 4 Playwright tests: detail load verification, ingredient toggle with count update, add-to-list with toast confirmation, delete with redirect
- Production Vite build succeeds with no new errors

## Task Commits

1. **Detail page + ListPickerSheet** - `b689acd` (feat) — server load, page component, picker sheet
2. **Playwright tests** - `ea0d5e3` (test) — 4 tests covering all plan scenarios

## Files Created/Modified

- `src/routes/(protected)/oppskrifter/[id]/+page.server.ts` - Server load: 404 guard for unknown recipes
- `src/routes/(protected)/oppskrifter/[id]/+page.svelte` - Full detail view with ingredient selection and Add to List
- `src/lib/components/recipes/ListPickerSheet.svelte` - Bottom sheet list picker for recipe context
- `tests/recipes.spec.ts` - Added Recipe Detail View describe block with 4 tests

## Decisions Made

- Sequential mutation calls per ingredient — `createAddOrIncrementItemMutation` handles increment-on-duplicate internally, so no batch needed
- All ingredients pre-selected on page load — favors the common case (adding entire recipe to list)
- `ListPickerSheet` passes `listName` alongside `listId` to avoid a second query for toast display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript checked clean on all new files, Vite production build succeeds.

## User Setup Required

None - uses existing Supabase tables and storage from Plan 14-01.

## Next Phase Readiness

- Recipe edit page at `/oppskrifter/[id]/rediger` is linked from detail view — ready for Plan 14-04
- `createDeleteRecipeMutation` used and verified working in detail view
- All recipe Playwright helpers (`createTestRecipe`, `addTestIngredient`) available in `tests/helpers/recipes.ts`

---
*Phase: 14-recipes*
*Completed: 2026-03-14*

## Self-Check: PASSED

- FOUND: src/routes/(protected)/oppskrifter/[id]/+page.server.ts
- FOUND: src/routes/(protected)/oppskrifter/[id]/+page.svelte
- FOUND: src/lib/components/recipes/ListPickerSheet.svelte
- FOUND: tests/recipes.spec.ts (modified)
- FOUND: .planning/phases/14-recipes/slices/14-03-SUMMARY.md
- FOUND commit: b689acd (feat — detail page + ListPickerSheet)
- FOUND commit: ea0d5e3 (test — Playwright tests)
