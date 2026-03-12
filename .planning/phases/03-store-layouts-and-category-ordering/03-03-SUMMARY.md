---
phase: 03-store-layouts-and-category-ordering
plan: 03
subsystem: ui
tags: [sveltekit, svelte-dnd-action, tanstack-query, supabase, realtime]
requires:
  - phase: 03-01
    provides: categories, stores, and store_layouts schema plus seeded default order
  - phase: 03-02
    provides: category-grouped list views and store selection state
provides:
  - butikker navigation and store list management screens
  - per-store drag-to-reorder layouts persisted to store_layouts
  - default category layout CRUD with Realtime invalidation
affects: [03-04, store-layouts, category-management]
tech-stack:
  added: [svelte-dnd-action]
  patterns: [drag-reorder with gap-of-10 persistence, categories realtime invalidation, store layout CRUD via query mutations]
key-files:
  created:
    - src/lib/queries/stores.ts
    - src/lib/components/stores/StoreRow.svelte
    - src/lib/components/stores/DraggableCategoryRow.svelte
    - src/routes/(protected)/butikker/+page.svelte
    - src/routes/(protected)/butikker/[id]/+page.svelte
    - src/routes/(protected)/butikker/standard/+page.svelte
  modified:
    - package.json
    - package-lock.json
    - src/lib/components/lists/BottomNav.svelte
    - tests/categories.spec.ts
key-decisions:
  - "Per-store layout screens stay reorder-only while Standard rekkefolge owns category CRUD."
  - "New category creation backfills store_layouts rows for every existing store to prevent missing per-store order entries."
  - "Human verification approved the Butikker flow after validating drag persistence and category CRUD."
patterns-established:
  - "Use svelte-dnd-action onconsider/onfinalize handlers with local ordered state before persisting."
  - "Persist category and store layout ordering with gap-of-10 positions so future inserts can slot in cleanly."
  - "Invalidate categories queries from a Supabase Realtime channel on public.categories changes."
requirements-completed: [CATG-03, CATG-04]
duration: 34 min
completed: 2026-03-10
---

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
