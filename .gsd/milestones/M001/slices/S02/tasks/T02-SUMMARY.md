---
id: T02
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
# T02: Plan 02

**# Phase 2 Plan 02: Lister Home Screen and List CRUD Summary**

## What Happened

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
