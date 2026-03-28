# Roadmap: HandleAppen

## Overview

HandleAppen shipped its v1.0 foundation in eight phases covering auth, shared lists, store-layout ordering, barcode scanning, offline/PWA behavior, and recommendations. Milestone v1.1 continued from that base with three tightly scoped phases focused on mobile usability and faster recurring-item entry. Milestone v1.2 continues from Phase 11, restructuring navigation around four dedicated tabs and introducing household-shared recipes that connect weekly dinner planning directly to the shopping list. Phases 12–16 derive from the five natural requirement groupings in v1.2: navigation, admin hub routing, recipe CRUD, item management, and user settings.

Milestone v2.0 adds four phases (17–20) targeting barcode scanner reliability on iOS and product data enrichment with images and brand names. Phase 17 is pure infrastructure (schema migrations). Phase 18 fixes the iOS black screen independently. Phases 19 and 20 carry image/brand through the edge function pipeline and into the UI.

Milestone v2.1 adds two audit-driven closure phases (21-22) to resolve critical offline replay correctness and restore missing verification artifacts required by milestone audit gates.

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
- [x] **Phase 12: Navigation Restructure** - Four-tab bottom nav with prefix-based active detection and safe redirects from removed top-level routes (completed 2026-03-13)
- [ ] **Phase 13: Admin Hub and Subpage Routing** - Admin hub page linking to all admin areas; Butikker, Husstand, and Historikk accessible as subpages; householdId-from-locals pattern established
- [x] **Phase 14: Recipes** - Household-shared recipe list and detail with ingredient selection from household items and add-to-list flow (completed 2026-03-16)
- [ ] **Phase 15: Item Management** - Admin items overview with name/category editing and picture upload via Supabase Storage
- [ ] **Phase 16: Dark Mode and User Settings** - Brukerinnstillinger page with dark mode toggle, FOUC prevention, and system-preference fallback
- [ ] **Phase 17: Schema Migrations** - Nullable image and brand columns added to barcode_product_cache, household_item_memory, and list_items ahead of enrichment work
- [x] **Phase 18: iOS Scanner Black Screen Fix** - Barcode scanner opens reliably on iOS Safari PWA standalone mode with correct permission error UX and haptic feedback (completed 2026-03-15)
- [x] **Phase 19: Edge Function and DTO Enrichment** - Brand and image URL flow from Kassal.app through the edge function pipeline and into the client DTO; Kassal token updated (completed 2026-03-15)
- [x] **Phase 20: Client Image Display** - Product thumbnails and brand names visible in the scan result sheet, shopping list rows, Admin Items, and Varekatalog
 (completed 2026-03-16)
- [x] **Phase 21: Offline Replay Integrity for History and Recommendations** - Make queue replay idempotent so successful offline check-offs are not replayed twice when later entries fail (completed 2026-03-28)
- [x] **Phase 22: Milestone Verification Artifact Closure** - Add missing Phase 07 and 08 verification artifacts and rerun milestone audit gate checks (completed 2026-03-28)

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
**Plans**: 4 plans

Plans:
- [x] 04-01: Supabase Edge Function `barcode-lookup` — Kassal.app primary, Open Food Facts fallback, `barcode_product_cache` table with 30-day TTL, Gemini category/name normalization
- [x] 04-02: Barcode scanner UI component — iOS-safe scanner library/polyfill, rear-camera preference, explicit scan trigger, manual EAN fallback
- [x] 04-03: Scan-to-add flow — unified lookup/result sheet, confirm to insert `list_item`, manual EAN retry, graceful not-found and camera-failure states
- [ ] 04-04-PLAN.md — Gap closure: add BARC-01..04 definitions and traceability rows to REQUIREMENTS.md; update 04-VERIFICATION.md to passed

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

### Phase 12: Navigation Restructure
**Goal**: Users navigate the app through four clearly scoped tabs, with the active tab reliably highlighted on all routes including deep sub-routes, and no existing bookmarks or PWA history entries break
**Depends on**: Phase 11
**Requirements**: NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. The bottom navigation shows exactly four tabs — Handleliste, Oppskrifter, Anbefalinger, Admin — and no other top-level tabs
  2. The active tab is highlighted correctly when the user is anywhere inside that tab's route subtree (e.g., Admin tab is highlighted on /admin/items, not just /admin)
  3. Existing users who navigate to /husstand or /butikker (bookmarks, PWA back-history) are redirected to their new Admin subpage locations rather than hitting a 404
  4. Stub pages at /oppskrifter and /admin load without error so new tabs are reviewable before their content is built
**Plans**: 3 plans

Plans:
- [x] 12-01-PLAN.md — Playwright test scaffold for NAV-01 and NAV-02 (Wave 0, red state)
- [ ] 12-02-PLAN.md — BottomNav rewrite with new tabs/icons/isActive + stub route pages
- [ ] 12-03-PLAN.md — 301 redirects for /husstand and /butikker + visual verification checkpoint

### Phase 13: Admin Hub and Subpage Routing
**Goal**: Users can reach all admin-area features from a single hub page, and Butikker, Husstand, and Historikk are accessible as Admin subpages without any route deadends
**Depends on**: Phase 12
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. The Admin tab opens a hub page with clearly grouped links to Butikker, Husstand, Historikk, Items, and Brukerinnstillinger
  2. Tapping Butikker from the Admin hub opens the store management page with a back-navigation affordance to return to the hub
  3. Tapping Husstand from the Admin hub opens the household management page with a back-navigation affordance to return to the hub
  4. Tapping Historikk from the Admin hub opens the shopping history view with a back-navigation affordance to return to the hub
  5. All admin subpage load functions read householdId from locals directly and do not call await parent() before independent data fetches
**Plans**: TBD

### Phase 14: Recipes
**Goal**: Any household member can browse, create, and use household-shared recipes — selecting which ingredients to add to a shopping list so the store-layout ordering and category assignment carry through from recipe to list
**Depends on**: Phases 12 and 13
**Requirements**: RECPE-01, RECPE-02, RECPE-03, RECPE-04, RECPE-05, RECPE-06, RECPE-07
**Success Criteria** (what must be TRUE):
  1. User can create a recipe with a name and optionally upload a cover image, and immediately see it in the recipe list
  2. User can add ingredients to a recipe by picking from the household's previously used items, preserving their category linkage
  3. User can edit a recipe's name, cover image, and ingredient list, and delete a recipe they no longer need
  4. The recipe list shows each recipe's cover image (if uploaded) and name, and loads within a normal page transition
  5. From a recipe detail page, user can select individual ingredients with checkboxes and add only those to a chosen shopping list
  6. From a recipe detail page, user can add all ingredients to a chosen shopping list in one action; items already on the list are not duplicated
**Plans**: 4 plans

Plans:
- [x] 14-01-PLAN.md — Database & Backend: recipes, recipe_ingredients, RLS, Storage bucket
- [ ] 14-02-PLAN.md — Recipe Creation: /oppskrifter/ny, IngredientBuilder with typeahead, Image upload with client-side compression
- [ ] 14-03-PLAN.md — Recipe Detail: /oppskrifter/[id], Add to List mutation with list picker and quantity increment
- [ ] 14-04-PLAN.md — Edit/Delete Recipe: /oppskrifter/[id]/rediger, update mutation, sync ingredients

### Phase 15: Item Management
**Goal**: Any household member can correct an item's name or category and add a photo to any household item, so the shopping list stays accurate and visually recognizable
**Depends on**: Phase 13
**Requirements**: ITEMS-01, ITEMS-02, ITEMS-03, ITEMS-04
**Success Criteria** (what must be TRUE):
  1. The Admin items page lists every item ever added by the household with its current name and category
  2. User can rename an item from the items page and the new name is reflected immediately in the list and in future suggestions
  3. User can change an item's category from the items page and the item sorts into the correct category section on the shopping list
  4. User can upload a photo for an item from their device; the image is compressed client-side before upload and displayed as a thumbnail on the shopping list
**Plans**: TBD

### Phase 16: Dark Mode and User Settings
**Goal**: Users can switch the app to dark mode from their settings page, and the chosen theme persists across sessions and app reopen without any flash of unstyled content
**Depends on**: Phase 13
**Requirements**: USRSET-01
**Success Criteria** (what must be TRUE):
  1. The Brukerinnstillinger page is accessible from the Admin hub and contains a dark mode toggle
  2. Toggling dark mode applies the dark theme to the entire app immediately without a page reload
  3. The chosen theme persists across browser sessions and app reopen so the user's preference is never lost
  4. On first load with no stored preference, the app respects the device's system dark/light mode setting
  5. No flash of unstyled content (FOUC) occurs when the app loads in dark mode — the theme is applied before first paint
**Plans**: TBD

### Phase 17: Schema Migrations
**Goal**: The database columns required by image and brand enrichment exist in all three tables before any application code writes to or reads from them
**Depends on**: Phase 16 (v1.2 must be complete before v2.0 begins)
**Requirements**: none (infrastructure enabling ENRICH-01..04 and DISP-01..04)
**Note**: This phase delivers no user-facing behavior. It exists because schema must precede application code. All columns are nullable with no defaults — safe to apply on live tables with existing rows and trigger activity.
**Success Criteria** (what must be TRUE):
  1. `barcode_product_cache` has a nullable `image_url text` column and a nullable `brand text` column; existing rows are unaffected
  2. `household_item_memory` has a nullable `product_image_url text` column and a nullable `brand text` column; trigger-driven writes to this table continue without errors
  3. `list_items` has a nullable `product_image_url text` column and a nullable `brand text` column; existing list items display correctly with no visible change
**Plans**: 1 plan

Plans:
- [ ] 17-01-PLAN.md — Add the expand-only schema migration and verify nullable-column shape, trigger compatibility, null-safe reads, and index/constraint non-regression on an isolated database

### Phase 18: iOS Scanner Black Screen Fix
**Goal**: The barcode scanner camera opens reliably on iOS Safari in PWA standalone mode, permission errors are communicated clearly without alarm UI, and successful scans give haptic feedback
**Depends on**: Phase 17
**Requirements**: SCAN-01, SCAN-02, SCAN-03
**Success Criteria** (what must be TRUE):
  1. On an iPhone installed as a PWA (home screen), tapping the scan button opens the camera without a black screen — the live viewfinder is visible within two seconds
  2. When a user denies camera access, the scanner shows a message directing them to iOS Settings with no alarming error UI; when a user merely dismisses the permission prompt, the scanner shows a "Prøv igjen" retry action instead
  3. A successfully detected barcode produces a haptic pulse on devices that support the Vibration API; devices that do not support it continue to work silently
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — TDD implementation: MutationObserver video intercept, split permission UX, haptic feedback
- [ ] 18-02-PLAN.md — Human verification checkpoint: real iPhone PWA black screen test

### Phase 19: Edge Function and DTO Enrichment
**Goal**: Every new barcode scan returns brand and image URL from Kassal.app, stores them in the cache, and delivers them to the client — without routing image data through Gemini
**Depends on**: Phase 17
**Requirements**: ENRICH-01, ENRICH-02
**Success Criteria** (what must be TRUE):
  1. After scanning a product that Kassal.app knows, the `barcode_product_cache` row contains a non-null `brand` and a non-null `image_url` (or null where Kassal does not provide one — the field is populated when available, not silently dropped)
  2. The client-side `BarcodeLookupDto` received after a scan includes `brand` and `imageUrl` fields that match what Kassal returned; neither field is routed through Gemini
**Plans**: TBD

### Phase 20: Client Image Display
**Goal**: Product images and brand names are visible to the user at every point in the shopping flow where scanned items appear — scan result, shopping list, Admin Items, and Varekatalog
**Depends on**: Phases 17 and 19
**Requirements**: ENRICH-03, ENRICH-04, DISP-01, DISP-02, DISP-03, DISP-04
**Success Criteria** (what must be TRUE):
  1. The scan result sheet shows the product image and brand name before the user confirms adding to the list; if the image fails to load, a placeholder is shown instead
  2. Shopping list item rows that were added via barcode scan show a small product thumbnail; rows without an image show no broken image icon
  3. When a barcode-scanned item is added to a list, `product_image_url` and `brand` are written to the `list_items` row at insert time — consistent with how `category_id` is already handled
  4. When a barcode-scanned item is confirmed, `product_image_url` and `brand` are written to the `household_item_memory` row so future scan suggestions carry the enriched data
  5. Admin Items and Varekatalog each show a product thumbnail and brand per row for items that have image data
**Plans**: TBD

### Phase 21: Offline Replay Integrity for History and Recommendations
**Goal**: Offline mutation replay is deterministic and idempotent so successful check-off events are cleared even if later queue entries fail, preventing duplicate history writes and recommendation skew
**Depends on**: Phase 20
**Requirements**: none (audit gap closure for integration and flow correctness)
**Gap Closure**: Closes critical v1.0 audit integration/flow gaps in `v1.0-v1.0-MILESTONE-AUDIT.md` for offline replay correctness
**Success Criteria** (what must be TRUE):
  1. Queue drain removes successfully replayed entries even when one or more later entries fail in the same batch
  2. Reconnect replay does not duplicate already-successful `item_history` writes across retry cycles
  3. Recommendation source queries are not skewed by duplicate history rows created by mixed replay success/failure paths
  4. Regression tests cover mixed replay outcomes (success followed by failure and retry) and demonstrate stable results
**Plans**: 2 plans
Plans:
- [ ] 21-01-PLAN.md - Deterministic partial-ack replay drain and mixed-outcome offline retry regression coverage
- [ ] 21-02-PLAN.md - Recommendation stability regression proving replay retries do not inflate source history counts

### Phase 22: Milestone Verification Artifact Closure
**Goal**: Milestone audit evidence chain is complete by adding verification artifacts for phases 07 and 08 and rerunning audit gates after Phase 21 fixes land
**Depends on**: Phase 21
**Requirements**: none (audit documentation closure)
**Gap Closure**: Closes audit blockers for missing `07-VERIFICATION.md` and `08-VERIFICATION.md`
**Success Criteria** (what must be TRUE):
  1. `07-VERIFICATION.md` exists and records a clear status with requirement-to-evidence mapping for Phase 7 scope
  2. `08-VERIFICATION.md` exists and records a clear status with reconciliation/audit evidence for Phase 8 scope
  3. A rerun of `$gsd-audit-milestone` no longer flags missing verification artifacts for phases 07 and 08
**Plans**: 4 plans
Plans:
- [ ] 22-01-PLAN.md - Create strict requirement-mapped Phase 07 verification artifact with explicit verdict and evidence links
- [ ] 22-02-PLAN.md - Create reconciliation-focused Phase 08 verification artifact grounded in roadmap/requirements/state/audit evidence
- [x] 22-03-PLAN.md - Preserve pre-rerun audit history, rerun milestone audit gates, and finalize Phase 22 validation status (completed 2026-03-28)
- [x] 22-04-PLAN.md - Add deterministic audit rerun evidence artifact and close the remaining Phase 22 verification gap (completed 2026-03-28)
## Progress

**Execution Order:**
Phases execute in numeric order. Phase 12 must precede 13 (nav gates all UX review). Phase 13 must precede 14 and 15 (admin routes must exist before subpage content). Phase 14 depends on Phase 12 for the /oppskrifter route. Phase 15 depends on Phase 13 for the admin items route. Phase 16 depends only on Phase 13 (Brukerinnstillinger subpage) and is the most independent of the v1.2 phases.

v2.0 ordering: Phase 17 (schema) must precede 19 and 20 (columns must exist before code writes to them). Phase 18 (iOS fix) is independent of 19 and 20 and can proceed in parallel. Phase 19 (edge function) must precede 20 (client must receive enriched DTO before rendering it). Phase 20 depends on both 17 and 19.

v2.1 ordering: Phase 21 must precede 22 because artifact closure should reflect the corrected replay behavior and final audit state.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth and Household Foundation | 3/3 | Complete | 2026-03-09 |
| 2. Shopping Lists and Core Loop | 4/4 | Complete   | 2026-03-10 |
| 3. Store Layouts and Category Ordering | 4/4 | Complete | 2026-03-10 |
| 4. Barcode Scanning | 4/4 | Complete   | 2026-03-14 |
| 5. PWA and Offline Support | 3/3 | Complete | 2026-03-12 |
| 6. History View and Recommendations | 3/3 | Complete | 2026-03-12 |
| 7. Verification and Evidence Closure | 3/3 | Complete | 2026-03-12 |
| 8. Traceability Reconciliation and Milestone Re-Audit | 2/2 | Complete | 2026-03-12 |
| 9. Mobile Layout Hardening | 3/3 | Complete | 2026-03-12 |
| 10. Inline Quantity Controls | 2/2 | Complete | 2026-03-12 |
| 11. Household Item Memory and Suggestions | 3/3 | Complete | 2026-03-12 |
| 12. Navigation Restructure | 3/3 | Complete    | 2026-03-13 |
| 13. Admin Hub and Subpage Routing | 0/TBD | Not started | - |
| 14. Recipes | 2/4 | Complete    | 2026-03-16 |
| 15. Item Management | 0/TBD | Not started | - |
| 16. Dark Mode and User Settings | 0/TBD | Not started | - |
| 17. Schema Migrations | 0/1 | Not started | - |
| 18. iOS Scanner Black Screen Fix | 1/2 | Complete    | 2026-03-15 |
| 19. Edge Function and DTO Enrichment | 1/1 | Complete    | 2026-03-15 |
| 20. Client Image Display | 4/4 | Complete    | 2026-03-16 |
| 21. Offline Replay Integrity for History and Recommendations | 2/2 | Complete    | 2026-03-28 |
| 22. Milestone Verification Artifact Closure | 4/4 | Complete    | 2026-03-28 |


