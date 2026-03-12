---
phase: 06-history-view-and-recommendations
plan: 04
subsystem: ui
tags: [gap-closure, add-back, mutations, playwright]
requires:
  - phase: 06-history-view-and-recommendations
    provides: actionable history and recommendation add-back flows
provides:
  - unchecked-only add-back matching
  - regression coverage for restoring from checked rows
affects: [history, recommendations, lists]
tech-stack:
  added: []
  patterns: [prefer-active-row increment, insert-new-row when only checked match exists]
key-files:
  created:
    - .planning/phases/06-history-view-and-recommendations/06-04-SUMMARY.md
  modified:
    - src/lib/queries/items.ts
    - tests/history.spec.ts
    - tests/recommendations.spec.ts
key-decisions:
  - "Add-back only increments an existing unchecked row; checked matches force a new active row."
patterns-established:
  - "Restoring a previously checked item should never place the new quantity into the done section."
requirements-completed: [HIST-02, RECD-03]
duration: 20m
completed: 2026-03-11
---

# Phase 6: History View and Recommendations Summary

**Gap fix for add-back so restored items land in the active list even when a checked copy already exists**

## Performance

- **Duration:** 20m
- **Started:** 2026-03-11T22:20:00Z
- **Completed:** 2026-03-11T22:40:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Corrected the add-back mutation to ignore checked rows as quantity-increment targets.
- Added regression tests for history chooser restore and direct recommendation restore when the same item already exists as checked.

## Task Commits

Changes are verified locally but not committed in this session because the worktree still contains unrelated in-progress changes outside this gap fix.

## Files Created/Modified
- `src/lib/queries/items.ts` - prefers unchecked matches and inserts a new active row when only checked copies exist.
- `tests/history.spec.ts` - verifies chooser-based restore creates an active row and leaves the checked row in `Handlet`.
- `tests/recommendations.spec.ts` - verifies direct recommendation restore also lands in active items.

## Decisions Made

- Matching by normalized name remains valid, but only among unchecked rows for increment behavior.

## Deviations from Plan

None.

## Issues Encountered

- None.

## User Setup Required

None.

## Next Phase Readiness

- The specific UAT gap is closed and covered by targeted E2E regression tests.
- Formal re-verification of Phase 6 is the next step if you want the UAT record updated to resolved.
