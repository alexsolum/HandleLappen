---
phase: 02-shopping-lists-and-core-loop
plan: 04
subsystem: realtime
tags: [supabase-realtime, postgres_changes, tanstack-query, playwright, websocket]

# Dependency graph
requires:
  - phase: 02-01
    provides: supabase_realtime publication with list_items and lists tables
  - phase: 02-02
    provides: lists home screen with TanStack Query and supabase client in data
  - phase: 02-03
    provides: list detail page with TanStack Query, itemsQueryKey, supabase client in data
provides:
  - Supabase Realtime subscription on list_items filtered by list_id in list detail page
  - Supabase Realtime subscription on lists table in home screen
  - Two-context Playwright test proving cross-device sync within 3 seconds
affects: [phase-03, phase-04, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "postgres_changes subscription in $effect-like component body with onDestroy cleanup"
    - "useQueryClient().invalidateQueries as the only realtime handler — no manual cache splicing"
    - "Pre-test cleanup via admin.auth.admin.listUsers() for idempotent test setup"
    - "Two-context Playwright test pattern for cross-device realtime verification"

key-files:
  created:
    - tests/realtime.spec.ts
  modified:
    - src/routes/(protected)/lister/[id]/+page.svelte
    - src/routes/(protected)/+page.svelte

key-decisions:
  - "Test cleanup uses listUsers() pre-scan rather than try/catch on createUser — ensures clean state regardless of partial previous runs"
  - "button:has-text() selector required instead of [type=submit] — Button component defaults to type=button, not type=submit"
  - "networkidle wait states required for both login redirect and list page navigation — TanStack Query hydration timing"
  - "waitForSelector on item input before filling ensures device A is fully ready before adding item"

patterns-established:
  - "Realtime: channel per page, named with entity+id, cleaned up in onDestroy"
  - "Realtime handler: single invalidateQueries call — no cache manipulation"
  - "Two-context Playwright: cleanup first, create users, separate browser contexts, sequential login, parallel navigation"

requirements-completed: [LIST-06]

# Metrics
duration: 15min
completed: 2026-03-10
---

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
