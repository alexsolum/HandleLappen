# T02: Plan 02

**Slice:** S05 — **Milestone:** M001

## Description

Build the offline mutation queue infrastructure and wire it into the existing TanStack Query check-off mutation. Add the BottomNav offline badge, disable the add-item input when offline, and make swipe-to-remove non-interactive when offline — so the in-store check-off flow is completely uninterrupted when connectivity is poor.

Purpose: This plan is the core of PWAF-02. The service worker (plan 05-01) handles read caching so the list is visible offline. This plan handles write queueing so check-offs made offline are never lost and the UI never shows errors or spinners during offline operation.

Output: `src/lib/offline/queue.ts`, expanded `src/lib/stores/offline.svelte.ts`, modified `src/lib/queries/items.ts` (check-off only), BottomNav badge, disabled ItemInput, guarded swipe action in ItemRow.
