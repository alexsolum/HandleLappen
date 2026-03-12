---
phase: 02-shopping-lists-and-core-loop
plan: "03"
subsystem: ui
tags: [svelte5, tanstack-query-v6, swipe-gesture, optimistic-updates, item-crud, item-history, playwright]

dependency_graph:
  requires:
    - phase: 02-01
      provides: "TanStack QueryClientProvider, list_items + item_history DB schema, TypeScript types"
    - phase: 02-02
      provides: "swipeLeft action, BottomNav, protected layout with householdId + supabase + user in data"
  provides:
    - createItemsQuery / createAddItemMutation / createDeleteItemMutation / createCheckOffMutation
    - ItemRow.svelte (div[role=button] with swipeLeft, check indicator, name+quantity display)
    - ItemInput.svelte (fixed bottom-16 bar, synchronous focus() before async mutation)
    - DoneSection.svelte (collapsible Handlet(N) section, uncheck affordance)
    - List detail page at /lister/[id] (SSR load + TanStack Query CRUD + optimistic updates)
    - item_history writes on check-off (HIST-01 satisfied)
  affects: [02-04]

tech-stack:
  added: []
  patterns:
    - TanStack Query v6 thunk factory functions extended to item mutations
    - Optimistic insert/delete/toggle with snapshot rollback pattern
    - swipeLeft reused on ItemRow (div[role=button] pattern, not inner button)
    - Synchronous focus() before async mutation in ItemInput (iOS keyboard pitfall fix)
    - Playwright waitForResponse(item_history POST) to avoid race condition in history test

key-files:
  created:
    - src/lib/queries/items.ts
    - src/lib/components/items/ItemRow.svelte
    - src/lib/components/items/ItemInput.svelte
    - src/lib/components/items/DoneSection.svelte
    - src/routes/(protected)/lister/[id]/+page.server.ts
    - src/routes/(protected)/lister/[id]/+page.svelte
  modified:
    - tests/items.spec.ts

key-decisions:
  - "ItemRow uses div[role=button] not inner button — setPointerCapture on swipe container prevents synthetic click events on nested buttons"
  - "safeGetSession() used in +page.server.ts instead of locals.user (which does not exist in App.Locals)"
  - "Playwright uses waitForResponse(item_history POST) for history write test — networkidle fires between PATCH response and item_history POST, causing false 0-row result"
  - "checkOffMutation passes checked_by=userId explicitly — never relies on auth.uid() at DB level (Pitfall 5 from RESEARCH.md)"
  - "ItemInput calls nameInput.focus() synchronously before the async onAdd callback — Pitfall 6 iOS keyboard preservation"

requirements-completed: [LIST-03, LIST-04, LIST-05, HIST-01]

duration: 12min
completed: "2026-03-09"
---

# Phase 2 Plan 03: List Detail View and Item CRUD Summary

**Full list detail page with item add/remove/check-off, collapsible Done section, optimistic updates, and verified item_history writes (HIST-01)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-09T21:23:41Z
- **Completed:** 2026-03-09T21:35:41Z
- **Tasks:** 2
- **Files created/modified:** 7

## Accomplishments

- List detail page at `/lister/[id]` with SSR validation of list ownership (throws 404 if list not found)
- Four TanStack Query v6 item factories: `createItemsQuery`, `createAddItemMutation`, `createDeleteItemMutation`, `createCheckOffMutation`
- Optimistic add/delete/check-off with snapshot rollback on error; error banner shown on mutation failure
- `createCheckOffMutation` writes to `item_history` with `checked_by = userId` on check-off (HIST-01)
- Collapsible `DoneSection` (`Handlet (N)`) shows checked items with uncheck affordance
- `ItemInput` bar fixed at `bottom-16` above BottomNav; focus called synchronously before mutation (iOS keyboard)
- 3 Playwright tests passing: add item, check off (moves to Handlet section), history write (DB row verified)

## Task Commits

1. **Task 1: Item query factories** - `142acf5` (feat)
2. **Task 2: List detail page, components, and tests** - `2121bf3` (feat)

## Files Created/Modified

- `src/lib/queries/items.ts` — all four item query/mutation factories with optimistic updates
- `src/lib/components/items/ItemRow.svelte` — div[role=button] with swipeLeft; check indicator; name·quantity
- `src/lib/components/items/ItemInput.svelte` — persistent bottom input bar with synchronous focus()
- `src/lib/components/items/DoneSection.svelte` — collapsible Handlet section with uncheck rows
- `src/routes/(protected)/lister/[id]/+page.server.ts` — SSR load: safeGetSession, 404 on list not found
- `src/routes/(protected)/lister/[id]/+page.svelte` — full list detail view with active/done split
- `tests/items.spec.ts` — 3 real e2e tests (add, check-off, history write); 1 skipped (swipe manual)

## Decisions Made

- `div[role=button]` instead of inner `<button>` for item rows — `setPointerCapture` in swipeLeft captures all pointer events to the outer element, preventing click events from reaching a nested button. Using `onclick` on the same div that has the swipe action lets click events fire correctly.
- `safeGetSession()` in `+page.server.ts` — `locals.user` doesn't exist in `App.Locals`; only `safeGetSession` is available
- `waitForResponse(item_history POST)` in history write test — there's a race between `networkidle` and the item_history POST: `networkidle` fires after the PATCH returns (204) but before the sequential item_history INSERT starts, so the admin DB check runs before the row exists
- `checked_by` explicitly set to `userId` — never relying on `auth.uid()` in client-side mutation inserts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed locals.user reference in +page.server.ts**
- **Found during:** Task 2 verification (tests timing out — page returned 500)
- **Issue:** Plan scaffold used `locals.user` which doesn't exist in `App.Locals`; only `locals.safeGetSession()` is defined
- **Fix:** Changed to `const { user } = await locals.safeGetSession()`
- **Files modified:** `src/routes/(protected)/lister/[id]/+page.server.ts`
- **Committed in:** 2121bf3

**2. [Rule 1 - Bug] Fixed ItemRow structure to use div[role=button] instead of inner button**
- **Found during:** Task 2 verification (check-off and history write tests failing; click not triggering toggle)
- **Issue:** Original ItemRow had `use:swipeLeft` on outer div and `onclick` on inner `<button>`. The swipe action's `setPointerCapture` routes all pointer events to the outer div, preventing synthetic click events from reaching the inner button.
- **Fix:** Moved `onclick={onToggle}` to the same div that has `use:swipeLeft`, added `role="button"` and `tabindex="0"` for accessibility
- **Files modified:** `src/lib/components/items/ItemRow.svelte`
- **Committed in:** 2121bf3

**3. [Rule 1 - Bug] Fixed test selectors and timing for check-off and history write**
- **Found during:** Task 2 verification
- **Issue 1:** `button:has-text("Brød")` selector failed because `div[role=button]` elements are not matched by the `button` tag selector. Fixed to `getByRole('button', { name: 'Brød' })`
- **Issue 2:** `locator('text=Handlet')` strict mode violation — matched both "Alle varer er handlet!" text and the DoneSection header. Fixed to `locator('text=Handlet (1)')`
- **Issue 3:** History write test: `networkidle` fires between PATCH (204) and `item_history` POST, causing admin DB query to run before insert. Fixed with `waitForResponse(res => res.url().includes('item_history') && res.request().method() === 'POST')`
- **Files modified:** `tests/items.spec.ts`
- **Committed in:** 2121bf3

---

**Total deviations:** 3 auto-fixed (all bugs discovered during verification)
**Impact on plan:** All fixes necessary for correct behavior. No scope creep.

## Issues Encountered

- `setPointerCapture` in Svelte action prevents click events on child elements — must keep `onclick` handler on the same element that uses the swipe action, not on a nested element
- Playwright `networkidle` is not a reliable wait for sequential async operations in TanStack Query mutations — the mutationFn runs PATCH then POST sequentially, but `networkidle` can fire between the two. Use `waitForResponse` for precise network-level synchronization.

## Next Phase Readiness

- `swipeLeft` + item row pattern established for categories and category-sorted lists in Phase 3
- `createCheckOffMutation` + `item_history` write pattern is a complete HIST-01 implementation
- All four item factories available for reuse in Phase 3 category-sorted views
- DoneSection collapses automatically — works for large done lists in Phase 3+

---
*Phase: 02-shopping-lists-and-core-loop*
*Completed: 2026-03-09*

## Self-Check: PASSED

All files created and commits exist:
- src/lib/queries/items.ts: FOUND
- src/lib/components/items/ItemRow.svelte: FOUND
- src/lib/components/items/ItemInput.svelte: FOUND
- src/lib/components/items/DoneSection.svelte: FOUND
- src/routes/(protected)/lister/[id]/+page.server.ts: FOUND
- src/routes/(protected)/lister/[id]/+page.svelte: FOUND
- Commit 142acf5: FOUND
- Commit 2121bf3: FOUND
