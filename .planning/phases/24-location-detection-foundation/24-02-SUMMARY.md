---
phase: 24-location-detection-foundation
plan: 02
subsystem: list-page-location-ux
tags: [geolocation, list-page, permission-flow, manual-fallback, playwright, iphone-pwa]
requires:
  - phase: 24-location-detection-foundation
    provides: geolocation wrapper, proximity matcher, foreground polling session, Wave 0 location tests
provides:
  - Inline two-step location permission flow above the store picker
  - Always-visible manual store picker during idle, denied, unavailable, and active states
  - Real Playwright coverage for permission gating, foreground resume, and manual fallback
  - Approved installed-iPhone PWA checkpoint for prompt, deny/retry, unavailable, and background/resume behavior
affects: [24-location-detection-foundation, 25-shopping-mode, list-page-store-selection]
tech-stack:
  added: []
  patterns: [props-driven location card, session-driven store precedence, empty-state manual picker persistence, physical-iPhone checkpoint]
key-files:
  created:
    - src/lib/components/stores/LocationPermissionCard.svelte
  modified:
    - src/lib/components/stores/StoreSelector.svelte
    - src/routes/(protected)/lister/[id]/+page.svelte
    - tests/location-detection.spec.ts
    - tests/categories.spec.ts
    - tests/helpers/categories.ts
key-decisions:
  - "The manual store picker stays rendered above empty-state list content so the fallback path exists before any items are added."
  - "Detected store IDs override manual selection through page-owned state, while all geolocation browser access remains inside src/lib/location/*."
  - "Phase 24 closes only after both the Playwright suite and the installed-iPhone PWA checklist pass."
requirements-completed: [LOCATE-01, LOCATE-02, LOCATE-03]
duration: 38min
completed: 2026-03-29
---

# Phase 24 Plan 02: Location Detection UX Summary

**Phase 24 now exposes a real user-facing location flow on the list page: explanation-first permission gating, automatic nearby-store selection, persistent manual fallback, and passing browser plus physical-iPhone validation.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-03-29T13:15:00Z
- **Completed:** 2026-03-29T13:53:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `src/lib/components/stores/LocationPermissionCard.svelte` with the required idle, explaining, locating, active, denied, and unavailable states plus the locked copy anchors from the plan.
- Updated `src/routes/(protected)/lister/[id]/+page.svelte` to wire `beginLocationExplanation`, `confirmAutomaticStore`, `retryLocationDetection`, `refreshLocationStores`, `locationSession.detectedStoreId`, and `stopLocationSession` into the real list page while keeping `selectedStoreId` page-owned.
- Updated `src/lib/components/stores/StoreSelector.svelte` so `Velg butikk manuelt` stays visible as the no-selection label and works even on empty lists.
- Replaced the Wave 0 scaffold skips in `tests/location-detection.spec.ts` with real assertions covering permission gating, foreground visibility resume, and denied/unavailable fallback behavior.
- Realigned `tests/categories.spec.ts` and `tests/helpers/categories.ts` with the Phase 23 store schema and Phase 24 manual-picker copy so prior list/store regressions still validate the current model.
- Recorded an approved installed-iPhone PWA verification checkpoint for prompt timing, denied recovery, unavailable fallback, and background/resume refresh behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the list-page location UX and keep manual selection always visible** - `95dd16d` (feat)
2. **Task 1 follow-up: Align prior category regressions with Phase 23/24 store contracts** - `01fe689` (test)
3. **Task 2: Validate installed-iPhone PWA behavior before Phase 24 closes** - human checkpoint approved in conversation after `npx playwright test tests/location-detection.spec.ts` passed

## Files Created/Modified
- `src/lib/components/stores/LocationPermissionCard.svelte` - compact inline location explanation and recovery states.
- `src/lib/components/stores/StoreSelector.svelte` - manual picker wording now matches the required fallback copy.
- `src/routes/(protected)/lister/[id]/+page.svelte` - session-driven location wiring, detected-store precedence, and always-visible picker layout.
- `tests/location-detection.spec.ts` - Phase 24 e2e coverage for permission flow, foreground polling resume, and manual fallback.
- `tests/categories.spec.ts` - regression expectations updated to current picker copy and admin form.
- `tests/helpers/categories.ts` - store seeding updated to `chain` + `location_name` schema.

## Decisions Made
- Rendered the location card and manual picker before the item-content branching so empty lists still expose the fallback path.
- Kept browser geolocation calls out of the route component entirely; the route only invokes session actions and reacts to session state.
- Treated regression failures caused by stale test/schema assumptions as phase-close work and fixed them before verification rather than waiving them.

## Deviations from Plan

- None in product behavior. The only extra work was updating older regression tests to the Phase 23 store schema and Phase 24 picker copy so the regression gate measured current contracts correctly.

## Issues Encountered

- Initial Playwright selector snapshots exposed a `StoreSelector` bug where a `$derived(() => ...)` expression rendered the function source into the button label. This was fixed during Wave 3 before final validation.

## User Setup Required

None.

## Next Phase Readiness

- Phase 25 can now build shopping-mode activation on top of a validated detected-store ID, explicit permission gating, and an approved iPhone PWA permission flow.
- The list page already preserves manual store selection as a fallback, so shopping-mode work can focus on banner/layout/history behavior rather than permission recovery.
