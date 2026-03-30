---
phase: 26-home-location-and-check-off-behavior
plan: 01
subsystem: ui
tags: [sveltekit, supabase, postgres, rls, playwright, leaflet]
requires:
  - phase: 23-store-location-foundation
    provides: Leaflet map widget and store map interaction pattern
  - phase: 24-location-detection-foundation
    provides: Geolocation helper and Playwright location mocking
provides:
  - Private per-user home location table with own-row RLS and 4-decimal precision
  - Page-scoped /admin/brukerinnstillinger loader and focused home-location settings UI
  - Admin hub navigation and Wave 0 coverage for settings and privacy flows
affects: [26-home-location-and-check-off-behavior, CHKOFF-03, check-off branching]
tech-stack:
  added: []
  patterns: [private user-scoped location storage, page-scoped sensitive data loading, explicit save-before-persist UI]
key-files:
  created:
    - supabase/migrations/20260330000000_phase26_home_locations.sql
    - src/routes/(protected)/admin/brukerinnstillinger/+page.server.ts
    - src/routes/(protected)/admin/brukerinnstillinger/+page.svelte
    - tests/home-location.spec.ts
    - tests/home-location-privacy.spec.ts
  modified:
    - src/lib/types/database.ts
    - src/routes/(protected)/admin/+page.svelte
    - tests/admin.spec.ts
    - tests/helpers/location.ts
key-decisions:
  - "Home coordinates stay in public.user_home_locations with auth.uid()-scoped RLS instead of profiles."
  - "Home-location reads stay on /admin/brukerinnstillinger via page load and are not added to protected layout data."
patterns-established:
  - "Sensitive per-user coordinates live in dedicated tables instead of household-readable profile rows."
  - "Current-position actions update pending UI state first; persistence requires an explicit save action."
requirements-completed: [CHKOFF-03]
duration: 16min
completed: 2026-03-29
---

# Phase 26 Plan 01: Home Location Settings Summary

**Private home-location storage with own-row RLS, a real /admin/brukerinnstillinger page, and Playwright coverage for save/remove/privacy flows**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-29T18:53:20Z
- **Completed:** 2026-03-29T19:10:23Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Replaced the disabled admin settings stub with a real `/admin/brukerinnstillinger` entry and page.
- Added `user_home_locations` with 4-decimal rounding, `updated_at`, and own-row RLS policies.
- Landed Wave 0 Playwright coverage for admin navigation, home-location save/remove/current-position flows, and cross-user privacy.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Phase 26 Wave 0 settings/privacy test scaffolds** - `9048675` (test)
2. **Task 2: Add private home-location schema and page-scoped server contract** - `46f4459` (feat)
3. **Task 3: Build the focused user settings page and activate the admin entry point** - `4a1d7e9` (feat)

## Files Created/Modified
- `supabase/migrations/20260330000000_phase26_home_locations.sql` - Private home-location table, rounding trigger, and RLS policies.
- `src/lib/types/database.ts` - Supabase types for `user_home_locations`.
- `src/routes/(protected)/admin/brukerinnstillinger/+page.server.ts` - Current-user-only home-location loader.
- `src/routes/(protected)/admin/brukerinnstillinger/+page.svelte` - Home-location settings card with map, current-position, save, remove, and privacy copy.
- `src/routes/(protected)/admin/+page.svelte` - Activated settings navigation from the admin hub.
- `tests/admin.spec.ts` - Real admin navigation assertion for settings.
- `tests/helpers/location.ts` - Home-location seeding, cleanup, and authenticated test client helpers.
- `tests/home-location.spec.ts` - Save, current-position, and remove settings coverage.
- `tests/home-location-privacy.spec.ts` - RLS and browser-visible privacy coverage.

## Decisions Made

- Used a dedicated private table instead of extending `profiles` because household-readable profile queries would expose home coordinates.
- Kept home-location loading page-scoped so unrelated protected routes do not receive sensitive coordinate data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied local Supabase migrations before privacy verification**
- **Found during:** Task 2
- **Issue:** Playwright privacy tests failed with `PGRST205` because the local PostgREST schema cache did not yet include `user_home_locations`.
- **Fix:** Ran `npx supabase db reset --local --no-seed` so the new migration was applied and the local API reflected the new table.
- **Files modified:** Local database state only
- **Verification:** `npx playwright test tests/home-location-privacy.spec.ts --project=chromium --grep "privacy|RLS|cannot read"`
- **Committed in:** Not applicable; environment-only fix

**2. [Rule 3 - Blocking] Reworked the browser-side privacy assertion to avoid page-context ESM import failure**
- **Found during:** Task 2
- **Issue:** The original browser-query test tried to import `@supabase/supabase-js` inside `page.evaluate`, which fails in Playwright page context.
- **Fix:** Changed the second privacy assertion to verify the actual browser-visible household surface does not reveal another member's home coordinates.
- **Files modified:** tests/home-location-privacy.spec.ts
- **Verification:** `npx playwright test tests/home-location-privacy.spec.ts --project=chromium --grep "privacy|RLS|cannot read"`
- **Committed in:** `46f4459`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both deviations were required to make the planned verification executable. No product scope changed.

## Issues Encountered

- `src/lib/types/database.ts` needed encoding normalization before `apply_patch` could update it safely.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 26 now has the private storage contract and real settings surface needed for at-home check-off branching.
- The next plan can consume `user_home_locations` without widening profile queries or layout data.

## Self-Check: PASSED
