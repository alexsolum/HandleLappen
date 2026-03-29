---
phase: 24-location-detection-foundation
plan: 00
subsystem: testing
tags: [playwright, geolocation, pwa, validation, supabase]
requires:
  - phase: 23-store-location-foundation
    provides: seeded stores with chain/location_name/lat/lng for Phase 24 detection scenarios
provides:
  - Reusable Phase 24 Playwright helpers for seeded stores, geolocation mocks, and visibility events
  - Stable requirement-aligned test titles for permission flow, foreground poller, and manual picker fallback smoke filters
  - Installed-iPhone PWA manual verification checklist for prompt, deny, retry, unavailable, and background/resume behavior
affects: [24-location-detection-foundation, 25-shopping-mode, location-validation]
tech-stack:
  added: []
  patterns: [scaffold-first Playwright contract, deterministic geolocation mocking, physical-iPhone checklist before UI work]
key-files:
  created:
    - tests/helpers/location.ts
    - tests/location-detection.spec.ts
    - .planning/phases/24-location-detection-foundation/24-MANUAL-CHECKLIST.md
  modified: []
key-decisions:
  - "The new Phase 24 Playwright file stays scaffold-only via `test.skip` so the exact smoke filters exist before production implementation lands."
  - "Location test helpers centralize seeded store creation, geolocation request counting, and visibility overrides for later Phase 24 plans."
patterns-established:
  - "Requirement-specific smoke commands target stable substrings: permission flow, foreground poller, and manual picker fallback."
  - "Installed-iPhone PWA validation is documented ahead of implementation instead of being improvised at the end of the phase."
requirements-completed: [LOCATE-01, LOCATE-02, LOCATE-03]
duration: 20min
completed: 2026-03-29
---

# Phase 24 Plan 00: Location Detection Foundation Summary

**Phase 24 now has reusable geolocation test helpers, stable Playwright smoke titles, and an installed-iPhone PWA checklist ready before feature implementation begins.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-29T12:29:00Z
- **Completed:** 2026-03-29T12:49:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `tests/helpers/location.ts` with seeded-store creation, deterministic geolocation mocks, and document visibility control for later Phase 24 specs.
- Created `tests/location-detection.spec.ts` with the exact stable titles required by `24-VALIDATION.md` and verified all three filters via `--list`.
- Added `.planning/phases/24-location-detection-foundation/24-MANUAL-CHECKLIST.md` to lock down the installed-iPhone PWA prompt and recovery flow before UI work starts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Phase 24 Playwright helpers and requirement-aligned spec titles** - `a1c8a8e` (test)
2. **Task 2: Create the installed-iPhone PWA manual checklist before implementation starts** - `b506e94` (docs)

## Files Created/Modified
- `tests/helpers/location.ts` - reusable seeded store helper plus deterministic geolocation and visibility mocks.
- `tests/location-detection.spec.ts` - scaffold-only Playwright file with stable requirement-specific titles and helper references.
- `.planning/phases/24-location-detection-foundation/24-MANUAL-CHECKLIST.md` - physical iPhone installed-PWA verification steps and smoke-path note.

## Decisions Made
- Kept the new Playwright file scaffold-only with `test.skip` so `npx playwright test tests/location-detection.spec.ts` exits cleanly before Phase 24 UI and polling code exist.
- Put the geolocation request counter and visibility override in shared test helpers so later Phase 24 implementation plans can reuse one contract instead of duplicating browser mocks.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 24 now has exact smoke filters for `permission flow`, `foreground poller`, and `manual picker fallback`.
- Manual validation expectations for installed-iPhone PWA behavior are documented before the location UI and polling engine are built.

