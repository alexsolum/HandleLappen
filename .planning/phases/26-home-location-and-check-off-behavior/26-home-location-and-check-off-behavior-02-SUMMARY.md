---
phase: 26-home-location-and-check-off-behavior
plan: 02
subsystem: testing
tags: [sveltekit, supabase, playwright, offline-queue, geolocation]
requires:
  - phase: 26-home-location-and-check-off-behavior
    provides: "Private user home-location storage and settings flow from plan 01"
provides:
  - "100m saved-home cleanup branching on the list page"
  - "Shopping-mode precedence over at-home cleanup"
  - "Offline queue replay that distinguishes home-delete from history-toggle"
  - "Phase 26 regression coverage across admin, privacy, list, offline, and shopping-mode flows"
affects: [shopping-mode, offline-sync, item-history, home-location]
tech-stack:
  added: []
  patterns: [page-scoped private home-location loads, explicit replay modes for offline mutations]
key-files:
  created: []
  modified:
    - src/lib/location/proximity.ts
    - src/lib/offline/queue.ts
    - src/lib/queries/items.ts
    - src/routes/(protected)/lister/[id]/+page.server.ts
    - src/routes/(protected)/lister/[id]/+page.svelte
    - tests/home-location.spec.ts
    - tests/offline.spec.ts
key-decisions:
  - "List-page load reads the signed-in user's home location directly from user_home_locations instead of widening protected layout data."
  - "Offline check-off replay now uses explicit home-delete versus history-toggle queue entries so at-home cleanup never inserts item_history."
patterns-established:
  - "Home cleanup is decided before history insertion and before offline queue enqueueing."
  - "Phase-level Playwright regressions assert user-visible outcomes rather than internal queue debug counters."
requirements-completed: [CHKOFF-02]
duration: 33min
completed: 2026-03-29
---

# Phase 26 Plan 02: Home Location And Check-off Behavior Summary

**100m saved-home cleanup now deletes list items without history pollution, while shopping-mode and offline replay keep explicit history-toggle semantics.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-03-29T19:14:31Z
- **Completed:** 2026-03-29T19:47:23Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Loaded the signed-in user's persisted home location on the list page and passed it into check-off branching with runtime location state.
- Added 100m home detection, at-home delete-before-history behavior, and a subtle list-page toast without breaking shopping-mode precedence.
- Extended offline replay to distinguish home-delete from history-toggle and closed Phase 26 with green admin, privacy, offline, and shopping-mode regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Branch list check-off behavior for near-home cleanup with shopping-mode precedence** - `22fc80a` (feat)
2. **Task 2: Extend the offline queue contract so at-home cleanup replays correctly** - `c54bde6` (feat)
3. **Task 3: Finalize Phase 26 regression coverage across settings, privacy, list, and offline flows** - `7088182` (test)

## Files Created/Modified
- `src/lib/location/proximity.ts` - Adds the dedicated 100m home-detection radius helper.
- `src/lib/offline/queue.ts` - Encodes and replays `home-delete` versus `history-toggle` queue entries.
- `src/lib/queries/items.ts` - Branches check-offs into shopping history, home cleanup, or offline replay modes.
- `src/routes/(protected)/lister/[id]/+page.server.ts` - Loads the persisted home location for the signed-in user.
- `src/routes/(protected)/lister/[id]/+page.svelte` - Passes home/runtime location context into check-offs and renders the at-home cleanup toast.
- `tests/home-location.spec.ts` - Covers 100m saved-home cleanup, shopping-mode precedence, and delete-home fallback.
- `tests/offline.spec.ts` - Covers offline home-delete replay and survivor handling for mixed replay outcomes.

## Decisions Made
- Kept the home-location read page-scoped on the list route so private coordinates stay out of shared layout data.
- Used explicit replay modes in the offline queue rather than inferring behavior from `isChecked`, because delete-at-home and history-toggle have different persistence effects.
- Stabilized offline regressions around durable user-visible outcomes and database side effects instead of relying on transient debug counters.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The original offline regression file relied on queue debug counters and broad button locators that became brittle under the updated replay flow. The assertions were narrowed to stable UI and persistence outcomes during Task 3.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 26 is fully covered by Playwright across admin navigation, privacy boundaries, online home cleanup, offline home replay, and shopping-mode precedence.
- No blockers remain for subsequent planning work.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/26-home-location-and-check-off-behavior/26-home-location-and-check-off-behavior-02-SUMMARY.md`.
- Task commits `22fc80a`, `c54bde6`, and `7088182` are present in git history.

---
*Phase: 26-home-location-and-check-off-behavior*
*Completed: 2026-03-29*
