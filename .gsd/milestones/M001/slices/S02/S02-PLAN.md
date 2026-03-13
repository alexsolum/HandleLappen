# S02: Shopping Lists And Core Loop

**Goal:** Lay the complete foundation for Phase 2: database schema, TypeScript types, TanStack Query client setup, and Wave 0 test scaffolds.
**Demo:** Lay the complete foundation for Phase 2: database schema, TypeScript types, TanStack Query client setup, and Wave 0 test scaffolds.

## Must-Haves


## Tasks

- [x] **T01: Plan 01**
  - Lay the complete foundation for Phase 2: database schema, TypeScript types, TanStack Query client setup, and Wave 0 test scaffolds.

Purpose: Every subsequent Phase 2 plan depends on the schema existing, TanStack Query being available in the component tree, and test stubs being present so verify commands do not fail with "file not found."
Output: Migration SQL file, extended database.ts types, QueryClientProvider in protected layout, seeded test helper, and three stub spec files.
- [x] **T02: Plan 02**
  - Build the Lister home screen — the app's entry point after login — with full list CRUD, bottom navigation, and the swipe-left delete gesture.

Purpose: This is the first screen users interact with after Phase 1. It establishes the list management mental model, the bottom nav structure that all Phase 2-6 screens build on, and the swipe-left delete pattern reused in plan 02-03 for items.
Output: Working Lister home screen, BottomNav component, swipeLeft action, list query factories, relocated logout button.
- [x] **T03: Plan 03**
  - Build the list detail view — where shopping actually happens — with item add/remove/check-off, the persistent bottom input bar, the collapsible Done section, and the HIST-01 history write on check-off.

Purpose: This is the primary shopping interaction surface. Every mutation uses optimistic updates so the app feels instant even on a slow connection. The history write happens in the same mutationFn as the check-off toggle — never in a trigger — so it is visible to the Svelte layer and testable.
Output: Full list detail page with working item CRUD, check-off flow, Done section, and verified item_history inserts.
- [x] **T04: Plan 04**
  - Wire Supabase Realtime subscriptions so that changes made on one device appear on all other devices viewing the same list or home screen within 3 seconds — without a page refresh.

Purpose: This is the LIST-06 requirement and the defining UX of a real-time collaborative shopping list. The implementation is intentionally minimal: `postgres_changes` events → `invalidateQueries`. No manual cache splicing, no complex merge logic — TanStack Query re-fetches and the UI updates.
Output: Two `$effect` blocks in the two key pages, and a two-context Playwright test proving sub-3-second cross-device sync.

## Files Likely Touched

