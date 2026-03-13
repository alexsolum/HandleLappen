# S05: Pwa And Offline Support

**Goal:** Install and configure `@vite-pwa/sveltekit` with a custom TypeScript service worker, PWA manifest, and static icons to make the app installable on Android home screens — satisfying PWAF-01.
**Demo:** Install and configure `@vite-pwa/sveltekit` with a custom TypeScript service worker, PWA manifest, and static icons to make the app installable on Android home screens — satisfying PWAF-01.

## Must-Haves


## Tasks

- [x] **T01: Plan 01**
  - Install and configure `@vite-pwa/sveltekit` with a custom TypeScript service worker, PWA manifest, and static icons to make the app installable on Android home screens — satisfying PWAF-01.

Purpose: Without a compliant manifest + service worker, browsers will not offer "Add to Home Screen". This plan wires the entire PWA infrastructure including the app shell precache and Supabase REST NetworkFirst strategy that plan 05-02 relies on for offline reads.

Output: Configured vite plugin, compiled service worker, manifest linked in HTML, icons in static/, SW registered in root layout, Wave 0 test stub files for pwa.spec.ts and offline.spec.ts.
- [x] **T02: Plan 02**
  - Build the offline mutation queue infrastructure and wire it into the existing TanStack Query check-off mutation. Add the BottomNav offline badge, disable the add-item input when offline, and make swipe-to-remove non-interactive when offline — so the in-store check-off flow is completely uninterrupted when connectivity is poor.

Purpose: This plan is the core of PWAF-02. The service worker (plan 05-01) handles read caching so the list is visible offline. This plan handles write queueing so check-offs made offline are never lost and the UI never shows errors or spinners during offline operation.

Output: `src/lib/offline/queue.ts`, expanded `src/lib/stores/offline.svelte.ts`, modified `src/lib/queries/items.ts` (check-off only), BottomNav badge, disabled ItemInput, guarded swipe action in ItemRow.
- [ ] **T03: Plan 03**
  - Wire the queue drain into the protected layout so check-offs queued while offline are replayed when connectivity returns (or on next app open for Safari). Implement the success toast. Write full Playwright offline tests covering the complete PWAF-02 success criteria.

Purpose: Plans 05-01 and 05-02 built the infrastructure. This plan closes the loop — syncing actually happens and is tested. Without this plan, queued items remain in IndexedDB indefinitely.

Output: Modified `src/routes/(protected)/+layout.svelte` with reconnect handler and next-open replay. Complete `tests/offline.spec.ts` replacing the stub from plan 05-01.

## Files Likely Touched

