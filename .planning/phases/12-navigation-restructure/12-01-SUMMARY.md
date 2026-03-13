---
phase: 12-navigation-restructure
plan: 01
subsystem: testing
tags: [playwright, e2e, navigation, tdd, svelte]

# Dependency graph
requires: []
provides:
  - "Playwright e2e test scaffold for NAV-01 (tab labels, active states) and NAV-02 (redirects)"
  - "tests/navigation.spec.ts with 8 failing tests defining navigation contract"
affects:
  - 12-02
  - 12-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD Wave 0 scaffold: test file written before implementation, all tests intentionally red"
    - "Shared storageState across tests using beforeAll/afterAll with browser.newContext"

key-files:
  created:
    - tests/navigation.spec.ts
  modified:
    - src/routes/logg-inn/+page.svelte

key-decisions:
  - "Test scaffold uses shared browser context with storageState captured in beforeAll to avoid 8 separate login round-trips"
  - "Auto-fixed SSR crash on /logg-inn before writing tests: window.location in template attribute required typeof window guard"

patterns-established:
  - "beforeAll storageState pattern: create user, sign in once, capture storageState, reuse across tests in separate pages"
  - "Per-test page isolation: each test creates its own page from authContext and closes it in a finally block"

requirements-completed: [NAV-01, NAV-02]

# Metrics
duration: 15min
completed: 2026-03-13
---

# Phase 12 Plan 01: Navigation Restructure Summary

**Playwright e2e test scaffold with 8 red tests defining the NAV-01/NAV-02 contract for tab labels, active-state detection, and route redirects**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-13T11:39:57Z
- **Completed:** 2026-03-13T11:55:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created `tests/navigation.spec.ts` with 8 Playwright e2e tests covering both NAV-01 and NAV-02
- All 8 tests discovered and failing as expected (red state) — confirms the test contract is wired correctly against the current implementation
- Fixed a pre-existing SSR crash on `/logg-inn` that blocked test execution

## Task Commits

Each task was committed atomically:

1. **Task 1: Write navigation Playwright test scaffold** - `1113ea6` (test)

**Plan metadata:** (docs commit follows)

_Note: TDD RED phase — tests are intentionally failing. Implementation in Plans 02 and 03._

## Files Created/Modified
- `tests/navigation.spec.ts` - 8 Playwright e2e tests covering NAV-01 tab labels/active-states and NAV-02 redirects
- `src/routes/logg-inn/+page.svelte` - Fixed SSR crash: guarded `window.location` usage in template attribute

## Decisions Made
- Used `beforeAll`/`afterAll` with shared `storageState` rather than per-test login, since 8 tests all need authentication and the login flow is shared setup
- Each test creates its own `page` from the shared `authContext` and closes it in `finally` to ensure isolation without re-authentication overhead

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed SSR crash on /logg-inn preventing test execution**
- **Found during:** Task 1 (running tests to verify red state)
- **Issue:** `data-google-oauth-callback={getGoogleRedirectTo()}` is evaluated during SSR render, but `getGoogleRedirectTo()` calls `window.location.origin`, which is undefined in Node SSR context — causing HTTP 500 on `/logg-inn`, which blocked all test authentication
- **Fix:** Guarded the attribute value with `typeof window !== 'undefined' ? getGoogleRedirectTo() : ''`
- **Files modified:** `src/routes/logg-inn/+page.svelte`
- **Verification:** `/logg-inn` returns HTTP 200; all 8 tests are discovered and fail (not erroring) on the expected assertions
- **Committed in:** `1113ea6` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was required to allow test execution at all. Single-line guard, no scope creep.

## Issues Encountered
- Pre-existing SSR bug in `/logg-inn` caused by Google OAuth callback URL generation using `window.location` in a server-rendered template attribute. Resolved with `typeof window` guard.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `tests/navigation.spec.ts` exists with all 8 tests failing — Nyquist compliance satisfied for Plans 02 and 03
- Plan 02 will implement tab restructure (BottomNav) and stub routes
- Plan 03 will implement redirects from `/husstand` and `/butikker`
- After Plan 03, all 8 tests should pass (green)

---
*Phase: 12-navigation-restructure*
*Completed: 2026-03-13*
