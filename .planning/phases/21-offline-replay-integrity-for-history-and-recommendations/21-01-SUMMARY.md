---
phase: 21-offline-replay-integrity-for-history-and-recommendations
plan: 01
subsystem: testing
tags: [offline, replay, queue, playwright, history]
requires:
  - phase: 20-client-image-display
    provides: list/offline baseline and protected layout orchestration
provides:
  - Deterministic replay batch API with survivor reporting
  - Partial-ack queue drain that persists failed survivors only
  - Mixed replay regression proving no duplicate history rows across retry
affects: [offline-sync, history, recommendations]
tech-stack:
  added: []
  patterns: [partial acknowledgement replay, survivor-set persistence, mixed-outcome replay regression]
key-files:
  created:
    - .planning/phases/21-offline-replay-integrity-for-history-and-recommendations/deferred-items.md
  modified:
    - src/lib/offline/queue.ts
    - src/routes/(protected)/+layout.svelte
    - tests/offline.spec.ts
    - tests/helpers/history.ts
key-decisions:
  - "Queue replay now returns survivors and persisted survivor set is the only retry source."
  - "Reconnect success toast remains gated to full-batch success only (`failed === 0`)."
patterns-established:
  - "Replay contract pattern: compute succeeded/failed/survivors in queue module, keep UI orchestration thin."
  - "Offline retry regression pattern: force one targeted history insert failure and assert idempotent final history counts."
requirements-completed: []
duration: 16min
completed: 2026-03-28
---

# Phase 21 Plan 01: Offline Replay Integrity Summary

**Offline replay now uses deterministic partial acknowledgement so successful entries are removed immediately and retries only replay failed survivors without duplicating history rows.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-28T06:08:17Z
- **Completed:** 2026-03-28T06:24:21Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `ReplayBatchResult`, `replaceQueue`, and `replayBatch` in queue module for ordered mixed-outcome replay handling.
- Replaced all-or-nothing drain behavior in protected layout with survivor persistence on every reconnect drain attempt.
- Added deterministic E2E regression for success-then-failure replay and retry idempotency using item-history count assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deterministic replay-batch contract in offline queue module** - `bfd8ee6` (feat)
2. **Task 2: Replace all-or-nothing drain logic with partial-ack survivor persistence** - `769e63a` (feat)
3. **Task 3: Add mixed replay regression proving no duplicate history rows on retry** - `dd96039` (test)

## Files Created/Modified
- `src/lib/offline/queue.ts` - replay batch result contract plus survivor persistence helpers.
- `src/routes/(protected)/+layout.svelte` - drainQueue uses replayBatch and replaceQueue for deterministic partial acknowledgement.
- `tests/helpers/history.ts` - added `countHistoryRowsForItem` admin helper for exact count assertions.
- `tests/offline.spec.ts` - added mixed outcome replay regression with one forced `Brød` history failure and retry assertions.
- `.planning/phases/21-offline-replay-integrity-for-history-and-recommendations/deferred-items.md` - logged out-of-scope and environment verification issues.

## Decisions Made
- Queue module owns replay accounting (`succeeded`, `failed`, `survivors`) so callers do not re-implement per-entry replay logic.
- Reconnect toast behavior stays unchanged and is shown only when at least one replay succeeds and zero replay failures remain.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved local port blocker before Playwright run**
- **Found during:** Task 3 verification
- **Issue:** Playwright webServer startup failed because port `4173` was already in use.
- **Fix:** Detected and terminated the listener process on port `4173`, then retried targeted tests.
- **Files modified:** none
- **Verification:** Playwright proceeded to execute tests after port cleanup.
- **Committed in:** none (environment-only)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No code scope change; only execution environment unblocked.

## Auth Gates
None.

## Issues Encountered
- `npm run check` fails due pre-existing type errors outside this plan scope.
- Playwright verification remained unstable after reruns (Vite overlay interception, intermittent `ERR_CONNECTION_REFUSED`, and timeout on broader subset).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Replay flow now preserves only failed queue survivors and prevents duplicate history inserts for already-successful entries.
- Before broad regression in next phases, stabilize local test server lifecycle and clear unrelated typecheck debt listed in `deferred-items.md`.

## Self-Check: PASSED

- FOUND summary file: `.planning/phases/21-offline-replay-integrity-for-history-and-recommendations/21-01-SUMMARY.md`
- FOUND commits: `bfd8ee6`, `769e63a`, `dd96039`
