# Roadmap: HandleAppen

## Overview

HandleAppen shipped its v1.0 foundation in eight phases covering auth, shared lists, store-layout ordering, barcode scanning, offline/PWA behavior, and recommendations. Milestone v1.1 continues from that base with three tightly scoped phases focused on mobile usability and faster recurring-item entry. The work starts at Phase 9 to preserve the existing milestone history and keeps each new requirement mapped to exactly one phase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Auth and Household Foundation** - Authenticated users in a household context; load-bearing RLS patterns established
- [x] **Phase 2: Shopping Lists and Core Loop** - Create list, add item, check off, real-time sync; history logging starts here (completed 2026-03-10)
- [x] **Phase 3: Store Layouts and Category Ordering** - Categories sorted by Norwegian store layout; per-store overrides (completed 2026-03-10)
- [x] **Phase 4: Barcode Scanning** - Camera scan to add item via Edge Function proxy; WASM polyfill for iOS (completed 2026-03-11)
- [x] **Phase 5: PWA and Offline Support** - Installable PWA with offline mutation queue and conflict resolution (completed 2026-03-12)
- [x] **Phase 6: History View and Recommendations** - Browse past sessions; frequency-based and co-purchase suggestions (completed 2026-03-12)
- [x] **Phase 7: Verification and Evidence Closure** - Produce formal verification artifacts for Phases 4-6 and restore requirement-level auditability (completed 2026-03-12)
- [x] **Phase 8: Traceability Reconciliation and Milestone Re-Audit** - Align roadmap/requirements bookkeeping with delivered work and rerun milestone audit (completed 2026-03-12)
- [x] **Phase 9: Mobile Layout Hardening** - Remove horizontal overflow, constrain dialogs to mobile viewports, and make the bottom navigation thumb-friendly and fixed (completed 2026-03-12)
- [x] **Phase 10: Inline Quantity Controls** - Make quantity editing fast from the main list and enforce quantity `1` as the default add state (completed 2026-03-12)
- [x] **Phase 11: Household Item Memory and Suggestions** - Reuse past household items as typeahead suggestions with remembered categories during item entry (completed 2026-03-12)

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
- [x] 02-01-PLAN.md — DB migration (lists/list_items/item_history + RLS + realtime publication), TanStack Query setup in protected layout, Wave 0 test scaffolds
- [x] 02-02-PLAN.md — Lister home screen (list CRUD UI), BottomNav component, swipeLeft action, list query factories, logout relocated to Husstand tab
- [x] 02-03-PLAN.md — List detail view: item add/remove/check-off with optimistic mutations, DoneSection, item_history write on check-off (HIST-01)
- [x] 02-04-PLAN.md — Supabase Realtime subscriptions on list_items and lists tables, two-context Playwright sync test

### Phase 3: Store Layouts and Category Ordering
**Goal**: Items in every shopping list are grouped by category and ordered the way a Norwegian grocery store is laid out — and any family member can create a per-store layout that overrides the default order
**Depends on**: Phase 3
**Requirements**: CATG-01, CATG-02, CATG-03, CATG-04, CATG-05
**Success Criteria** (what must be TRUE):
  1. Items in a list are displayed grouped under category headings (e.g., Frukt og grønt, Meieri og egg, Kjøtt og fisk, Kjøl og frys) in the default Norwegian store order
  2. Any family member can create a named store (e.g., "Rema 1000 Majorstua") and drag categories into a custom order for that store
  3. When a store is selected in a list, its categories appear in that store's custom order; lists with no store selected use the default order
  4. Any family member can add, rename, or delete a category; changes propagate to all devices via Realtime
  5. User can manually change an item's category from a list view; the item moves to the correct group immediately
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — DB migration (categories/stores/store_layouts + RLS + seed_default_categories() function), Wave 0 Playwright test scaffold
- [x] 03-02-PLAN.md — Category-grouped list view (section headers, Andre varer catch-all, store selector pill + session-only state, StoreSelector bottom sheet)
- [x] 03-03-PLAN.md — Butikker tab activation, store list screen, per-store drag-to-reorder layout (svelte-dnd-action), default layout screen with category CRUD + Realtime
- [x] 03-04-PLAN.md — Per-item category assignment: long-press detail sheet, auto-category picker modal after add, optimistic assignCategoryMutation

### Phase 4: Barcode Scanning
**Goal**: User can point their phone camera at a product barcode and have the item's name and category auto-filled and ready to add to the list — on any device including iOS Safari
**Depends on**: Phase 3
**Requirements**: BARC-01, BARC-02, BARC-03, BARC-04
**Success Criteria** (what must be TRUE):
  1. User taps a "Scan" button, the camera opens, and a detected barcode triggers a product lookup without any additional user action
  2. For a recognized Norwegian product EAN, the item name and category are pre-filled in the add-item form within 2 seconds
  3. When Kassal.app does not find the EAN, the app silently retries via Open Food Facts; the user sees one result or a clear "not found" message — never two separate results
  4. Barcode scanning works in iOS Safari PWA standalone mode using the WASM polyfill; no native BarcodeDetector API is required
  5. The Kassal.app Bearer token is never visible in browser DevTools network requests; all external API calls go through the Edge Function
**Plans**: 3 plans

Plans:
- [x] 04-01: Supabase Edge Function `barcode-lookup` — Kassal.app primary, Open Food Facts fallback, `barcode_product_cache` table with 30-day TTL, Gemini category/name normalization
- [x] 04-02: Barcode scanner UI component — iOS-safe scanner library/polyfill, rear-camera preference, explicit scan trigger, manual EAN fallback
- [x] 04-03: Scan-to-add flow — unified lookup/result sheet, confirm to insert `list_item`, manual EAN retry, graceful not-found and camera-failure states

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
- [x] 05-01-PLAN.md — `@vite-pwa/sveltekit` + injectManifest config, custom service-worker.ts (precache + Supabase NetworkFirst), PWA icons, SW registration in root layout, Wave 0 test stubs
- [x] 05-02-PLAN.md — IndexedDB queue (idb-keyval), offline.svelte.ts global store, checkOff mutation offline intercept, BottomNav offline badge, ItemInput disabled when offline
- [x] 05-03-PLAN.md — Queue drain on reconnect + next-open replay (Safari), success toast "Endringer synkronisert", monotone OR conflict resolution, full Playwright offline test suite

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
- [x] 06-01: History view UI — query `item_history` grouped by date/list, per-member attribution, household-scoped RLS verified
- [x] 06-02: Frequency recommendations SQL (top items, last 90 days, per household), co-purchase SQL (JOIN on session time window), cold-start gate (min 10 sessions)
- [x] 06-03: Recommendations tab in bottom nav, add-to-list action from history/recommendations, end-to-end flow tested with seeded history data

### Phase 7: Verification and Evidence Closure
**Goal**: Restore the missing verification chain for the delivered late-phase work so barcode, offline/PWA, and history/recommendation requirements can pass milestone audit
**Depends on**: Phases 4, 5, 6
**Requirements**: BARC-01, BARC-02, BARC-03, BARC-04, PWAF-01, PWAF-02, HIST-02, RECD-01, RECD-02, RECD-03
**Gap Closure**: Closes milestone audit orphaned-requirement gaps caused by missing `04-VERIFICATION.md`, `05-VERIFICATION.md`, and `06-VERIFICATION.md`
**Success Criteria** (what must be TRUE):
  1. Phase 4 has a `04-VERIFICATION.md` that maps BARC-01..04 to concrete code/tests/manual checkpoints and records a clear phase verdict
  2. Phase 5 has a `05-VERIFICATION.md` that maps PWAF-01..02 to concrete code/tests/UAT evidence and records any residual risk explicitly
  3. Phase 6 has a `06-VERIFICATION.md` that maps HIST-02 and RECD-01..03 to concrete code/tests/UAT evidence and records a clear phase verdict
  4. The orphaned requirement IDs from the milestone audit are now covered by phase verification artifacts rather than only summaries/UAT
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — Verify Phase 4 barcode delivery against code, tests, and any required manual checkpoints; write `04-VERIFICATION.md`
- [x] 07-02-PLAN.md — Verify Phase 5 PWA/offline delivery against code, tests, and UAT; write `05-VERIFICATION.md`
- [x] 07-03-PLAN.md — Verify Phase 6 history/recommendation delivery against code, tests, and UAT; write `06-VERIFICATION.md`

### Phase 8: Traceability Reconciliation and Milestone Re-Audit
**Goal**: Bring central planning state back into sync with the delivered and newly verified milestone so v1.0 can pass audit cleanly
**Depends on**: Phase 7
**Requirements**: none (bookkeeping and release closure)
**Gap Closure**: Closes roadmap drift, requirements traceability drift, and reruns the milestone audit after verification closure
**Success Criteria** (what must be TRUE):
  1. `ROADMAP.md` reflects the true completion state of Phases 4-7 and no longer reports stale in-progress/planned states for delivered work
  2. `REQUIREMENTS.md` top-level checkboxes and traceability table match the verified completion state for BARC-01..04, PWAF-01..02, HIST-02, and RECD-01..03
  3. A fresh milestone audit no longer reports orphaned late-phase requirements
  4. Milestone completion can proceed from planning state without contradictory source documents
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Reconcile roadmap progress and phase completion metadata after Phase 7 verification artifacts exist
- [x] 08-02-PLAN.md — Reconcile requirement traceability/checklists, rerun milestone audit, and record milestone closure readiness

### Phase 9: Mobile Layout Hardening
**Goal**: The app behaves like a stable mobile app on phone screens, with dialogs fully contained in the viewport and a bottom navigation that is fixed and easy to tap
**Depends on**: Phase 5
**Requirements**: MOBL-01, MOBL-02, MOBL-03
**Success Criteria** (what must be TRUE):
  1. Add-item and related dialogs fit within common mobile viewport widths without any content rendering off-screen
  2. Horizontal scrolling is eliminated across the primary signed-in app views and dialogs on mobile-sized screens
  3. The bottom navigation stays pinned to the viewport bottom during list use and each tab has a larger, thumb-friendly tap target
  4. Mobile layout fixes do not regress desktop usability or break existing PWA standalone behavior
**Plans**: 3 plans

Plans:
- [x] 09-01-PLAN.md — Audit and fix viewport overflow sources, modal widths, and container constraints for signed-in mobile screens
- [x] 09-02-PLAN.md — Rework bottom navigation sizing, safe-area spacing, and fixed positioning for mobile/PWA use
- [x] 09-03-PLAN.md — Add focused mobile viewport verification for dialogs, horizontal overflow, and fixed-nav behavior

### Phase 10: Inline Quantity Controls
**Goal**: Users can adjust quantities quickly from the shopping list itself, and newly added items always start from a predictable quantity of `1`
**Depends on**: Phase 2
**Requirements**: LIST-07, LIST-08
**Success Criteria** (what must be TRUE):
  1. Each list item exposes clear inline controls to increase or decrease quantity without opening the detail sheet
  2. Inline quantity updates feel immediate and stay in sync across devices using the existing list mutation flow
  3. New typed, suggested, and barcode-assisted item adds default to quantity `1` unless the user changes the value before saving
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Add inline quantity controls and optimistic quantity mutations to the list UI
- [x] 10-02-PLAN.md — Normalize item-creation paths so new items always persist with quantity `1` by default and verify the behavior

### Phase 11: Household Item Memory and Suggestions
**Goal**: Recurring household items become fast to re-add through typeahead suggestions that remember prior category choices
**Depends on**: Phases 2 and 3
**Requirements**: SUGG-01, SUGG-02, SUGG-03
**Success Criteria** (what must be TRUE):
  1. Typing in the add-item field shows household-specific suggestions from previously added items
  2. The suggestion list narrows as the user types more characters and remains usable on small mobile screens
  3. Selecting a suggestion fills the item name and restores its remembered category automatically
  4. Remembered-item behavior works for both manual entry and recurring shopping across multiple lists in the same household
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md — Add household item-memory data source and queries for suggestion search
- [x] 11-02-PLAN.md — Build mobile-friendly typeahead suggestion UI and selection behavior in the add-item flow
- [x] 11-03-PLAN.md — Persist and reuse remembered categories for suggested items, then verify recurring-item behavior end to end

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

Note: Phase 9 depends on the signed-in mobile shell delivered by earlier phases. Phase 10 builds on the existing list mutation loop from Phase 2. Phase 11 depends on the item and category systems already delivered in Phases 2 and 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth and Household Foundation | 3/3 | Complete | 2026-03-09 |
| 2. Shopping Lists and Core Loop | 4/4 | Complete   | 2026-03-10 |
| 3. Store Layouts and Category Ordering | 4/4 | Complete | 2026-03-10 |
| 4. Barcode Scanning | 3/3 | Complete | 2026-03-11 |
| 5. PWA and Offline Support | 3/3 | Complete | 2026-03-12 |
| 6. History View and Recommendations | 3/3 | Complete | 2026-03-12 |
| 7. Verification and Evidence Closure | 3/3 | Complete | 2026-03-12 |
| 8. Traceability Reconciliation and Milestone Re-Audit | 2/2 | Complete | 2026-03-12 |
| 9. Mobile Layout Hardening | 3/3 | Complete | 2026-03-12 |
| 10. Inline Quantity Controls | 2/2 | Complete | 2026-03-12 |
| 11. Household Item Memory and Suggestions | 3/3 | Complete | 2026-03-12 |

