# T03: Plan 03

**Slice:** S05 — **Milestone:** M001

## Description

Wire the queue drain into the protected layout so check-offs queued while offline are replayed when connectivity returns (or on next app open for Safari). Implement the success toast. Write full Playwright offline tests covering the complete PWAF-02 success criteria.

Purpose: Plans 05-01 and 05-02 built the infrastructure. This plan closes the loop — syncing actually happens and is tested. Without this plan, queued items remain in IndexedDB indefinitely.

Output: Modified `src/routes/(protected)/+layout.svelte` with reconnect handler and next-open replay. Complete `tests/offline.spec.ts` replacing the stub from plan 05-01.
