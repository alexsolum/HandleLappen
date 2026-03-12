---
phase: 03-store-layouts-and-category-ordering
plan: 04
subsystem: ui
tags: [sveltekit, tanstack-query, supabase, playwright, optimistic-updates]
requires:
  - phase: 03-02
    provides: category-grouped list view and store-aware ordering on the list page
  - phase: 03-03
    provides: category CRUD and the complete category catalog for households
provides:
  - per-item category assignment from the list page
  - auto-opening category picker after adding uncategorized items
  - long-press item detail sheet with name, quantity, and category editing
affects: [phase-04, item-editing, category-assignment]
tech-stack:
  added: []
  patterns: [optimistic item recategorization, bottom-sheet dialogs via native dialog, long-press without breaking tap check-off]
key-files:
  created:
    - src/lib/components/items/CategoryPickerModal.svelte
    - src/lib/components/items/ItemDetailSheet.svelte
  modified:
    - src/lib/queries/items.ts
    - src/lib/components/items/ItemRow.svelte
    - src/lib/components/items/CategorySection.svelte
    - src/routes/(protected)/lister/[id]/+page.svelte
    - tests/categories.spec.ts
    - tests/items.spec.ts
key-decisions:
  - "The add-item success path opens the category picker from the server-returned row, avoiding a refetch race for pending item identity."
  - "Long-press handling suppresses the follow-up click only after the press threshold fires so one-tap check-off stays immediate."
  - "Closed category/detail dialogs are conditionally mounted to avoid hidden duplicate content interfering with existing list assertions."
patterns-established:
  - "Use optimistic category_id cache updates to let grouped derived state move an item between sections immediately."
  - "Mount list-level bottom-sheet dialogs only while active when their hidden DOM would otherwise affect interaction or tests."
requirements-completed: [CATG-05]
duration: 25 min
completed: 2026-03-10
---

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
