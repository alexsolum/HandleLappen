---
phase: 21-offline-replay-integrity-for-history-and-recommendations
plan: 02
subsystem: testing
tags: [offline, replay, recommendations, history, playwright]
requires:
  - phase: 21-offline-replay-integrity-for-history-and-recommendations
    provides: replay survivor persistence and mixed-outcome queue semantics
provides:
  - List/item-scoped history count helper with exact count query for deterministic assertions
  - Recommendation replay-retry regression guarding against duplicate source count inflation
  - Active-list recommendation UI assertion after replay retry cycle
affects: [offline-sync, recommendations, history-integrity]
tech-stack:
  added: []
  patterns: [history source-count assertion helper, forced single-request replay failure regression]
key-files:
  created: []
  modified:
    - tests/helpers/history.ts
    - tests/recommendations.spec.ts
key-decisions:
  - "countHistoryRowsForItem remains backward compatible by delegating to countHistoryRowsByListAndItem."
  - "Replay integrity regression validates both source-count idempotency and recommendation-page usability in one flow."
patterns-established:
  - "Recommendation replay test pattern: force one item_history POST failure for a specific item, then verify survivor replay increments exactly once."
  - "Recommendation assertions use list+item exact counts instead of ad-hoc Supabase queries in test bodies."
requirements-completed: []
duration: 13min
completed: 2026-03-28
---

# Phase 21 Plan 02: Offline Replay Recommendation Integrity Summary

**Recommendation replay-retry regression now proves mixed replay outcomes do not inflate source history counts while `/anbefalinger` remains functional for the active list after retry.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-28T07:31:00Z
- **Completed:** 2026-03-28T07:44:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `countHistoryRowsByListAndItem(listId, itemName)` helper with exact-count query shape and explicit error throw.
- Added replay-retry recommendation regression test `stable after replay retry does not inflate recommendation source counts`.
- Verified assertions for queue survivor behavior: `Melk` increments exactly once, `Brød` increments only after retry, and recommendation rows still render.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend recommendation test helpers with explicit source-count assertions** - `14cde91` (feat)
2. **Task 2: Add replay-retry recommendation stability regression** - `6684654` (test)

## Files Created/Modified
- `tests/helpers/history.ts` - added `countHistoryRowsByListAndItem` and preserved backward compatibility via delegation.
- `tests/recommendations.spec.ts` - added end-to-end replay retry regression with targeted `item_history` failure interception and recommendation UI assertions.

## Decisions Made
- Kept legacy helper usage intact by routing `countHistoryRowsForItem` through the new list+item helper.
- Used one shared route pattern constant for `route/unroute` so acceptance criteria for the interceptor pattern remain deterministic.

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates
None.

## Issues Encountered
- `npm run check` fails due pre-existing, out-of-scope typecheck errors unrelated to this plan's touched files.
- Playwright verification commands fail in `beforeEach` login due existing Vite overlay caused by missing `src/service-worker.js` in the local environment.
- These issues were logged in `.planning/phases/21-offline-replay-integrity-for-history-and-recommendations/deferred-items.md`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Recommendation integrity coverage now includes replay survivor correctness in the recommendation flow.
- Environment/typecheck debt in deferred items should be resolved before relying on broad local Playwright gates.

## Self-Check: PASSED

- FOUND summary file: `.planning/phases/21-offline-replay-integrity-for-history-and-recommendations/21-02-SUMMARY.md`
- FOUND commits: `14cde91`, `6684654`

