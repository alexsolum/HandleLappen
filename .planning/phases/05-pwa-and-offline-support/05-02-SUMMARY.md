---
phase: 05-pwa-and-offline-support
plan: 02
subsystem: offline-write-queue
tags: [offline, indexeddb, tanstack-query, optimistic-ui, svelte]
requires:
  - phase: 05-01
    provides: pwa shell caching and installability foundation
provides:
  - IndexedDB-backed offline mutation queue with deduplication
  - Global online/pending-count store for list UI state
  - Offline interception for check-off mutations without optimistic rollback
  - BottomNav pending badge plus offline-safe item-add and swipe-delete UI
affects: [05-03, list-checkoff-flow, bottom-nav-status]
tech-stack:
  added: []
  patterns: [deduplicated queue by item id, module-level offline store init, offline-safe optimistic mutation]
key-files:
  created:
    - src/lib/offline/queue.ts
    - src/lib/stores/offline.svelte.ts
  modified:
    - src/lib/queries/items.ts
    - src/lib/components/lists/BottomNav.svelte
    - src/lib/components/items/ItemInput.svelte
    - src/lib/components/items/ItemRow.svelte
key-decisions:
  - "The offline store self-initializes on the client so offline badges and disabled controls work as soon as the list UI imports it."
  - "Offline check-off mutations skip query invalidation entirely while offline so optimistic state is preserved until replay."
patterns-established:
  - "Queued write state is represented globally through pendingCount rather than per-item pending markers."
  - "Unsupported offline actions are disabled proactively instead of surfacing mutation failures."
requirements-completed: [PWAF-02]
duration: 20 min
completed: 2026-03-11
---

# Phase 5 Plan 2: Offline Queue and UI Guardrails Summary

**Offline check-off queueing with pending-sync badges, optimistic mutation persistence, and list UI guardrails for unsupported offline actions**

## Performance

- **Duration:** 20 min
- **Completed:** 2026-03-11
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added the IndexedDB queue and a shared offline store that tracks connectivity and pending mutation count.
- Intercepted check-off mutations while offline so optimistic changes persist locally and queued toggles replace older entries for the same item.
- Surfaced offline state in the BottomNav and disabled add/remove entry points that are explicitly out of scope offline.

## Task Commits

Each task was committed atomically:

1. **Task 1: IndexedDB queue module and offline store** - `2b66b65` (feat)
2. **Task 2: Offline intercept in checkOff mutation, BottomNav badge, disabled ItemInput, guarded swipe** - `9a9f2a2` (feat)

## Files Created/Modified

- `src/lib/offline/queue.ts` - Implements queue enqueue/list/clear/replay with deduplication by item id.
- `src/lib/stores/offline.svelte.ts` - Tracks `isOnline` and `pendingCount`, initializes browser listeners, and refreshes queue counts.
- `src/lib/queries/items.ts` - Queues offline check-offs, reuses optimistic state, and suppresses offline invalidation.
- `src/lib/components/lists/BottomNav.svelte` - Adds the offline dot and pending-count badge on the Lister tab.
- `src/lib/components/items/ItemInput.svelte` - Disables add/scan controls while offline with Norwegian affordances.
- `src/lib/components/items/ItemRow.svelte` - Keeps swipe gesture behavior inert when offline so delete is non-interactive.

## Decisions Made

- Treated the `Scan` button as part of the offline-disabled add flow because barcode lookup still culminates in a new item insert, which remains online-only in this phase.
- Initialized the offline store at module load on the client to avoid touching protected layout before the queue-drain work in plan `05-03`.

## Deviations from Plan

None.

## Issues Encountered

- `npm run build` passes for the new offline queue and UI changes, but repo-wide `npm run check` is still blocked by pre-existing barcode/store typing issues outside this plan's files.

## User Setup Required

None.

## Next Phase Readiness

- Plan `05-03` can now drain queued toggles, clear the BottomNav badge, and expose a reconnect toast without adding more queue primitives.
- The offline UI state is already globally visible, so replay logic only needs to update the same shared pending-count source.

## Self-Check: PASSED

- Found `.planning/phases/05-pwa-and-offline-support/05-02-SUMMARY.md`
- Found commit `2b66b65`
- Found commit `9a9f2a2`

---
*Phase: 05-pwa-and-offline-support*
*Completed: 2026-03-11*
