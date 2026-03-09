# Roadmap: HandleAppen

## Overview

HandleAppen delivers a store-layout-aware family grocery PWA in six dependency-ordered phases. Phase 1 establishes the auth and household foundation that every other phase depends on. Phase 2 ships the testable core loop — create list, add item, check off, sync in real-time — and begins writing purchase history from day one. Phase 3 implements the product's primary differentiator: categories sorted by Norwegian store layout, with per-store overrides. Phase 4 adds barcode scanning via a server-proxied Edge Function and a WASM polyfill for iOS. Phase 5 converts the working online app into an offline-capable PWA. Phase 6 surfaces the history data accumulated since Phase 2 as a history view and frequency-based recommendations.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Auth and Household Foundation** - Authenticated users in a household context; load-bearing RLS patterns established
- [ ] **Phase 2: Shopping Lists and Core Loop** - Create list, add item, check off, real-time sync; history logging starts here
- [ ] **Phase 3: Store Layouts and Category Ordering** - Categories sorted by Norwegian store layout; per-store overrides
- [ ] **Phase 4: Barcode Scanning** - Camera scan to add item via Edge Function proxy; WASM polyfill for iOS
- [ ] **Phase 5: PWA and Offline Support** - Installable PWA with offline mutation queue and conflict resolution
- [ ] **Phase 6: History View and Recommendations** - Browse past sessions; frequency-based and co-purchase suggestions

## Phase Details

### Phase 1: Auth and Household Foundation
**Goal**: Any family member can create an account, sign in, and belong to a household — and all downstream RLS policies can safely reference that household
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, HOUS-01, HOUS-02
**Success Criteria** (what must be TRUE):
  1. User can register with email and password and is taken to a household setup screen on first login
  2. User can sign in with Google OAuth and land in the same household as other family members
  3. User session persists across browser tab close, refresh, and app reopen without being asked to sign in again
  4. User can create a household during onboarding and see their own name listed as a member
  5. The `my_household_id()` SECURITY DEFINER function exists in the database and all RLS policies on household-scoped tables use it without recursion errors
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold SvelteKit + Supabase wiring, database migration (households/profiles/my_household_id()/RLS), Playwright setup
- [x] 01-02-PLAN.md — Auth screens (/logg-inn, /registrer), hooks.server.ts, root layouts, /auth/callback, protected route guard
- [x] 01-03-PLAN.md — /velkommen onboarding (create/join household), household members view (/husstand) with invite code

### Phase 2: Shopping Lists and Core Loop
**Goal**: Family members can create shopping lists, add items, check them off while shopping, and see changes appear on all devices within a few seconds — with every check-off written to the history log
**Depends on**: Phase 1
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, HIST-01
**Success Criteria** (what must be TRUE):
  1. User can create a named shopping list and delete it; lists are scoped to the household
  2. User can type an item name to add it to a list and remove it; items persist on reload
  3. User can check off an item while shopping; the item is visually marked done and a row is written to `item_history`
  4. A change made on one device (add, remove, check off) appears on a second logged-in device within 3 seconds without a page refresh
  5. Optimistic UI updates show the change instantly; if the write fails, the UI rolls back and shows an error
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — DB migration (lists/list_items/item_history + RLS + realtime publication), TanStack Query setup in protected layout, Wave 0 test scaffolds
- [ ] 02-02-PLAN.md — Lister home screen (list CRUD UI), BottomNav component, swipeLeft action, list query factories, logout relocated to Husstand tab
- [ ] 02-03-PLAN.md — List detail view: item add/remove/check-off with optimistic mutations, DoneSection, item_history write on check-off (HIST-01)
- [ ] 02-04-PLAN.md — Supabase Realtime subscriptions on list_items and lists tables, two-context Playwright sync test

### Phase 3: Store Layouts and Category Ordering
**Goal**: Items in every shopping list are grouped by category and ordered the way a Norwegian grocery store is laid out — and any family member can create a per-store layout that overrides the default order
**Depends on**: Phase 2
**Requirements**: CATG-01, CATG-02, CATG-03, CATG-04, CATG-05
**Success Criteria** (what must be TRUE):
  1. Items in a list are displayed grouped under category headings (e.g., Frukt og grnt, Meieri, Kjtt, Frysevarer) in the default Norwegian store order
  2. Any family member can create a named store (e.g., "Rema 1000 Majorstua") and drag categories into a custom order for that store
  3. When a list is linked to a store, its categories appear in that store's custom order; lists not linked to a store use the default order
  4. Any family member can add, rename, or delete a category; changes propagate to all devices via Realtime
  5. User can manually change an item's category from a list view; the item moves to the correct group immediately
**Plans**: 3 plans

Plans:
- [ ] 03-01: `categories` table seeded with 13 default Norwegian categories (fractional position, gaps of 1000), `stores` and `store_layouts` schema + RLS
- [ ] 03-02: Category grouping in list view using default order; store layout resolution (store override then global fallback)
- [ ] 03-03: Drag-and-drop category reorder UI (fractional midpoint position update, single UPDATE per reorder), store management settings screen
- [ ] 03-04: Per-item category assignment UI, category add/rename/delete for household members

### Phase 4: Barcode Scanning
**Goal**: User can point their phone camera at a product barcode and have the item's name and category auto-filled and ready to add to the list — on any device including iOS Safari
**Depends on**: Phase 2
**Requirements**: BARC-01, BARC-02, BARC-03, BARC-04
**Success Criteria** (what must be TRUE):
  1. User taps a "Scan" button, the camera opens, and a detected barcode triggers a product lookup without any additional user action
  2. For a recognized Norwegian product EAN, the item name and category are pre-filled in the add-item form within 2 seconds
  3. When Kassal.app does not find the EAN, the app silently retries via Open Food Facts; the user sees one result or a clear "not found" message — never two separate results
  4. Barcode scanning works in iOS Safari PWA standalone mode using the WASM polyfill; no native BarcodeDetector API is required
  5. The Kassal.app Bearer token is never visible in browser DevTools network requests; all external API calls go through the Edge Function
**Plans**: 3 plans

Plans:
- [ ] 04-01: Supabase Edge Function `/barcode/{ean}` — Kassal.app primary, Open Food Facts fallback, `product_cache` DB table with 30-day TTL, Gemini AI category/name extraction
- [ ] 04-02: Barcode scanner UI component — `barcode-detector` WASM polyfill, `getUserMedia` rear camera, `requestAnimationFrame` detection loop, explicit user gesture trigger
- [ ] 04-03: Scan-to-add flow — product prefill form, confirm to insert `list_item`, manual EAN text input fallback, graceful not-found and camera-failure states

### Phase 5: PWA and Offline Support
**Goal**: The app is installable on a mobile home screen and continues to work for core shopping actions when in-store connectivity is poor or absent — syncing queued changes when the connection returns
**Depends on**: Phase 2
**Requirements**: PWAF-01, PWAF-02
**Success Criteria** (what must be TRUE):
  1. On Android and iOS, the browser offers an "Add to Home Screen" prompt; installed app opens in standalone mode with no browser chrome
  2. When the device goes offline in the middle of shopping, the last-loaded list remains fully readable and items can still be checked off
  3. Items added, removed, or checked off while offline are queued locally and automatically synced when connectivity returns — without the user taking any action
  4. On Safari (where Background Sync is unsupported), queued mutations are replayed the next time the user opens the app; a visible indicator shows how many changes are pending sync
  5. Two devices that check off the same item while both offline do not produce a conflict error when they sync; the item stays checked
**Plans**: 3 plans

Plans:
- [ ] 05-01: `@vite-pwa/sveltekit` configuration, PWA manifest (icons, display: standalone, theme color), app shell CacheFirst precache, Supabase REST NetworkFirst strategy
- [ ] 05-02: IndexedDB mutation queue (add, remove, check-off with soft-delete semantics and idempotency keys), offline detection, optimistic UI continues to work offline
- [ ] 05-03: Workbox BackgroundSync plugin for Android, next-open replay fallback for Safari, conflict resolution (monotone OR for `is_checked`, soft deletes), pending-sync badge in UI

### Phase 6: History View and Recommendations
**Goal**: Users can browse their household's shopping history and receive useful item suggestions derived from purchase frequency and co-purchase patterns — using real data that has been accumulating since Phase 2
**Depends on**: Phase 2
**Requirements**: HIST-02, RECD-01, RECD-02, RECD-03
**Success Criteria** (what must be TRUE):
  1. User can open a history view and see past shopping sessions grouped by date and list, with per-member attribution for each checked-off item
  2. A dedicated "Anbefalinger" tab in the bottom navigation shows the household's most frequently purchased items (top items by count in the last 90 days, SQL-only, no ML)
  3. When items are already on the active list, the recommendations section shows items frequently bought in the same shopping session (co-purchase, single SQL JOIN on session time window)
  4. Before enough history exists (fewer than 10 sessions), the recommendations tab shows only the history view with a message explaining when suggestions will appear
  5. User can tap any history item or recommendation to add it to the current active list in one action
**Plans**: 3 plans

Plans:
- [ ] 06-01: History view UI — query `item_history` grouped by date/list, per-member attribution, household-scoped RLS verified
- [ ] 06-02: Frequency recommendations SQL (top items, last 90 days, per household), co-purchase SQL (JOIN on session time window), cold-start gate (min 10 sessions)
- [ ] 06-03: Recommendations tab in bottom nav, add-to-list action from history/recommendations, end-to-end flow tested with seeded history data

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

Note: Phase 3 depends on Phase 2. Phase 4 and Phase 5 also depend on Phase 2 but are independent of each other and of Phase 3 — they may be planned in parallel after Phase 2 completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth and Household Foundation | 3/3 | Complete | 2026-03-09 |
| 2. Shopping Lists and Core Loop | 3/4 | In Progress|  |
| 3. Store Layouts and Category Ordering | 0/4 | Not started | - |
| 4. Barcode Scanning | 0/3 | Not started | - |
| 5. PWA and Offline Support | 0/3 | Not started | - |
| 6. History View and Recommendations | 0/3 | Not started | - |
