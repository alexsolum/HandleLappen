---
phase: 24-location-detection-foundation
plan: 01
subsystem: location
tags: [geolocation, proximity, foreground-polling, svelte, store-selection]
requires:
  - phase: 24-location-detection-foundation
    provides: Wave 0 location test scaffolding and installed-iPhone checklist
provides:
  - Native geolocation wrapper with explicit timeout, cache age, and failure classification
  - Reusable nearest-store detection based on saved store coordinates and 150 meter radius
  - Foreground-only location polling session with hidden-tab pause and immediate visible-tab refresh
  - List-page store-name derivation aligned with the Phase 23 chain/location_name model
affects: [24-location-detection-foundation, 25-shopping-mode, list-history-context]
tech-stack:
  added: []
  patterns: [browser geolocation wrapper, haversine proximity matcher, chained setTimeout polling, visibility pause-resume]
key-files:
  created:
    - src/lib/location/geolocation.ts
    - src/lib/location/proximity.ts
    - src/lib/location/session.svelte.ts
  modified:
    - src/routes/(protected)/lister/[id]/+page.svelte
key-decisions:
  - "Geolocation stays isolated in src/lib/location/* so the list page never touches navigator.geolocation directly."
  - "Foreground polling uses chained setTimeout plus visibilitychange pause-resume instead of watchPosition to keep the Phase 24 battery contract explicit."
  - "List history/store context now derives labels through storeDisplayName(chain, location_name) so auto-detection and manual selection use the same composed store identity."
requirements-completed: [LOCATE-01]
duration: 24min
completed: 2026-03-29
---

# Phase 24 Plan 01: Location Detection Foundation Summary

**Phase 24 now has the reusable location engine needed for list-page UX: explicit geolocation contracts, nearest-store matching, foreground-only polling, and a repaired store-name data contract on the list route.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-29T12:50:00Z
- **Completed:** 2026-03-29T13:14:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `src/lib/location/geolocation.ts` with `LOCATION_TIMEOUT_MS`, `LOCATION_MAX_AGE_MS`, `getCurrentLocation`, and resilient failure classification for permission-denied, unavailable, timeout, and unsupported cases.
- Added `src/lib/location/proximity.ts` with haversine distance math and `findNearestDetectedStore`, using a single `STORE_DETECTION_RADIUS_METERS = 150` source of truth.
- Added `src/lib/location/session.svelte.ts` with foreground polling, 12-second quick retry for unavailable samples, visibility pause/resume, denied-state tracking, and imperative helpers for Phase 24 list-page wiring.
- Repaired `src/routes/(protected)/lister/[id]/+page.svelte` so selected-store history context now uses `storeDisplayName(found.chain, found.location_name)` instead of the removed `store.name` field.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create geolocation wrapper and proximity matcher** - `f0c3af9` (feat)
2. **Task 2: Create the foreground location session with visibility pause/resume** - `829e5b5` (feat)
3. **Task 3: Fix the list-page store identity bug before auto-detection consumes it** - `9979335` (fix)

## Files Created/Modified
- `src/lib/location/geolocation.ts` - browser geolocation wrapper with explicit defaults and classified failures.
- `src/lib/location/proximity.ts` - 150 meter nearest-store detector with haversine distance helper.
- `src/lib/location/session.svelte.ts` - singleton foreground polling session with visibility lifecycle management.
- `src/routes/(protected)/lister/[id]/+page.svelte` - selected store label repair for composed chain/location display in history context.

## Decisions Made
- Kept browser API access out of route components so Wave 3 can remain a props-and-callbacks integration layer.
- Encoded the 150 meter store-detection threshold once in the proximity module to avoid duplicated radius constants across later phases.
- Preserved `detectedStoreId` across `stopLocationSession()` so the active selection can survive route teardown without a forced picker reset.

## Deviations from Plan

- `npm run check` could not be used as a clean plan gate because the repo already has unrelated baseline type-check failures in other modules. Wave 2 verification therefore relied on file-level acceptance checks for the new location modules and the list-page repair.

## Issues Encountered

- Existing repository-wide `npm run check` failures outside Phase 24 prevented a green whole-repo type-check signal.

## User Setup Required

None.

## Next Phase Readiness

- Wave 3 can now wire list-page UI to `beginLocationExplanation`, `confirmAutomaticStore`, `retryLocationDetection`, and `locationSession.detectedStoreId` without introducing raw geolocation access in the route.
- The list page already uses the Phase 23 composed store display model, so detected-store selection and history attribution can share one label path.
