---
id: S02
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
# S02: Shopping Lists And Core Loop

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

# Phase 2 Plan 02: Lister Home Screen and List CRUD Summary

**swipeLeft pointer-event action + TanStack Query list factories + Lister home screen with BottomNav, optimistic list CRUD, and relocated logout**

## Performance

- **Duration:** 21 min
- **Started:** 2026-03-09T20:59:37Z
- **Completed:** 2026-03-09T21:20:41Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Lister home screen at `/` shows household shopping lists with `name · N ting` format using TanStack Query v6
- BottomNav rendered in protected layout with 4 tabs; Butikker and Anbefalinger are greyed out
- swipeLeft Svelte action using pointer events establishes the swipe-delete pattern reused in plan 02-03

## Task Commits

1. **Task 1: swipeLeft action + list query factories** - `6967be2` (feat)
2. **Task 2: Lister home screen, BottomNav, ListRow, ListCreateRow, and relocated logout** - `30b6af5` (feat)

## Files Created/Modified

- `src/lib/actions/swipe.ts` — swipeLeft Svelte action with pointer events, 60px threshold, 80px reveal, snap-back
- `src/lib/queries/lists.ts` — createListsQuery, createCreateListMutation, createDeleteListMutation with optimistic updates
- `src/lib/components/lists/BottomNav.svelte` — 4-tab bottom nav; Lister and Husstand active, others greyed-out spans
- `src/lib/components/lists/ListRow.svelte` — list row with `name · N ting`, `use:swipeLeft` for delete reveal
- `src/lib/components/lists/ListCreateRow.svelte` — inline create row: `+` button toggles to autofocus input
- `src/routes/(protected)/+page.svelte` — Lister home screen with loading/error/empty states and list CRUD
- `src/routes/(protected)/+layout.svelte` — adds BottomNav import and render after main content
- `src/routes/(protected)/+layout.server.ts` — exposes `householdId` in returned data
- `src/routes/(protected)/husstand/+page.svelte` — adds Logg ut button at page bottom
- `tests/lists.spec.ts` — real e2e tests for LIST-01 and LIST-02

## Decisions Made

- `householdId` exposed from `+layout.server.ts` (not fetched per-page) — avoids duplicate profiles queries
- ListCreateRow uses `onCreate: (name: string) => void` callback prop — Svelte 5 props-over-events convention
- Playwright tests must wait for `networkidle` both at goto and after login navigation — Svelte 5 + TanStack Query initialization in dev mode requires full hydration before interacting with components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Playwright test selectors and timing**
- **Found during:** Task 2 verification
- **Issue:** Tests used `[type=submit]` to find the login button, but the Button component renders `type="button"` not `type="submit"`. Also, `page.waitForURL('/')` doesn't wait for Svelte 5 + TanStack Query to hydrate — clicking the `+ Ny liste` button before hydration caused it to not trigger the state update.
- **Fix:** Changed to `button:has-text("Logg inn")` selector; added `{ waitUntil: 'networkidle' }` to goto and `waitForLoadState('networkidle')` after login redirect; added `waitForSelector('input[placeholder="Navn på lista"]')` for explicit input wait.
- **Files modified:** tests/lists.spec.ts
- **Committed in:** 30b6af5 (Task 2 commit)

**2. [Rule 3 - Blocking] Applied Phase 2 database migration before running e2e tests**
- **Found during:** Task 2 verification
- **Issue:** The Phase 2 migration (20260309000004_phase2_shopping_lists.sql) had not been applied to the local Supabase instance. The `lists` table didn't exist, causing login to succeed but the home screen queries to fail silently.
- **Fix:** Ran `npx supabase db push --local` to apply the pending migration.
- **Files modified:** None — migration was already written in plan 02-01.

---

**Total deviations:** 2 auto-fixed (1 bug in test selectors, 1 blocking migration)
**Impact on plan:** Both fixes necessary for test execution. No scope creep.

## Issues Encountered

- Playwright in dev mode requires `networkidle` waits for Svelte 5 + TanStack Query to initialize. The root cause: `window.location.href = '/'` (used in the login page) triggers a full page navigation, and TanStack Query's QueryClientProvider + query initialization takes an additional moment before the component tree is interactive. This will be a pattern for all future e2e tests that navigate to protected pages.

## Next Phase Readiness

- `swipeLeft` action is ready to reuse on item rows in plan 02-03
- `createListsQuery` / `createCreateListMutation` / `createDeleteListMutation` pattern established for `createItemsQuery` etc. in 02-03
- BottomNav is rendered in the protected layout — all future protected screens get it automatically
- Husstand has logout; header has no logout button

---
*Phase: 02-shopping-lists-and-core-loop*
*Completed: 2026-03-09*

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

# Phase 2 Plan 4: Realtime Subscriptions Summary

**Supabase postgres_changes subscriptions wired to TanStack Query invalidation for sub-3-second cross-device sync, verified by a two-context Playwright test**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-10T04:00:00Z
- **Completed:** 2026-03-10T04:12:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- List detail page subscribes to `postgres_changes` on `list_items` filtered by `list_id`, calls `invalidateQueries` on any event, and cleans up via `onDestroy`
- Lists home screen subscribes to `postgres_changes` on `lists` table with household isolation enforced server-side by RLS/WALRUS
- Two-context Playwright test passes: item added by device A appears on device B within 3 seconds without page refresh

## Task Commits

Each task was committed atomically:

1. **Task 1: Realtime subscriptions in list detail and home screen** — Already implemented in prior plan sessions; pages had full subscription code in place
2. **Task 2: Two-context Realtime Playwright test** - `f6ae4f0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/routes/(protected)/lister/[id]/+page.svelte` — Supabase Realtime subscription on list_items for the open list; invalidates ['items', listId] on any event; onDestroy cleanup
- `src/routes/(protected)/+page.svelte` — Supabase Realtime subscription on lists table; invalidates ['lists'] on any event; onDestroy cleanup
- `tests/realtime.spec.ts` — Two-context Playwright test: pre-test cleanup, two users same household, two browser contexts, cross-device 3-second sync assertion

## Decisions Made
- Pre-test cleanup via `admin.auth.admin.listUsers()` scan: ensures idempotent test setup regardless of partially-run previous tests
- `button:has-text("Logg inn")` selector: the Button component defaults `type="button"`, so `[type=submit]` never matches — consistent with other e2e tests in the codebase
- `networkidle` wait states on navigation: required for TanStack Query SSR hydration timing (established in plan 02-02)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test stub used incorrect button selector**
- **Found during:** Task 2 (Two-context Realtime Playwright test)
- **Issue:** Original test used `[type=submit]` but the Button component renders `type="button"` by default, so the click never fired and login never completed
- **Fix:** Changed selector to `button:has-text("Logg inn")` matching the pattern used in all other e2e tests
- **Files modified:** tests/realtime.spec.ts
- **Verification:** Test passes (1 passed, 8.8s)
- **Committed in:** f6ae4f0

**2. [Rule 1 - Bug] No pre-test cleanup caused duplicate user errors on re-run**
- **Found during:** Task 2 (Two-context Realtime Playwright test)
- **Issue:** Test created users with fixed emails (realtime-a@test.example, realtime-b@test.example). On re-run, Supabase threw "A user with this email address has already been registered"
- **Fix:** Added cleanup block at test start using `admin.auth.admin.listUsers()` to find and delete any existing test users by email before creating them
- **Files modified:** tests/realtime.spec.ts
- **Verification:** Test runs idempotently on consecutive runs
- **Committed in:** f6ae4f0

**3. [Rule 1 - Bug] Missing networkidle waits and waitForSelector caused navigation race**
- **Found during:** Task 2 (Two-context Realtime Playwright test)
- **Issue:** Without `waitUntil: 'networkidle'` on page.goto and `waitForLoadState('networkidle')` after login redirect, TanStack Query hydration was incomplete — consistent with timing pattern from plan 02-02
- **Fix:** Added `waitUntil: 'networkidle'` to all goto calls and `waitForLoadState('networkidle')` after `waitForURL`; added `waitForSelector` for item input before filling
- **Files modified:** tests/realtime.spec.ts
- **Verification:** Test passes consistently
- **Committed in:** f6ae4f0

---

**Total deviations:** 3 auto-fixed (all Rule 1 - bugs in test setup)
**Impact on plan:** All fixes necessary for test correctness and idempotency. No scope creep — implementation code (pages) was already correct.

## Issues Encountered
- The two page files were already fully implemented with realtime subscriptions from prior plan sessions (02-03 work). Task 1 required no changes — verified via `git diff` showing no unstaged changes to those files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Realtime sync is proven working end-to-end: postgres_changes → invalidateQueries → UI update in < 3 seconds
- Phase 2 core loop is complete: create lists, add/check-off items, real-time sync
- Phase 3 (smart sorting by store layout) can proceed — it will modify the items query and ItemRow ordering
- No blockers for Phase 3

---
*Phase: 02-shopping-lists-and-core-loop*
*Completed: 2026-03-10*
