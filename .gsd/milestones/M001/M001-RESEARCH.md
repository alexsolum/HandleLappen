# Project Research Summary

**Project:** HandleAppen
**Domain:** Family grocery shopping PWA (Norwegian market)
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

HandleAppen is a collaborative family grocery shopping PWA targeting Norwegian households. The product's core differentiator — store-layout-aware category ordering — fills a gap that no major competitor (OurGroceries, AnyList, Bring) addresses for the Norwegian market. The recommended approach is SvelteKit 2 + Svelte 5 as the PWA framework, Supabase as the unified backend (Auth, PostgreSQL, Realtime, Edge Functions), and TanStack Query v6 for client-side data management. This stack is deliberately lean: Svelte 5 runes replace state management libraries entirely, and @vite-pwa/sveltekit wraps Workbox for offline support without a manual service worker. The entire stack is TypeScript-native end-to-end, which matters because the schema is non-trivial and type safety across RLS boundaries prevents a class of bugs.

The recommended build order is strictly dependency-driven. Auth and household infrastructure must exist before lists can be created. Lists must exist before categories and layout ordering are meaningful. The offline mutation queue must wrap the established mutation patterns from the list-items phase — not be bolted on after. Barcode scanning should be built as a server-proxied Edge Function from day one; going direct-to-client with the Kassal.app API key is a security and rate-limit trap that costs significant effort to unpick later. History and recommendations come last because they require real purchase data to be non-trivially useful.

The two highest-risk areas are the iOS PWA camera stack (the `BarcodeDetector` Web API is not implemented in WebKit; a WASM polyfill is required from the start) and Supabase RLS design (infinite recursion when tables cross-reference each other without SECURITY DEFINER functions). Both risks have known, documented mitigations — they must be built correctly in their respective phases, not retrofitted. Norwegian market coverage depends heavily on Kassal.app's EAN database (~100K products); Open Food Facts must be implemented as the fallback for imports. Neither API should be called from the browser.

## Key Findings

### Recommended Stack

SvelteKit 2 (2.53.4) with Svelte 5 (5.53.7) is the unambiguous choice for a mobile-first PWA: it ships 50-70% less JS than React-based alternatives, compiles away at build time, and its new runes system (`$state`, `$derived`, `$effect`) eliminates the need for any external state management library. Supabase 2 (supabase-js 2.98.0 + @supabase/ssr 0.9.0) provides auth, database, Realtime WebSocket, and Edge Functions as a single integrated platform — using any other backend would require reassembling this surface separately. TanStack Query v6 (the Svelte-native version, runes-compatible) handles all server-state concerns: caching, background refetch, optimistic updates, and rollback.

Tailwind CSS v4 with @tailwindcss/vite eliminates PostCSS config entirely and is the SvelteKit CLI default for new projects. shadcn-svelte v1 (runes-native, Tailwind v4 compatible) provides accessible component primitives. PWA support comes from @vite-pwa/sveltekit wrapping Workbox. The iOS barcode gap is filled by the `barcode-detector` npm polyfill (ZXing-C++ compiled to WASM, EAN-13/8 support). Offline write queuing uses the `idb` library over IndexedDB. For Norwegian i18n, paraglide-js (from the Inlang/SvelteKit org) is the correct choice — zero-overhead, compiler-based, typed.

**Core technologies:**
- SvelteKit 2 + Svelte 5: App framework and UI — compiler-based, no runtime overhead, #1 developer satisfaction, TypeScript-first
- Supabase JS 2 + @supabase/ssr: Auth, database, Realtime, Edge Functions — unified backend, RLS-native, generates TypeScript types from schema
- TanStack Query v6 (svelte): Server-state management — caching, optimistic updates, invalidation on Realtime events
- Tailwind CSS v4 + @tailwindcss/vite: Utility styling — Vite-native, no PostCSS, zero config
- @vite-pwa/sveltekit: PWA + service worker — Workbox-backed, handles SvelteKit build pipeline
- barcode-detector (WASM polyfill): Cross-platform barcode scanning — sole viable option for iOS Safari
- idb: IndexedDB offline mutation queue — Promise-based wrapper
- shadcn-svelte v1: Component primitives — runes-native, Tailwind v4 compatible, source-owned

**Version constraints that must not be violated:**
- @tanstack/svelte-query must be v6+ (v5 has broken runes compatibility)
- shadcn-svelte must be v1+ (v0 is not Svelte 5 or Tailwind v4 compatible)
- @supabase/ssr must be used instead of deprecated @supabase/auth-helpers-sveltekit

### Expected Features

Research identified a clear separation between what users assume exists (table stakes) and what sets HandleAppen apart (differentiators).

**Must have (table stakes) — launch blockers:**
- Real-time list sync across household devices — every major competitor offers this; absence makes the app unusable for shared shopping
- Add items by typing with history autocomplete — primary input; history recall is expected from OurGroceries, AnyList
- Check off items while shopping — core interaction; must sync in near-real-time
- Multiple named lists — families organize by store, day, occasion; a single list is too rigid
- Household / family sharing with individual accounts — shared lists, personal history; better than pure shared-account model
- Item grouping by category with Norwegian store layout order — this IS the core differentiator; must ship at launch or the product is generic
- Barcode scanning via Kassal.app + Open Food Facts fallback — distinguishes from plain text lists; needed for packaged goods
- Offline support (read, check, add; sync on reconnect) — Norwegian grocery stores have poor in-store connectivity
- Purchase history log — must start from day one to feed recommendations; cold-start problem means every missed session is a data loss
- Norwegian UI (bokmål) — the product is for Norwegian families

**Should have (competitive differentiators):**
- Store-layout category ordering with per-store overrides — default layout reduces friction; per-store precision is valued by power users
- History-based recommendations — usable after 4-6 weeks of real data; frequency-based SQL, not ML
- Co-purchase suggestions — a layer on top of recommendations; simple SQL JOIN on session grouping
- Nutritional / allergen data on barcode scan — Kassal.app provides this; add when scan UX is stable

**Defer (v2+):**
- Push notifications — iOS PWA push support is unreliable; in-app indicators are the correct v1 approach
- Meal planning — distinct product identity; scope conflict with shopping-first focus
- Price tracking / budget features — requires sustained price data investment; Mattilbud already does this better
- Native iOS/Android app — only if PWA limitations become documented user blockers at scale
- Receipt scanning / OCR — poor accuracy on Norwegian receipts; check-off during shopping is the correct history mechanism

**Confirmed anti-features (never build):**
- AI image recognition for adding items ("scan fridge") — accuracy too low for fresh produce; clear beats clever
- Social / community features — wrong audience; privacy concerns; scope creep
- Loyalty card integration (Æ, Kiwi app, Trumf) — requires store partnerships not available at this stage

### Architecture Approach

The architecture is a SvelteKit PWA client (Svelte components + TanStack Query + IndexedDB offline store + Workbox service worker) communicating with Supabase (PostgreSQL with RLS, Realtime WebSocket, Edge Functions for external API proxying). All Supabase data access is scoped to household via a `my_household_id()` SECURITY DEFINER function, which is the load-bearing pattern that prevents both RLS recursion and per-row subquery performance degradation. External API calls (Kassal.app, Open Food Facts) never touch the browser — they route exclusively through a Supabase Edge Function that caches results in a `product_cache` table (30-day TTL). Realtime subscriptions are scoped at the list level (one channel per open list), and all Realtime events trigger `queryClient.invalidateQueries()` rather than direct cache patching.

**Major components:**
1. SvelteKit app shell — routing, SSR/SSG, service worker integration, PWA manifest
2. Svelte UI components (features/ + components/) — list views, barcode scanner, category groups, household management
3. TanStack Query layer — all server state; caching, optimistic mutations, invalidation on Realtime
4. IndexedDB (via idb) — persistent offline store and outbound mutation queue
5. Workbox service worker — app shell CacheFirst, Supabase REST NetworkFirst, Background Sync for offline queue replay
6. Supabase PostgreSQL + RLS — primary data store; households, profiles, lists, list_items, categories, store_layouts, item_history, product_cache
7. Supabase Realtime — WebSocket channel per open list; Postgres Changes filtered by list_id
8. Supabase Edge Function /barcode — proxies Kassal.app + Open Food Facts; caches in product_cache; holds API key in secrets

**Key patterns that must be followed:**
- Realtime: invalidate TanStack Query on event receipt, never patch cache directly from payload
- RLS: use `my_household_id()` SECURITY DEFINER in every cross-table policy; wrap `auth.uid()` in `(select auth.uid())` to cache per query
- Offline mutations: optimistic update → Supabase call → on failure, enqueue to IndexedDB → Background Sync replay on reconnect
- Ordering: use numeric position with gaps (fractional midpoint on reorder), never sequential integers
- Barcode: check IndexedDB cache → Edge Function → DB cache → Kassal.app → Open Food Facts → not-found fallback

**Schema design summary:**
The data model centers on `households` as the top-level tenant. `profiles` link auth users to households. `lists` belong to households and optionally to a `stores` record. `list_items` are the active state; `item_history` is the immutable append-only log (written on check-off). `categories` have a global `default_order` (seeded with Norwegian store convention); `store_layouts` override per-store. `product_cache` is a shared, non-household-scoped table for EAN barcode data. All tables require RLS enabled; verify with `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` after every migration.

### Critical Pitfalls

1. **Supabase Realtime channel leak** — every `supabase.channel()` call that lacks a paired `supabase.removeChannel(channel)` in the effect cleanup accumulates phantom subscriptions, causing duplicate events and eventual tab crash on low-end Android. Always pair creation and removal in the same effect; verify with `supabase.getChannels().length` staying constant across navigation.

2. **iOS PWA camera permissions reset and no BarcodeDetector API** — the `BarcodeDetector` Web API is not implemented in WebKit/Safari on any iOS version. PWA standalone mode also does not persist camera permissions between sessions. Use the `barcode-detector` WASM polyfill exclusively; trigger camera only on explicit user gesture each session; provide manual EAN text input as a fallback.

3. **RLS infinite recursion on household membership** — writing an RLS policy on `lists` that subqueries `household_members`, which itself has an RLS policy that references back, produces `ERROR: infinite recursion detected`. Prevention: wrap all cross-table membership lookups in a `SECURITY DEFINER` function. This must be established before any RLS policies are written.

4. **Kassal.app API key exposed in client bundle** — calling the barcode API directly from the browser exposes the Bearer token in DevTools and can exhaust the 60 req/min free-tier limit for a family scanning simultaneously. Route exclusively through a Supabase Edge Function with DB caching from day one.

5. **Sequential integer position column for category ordering** — moving a category requires updating every row between old and new positions, generating N Realtime events that appear as layout thrashing on other devices. Use numeric position with gaps (fractional midpoint: `(prev + next) / 2`); a single reorder produces exactly one UPDATE.

6. **Offline conflict on simultaneous check-off** — two devices checking the same item offline and syncing produce conflicts. Model `is_checked` as monotone (true wins over false, always); use `UPDATE ... SET checked = checked OR $1` semantics. Use soft deletes (`deleted_at`) for items, not hard deletes, to survive offline sync conflicts.

7. **Over-engineering recommendations** — frequency-based SQL is sufficient for v1 (top items by `COUNT(*)` in last 90 days per household). Collaborative filtering requires cross-household data consent, minimum data volumes, and produces garbage results on sparse family-scale datasets. Constrain the phase explicitly to SQL aggregation.

## Implications for Roadmap

Based on the feature dependency graph, schema design, and pitfall-to-phase mapping from research, six phases are suggested. The ordering is strictly dependency-driven — no phase can be safely reordered without violating architectural or data model dependencies.

### Phase 1: Auth and Household Foundation

**Rationale:** Every other feature requires an authenticated user in a household context. RLS policies, Realtime channels, and data queries all depend on `my_household_id()` resolving to a valid row. This is not optional scaffolding — it is the load-bearing layer. The SECURITY DEFINER pattern must be established here before any other RLS policies are written to prevent recursion in later phases.

**Delivers:** User registration/login (Supabase Auth + @supabase/ssr), household creation, invite code flow (48-hour expiry, single-use), household joining, profile creation, and all foundational RLS policies using the `my_household_id()` SECURITY DEFINER function. SvelteKit hooks and server-side auth sessions established.

**Addresses (from FEATURES.md):** Individual accounts + household joining, Norwegian UI (bokmål)

**Avoids (from PITFALLS.md):** RLS infinite recursion (establish SECURITY DEFINER pattern here), user_metadata in RLS policies (use DB-stored roles), service role key exposure

**Research flag:** Standard patterns — Supabase Auth + @supabase/ssr integration is well-documented and the SvelteKit quickstart covers it. No additional research phase needed.

---

### Phase 2: Shopping Lists and Core Loop

**Rationale:** The testable shopping loop (create list, add item, check off item, see items in category groups) is the product's heartbeat. Real-time sync belongs here because it is part of the core loop, not an enhancement. The mutation patterns established in this phase are the foundation for the offline queue in Phase 5 — they must be solid before offline wraps them. Item history logging starts here (immutable `item_history` append on check-off) to avoid cold-start penalty.

**Delivers:** Multiple named lists, add items by typing with history autocomplete, item grouping by default Norwegian category order, check off items (with `item_history` log write on check-off), real-time sync via Supabase Realtime (Postgres Changes, per-list channel, TanStack Query invalidation pattern), optimistic mutations with rollback.

**Addresses (from FEATURES.md):** Multiple named lists, add items by typing, check off items, item grouping by category, real-time sync, purchase history log, household sharing

**Avoids (from PITFALLS.md):** Realtime channel leak (effect cleanup from day one), applying Realtime payload directly to cache (invalidate only), per-row RLS subqueries (SECURITY DEFINER already in place from Phase 1)

**Uses (from STACK.md):** TanStack Query v6 (useQuery, useMutation, invalidateQueries), Supabase Realtime (postgres_changes, REPLICA IDENTITY FULL on list_items), idb (mutation queue foundation)

**Research flag:** Standard patterns — TanStack Query + Supabase Realtime integration is well-documented. No additional research phase needed.

---

### Phase 3: Store Layouts and Category Ordering

**Rationale:** Category ordering is the product's primary competitive differentiator. It requires categories and lists (Phase 2) to exist before ordering is meaningful. Per-store overrides are the power-user layer on top of the default Norwegian layout. The fractional indexing pattern for position columns must be implemented here — implementing sequential integers and migrating later is classified as HIGH recovery cost in pitfalls research.

**Delivers:** `stores` and `store_layouts` tables, seeded default Norwegian category order (13 categories, values spaced by 1000), named lists optionally tied to a store, per-store category reordering via drag-and-drop UI (fractional midpoint position), store layout resolution (store override → global default fallback), settings screen for managing stores and layouts.

**Addresses (from FEATURES.md):** Store-layout-aware category ordering, per-store layout overrides

**Avoids (from PITFALLS.md):** Sequential integer position column (fractional indexing from start), sorting categories alphabetically (layout order is always the default), losing scroll position on list update (fine-grained item state updates)

**Research flag:** Standard patterns — fractional indexing and drag-and-drop reorder are well-documented. The Norwegian store layout ordering is based on MEDIUM-confidence inference (common store flow); treat as a testable hypothesis with per-store override as the escape hatch.

---

### Phase 4: Barcode Scanning

**Rationale:** Barcode scanning can be built independently of Phase 3 (the Edge Function and product cache are standalone), but depends on list_items existing (Phase 2) to receive scanned products. It must be built as an Edge Function proxy from the start — never as a direct client API call. iOS WASM polyfill is required from the first line of barcode code, not as a later fix.

**Delivers:** Supabase Edge Function `/barcode/{ean}` (Kassal.app primary → Open Food Facts fallback → product_cache DB cache with 30-day TTL), barcode scanner UI component using `barcode-detector` WASM polyfill (getUserMedia, rear camera, requestAnimationFrame detection loop), client-side IndexedDB product cache (30-day TTL, checked before network), scan-to-add-item flow (product prefill → user confirms → INSERT list_item), manual EAN fallback input, graceful "not found" message distinguishing camera failure from missing product.

**Addresses (from FEATURES.md):** Barcode scanning (Kassal.app + Open Food Facts), Norwegian product names, nutritional/allergen data (surface after scan UX stable)

**Avoids (from PITFALLS.md):** Kassal.app key in client bundle (Edge Function from day one), BarcodeDetector without WASM polyfill (polyfill only), auto-starting camera without user gesture (explicit "Scan" button), no direct kassal.app requests from browser (verified via Network tab)

**Research flag:** Needs research phase — Kassal.app API authentication details are MEDIUM confidence (auth mechanism not fully documented publicly). Validate EAN endpoint response structure and confirm token approach before implementation. Open Food Facts response normalization also needs field mapping verified.

---

### Phase 5: PWA and Offline Support

**Rationale:** Offline support wraps the mutation patterns established in Phase 2. Building offline before the core mutation patterns are stable would require rewriting the queue implementation. This phase converts the already-working online app into one that functions in poor in-store connectivity. Background Sync via Workbox must be explicitly tested with two-device concurrent offline scenarios.

**Delivers:** @vite-pwa/sveltekit configuration (app shell CacheFirst precache, Supabase REST NetworkFirst), IndexedDB mutation queue (add item, check item, delete item with soft-delete semantics), Background Sync registration on offline mutation failure, queue replay on reconnect (idempotency keys to prevent double-apply), conflict resolution policy (is_checked monotone OR semantics, soft deletes for items), PWA manifest (install prompt, icons, display: standalone), offline UX indicators (connection status, "items pending sync" badge).

**Addresses (from FEATURES.md):** Offline / poor-connectivity support, PWA installability (no app store), clean no-ads experience

**Avoids (from PITFALLS.md):** Offline conflict on simultaneous check-off (monotone check semantics, soft deletes), Safari storage eviction (app shell only in cache, no product images, explicit size cap), full list refetch on every Realtime event during active shopping (optimistic updates established in Phase 2)

**Research flag:** Needs research phase — Background Sync API browser support and Workbox BackgroundSyncPlugin configuration in SvelteKit context has MEDIUM confidence. Verify Workbox `BackgroundSyncPlugin` integration with @vite-pwa/sveltekit and Safari support limits before implementation.

---

### Phase 6: History and Recommendations

**Rationale:** Recommendations are built last because they are useless without real purchase data. The `item_history` table has been logging since Phase 2 — by Phase 6, there should be 4-6 weeks of production data if the app ships on schedule. The recommendation engine must be explicitly constrained to frequency-based SQL to prevent over-engineering into a phase that stretches multiple sprints.

**Delivers:** History view (items checked off per household, grouped by date, per-member attribution), frequency-based "you usually buy these" recommendations (top items by count in last 90 days, single SQL query), co-purchase suggestions (items appearing in the same session, JOIN on `checked_at` time window), recommendations tab in bottom nav (cold-start shows history before suggestions are meaningful), toggle to add any history/recommendation item to the current active list.

**Addresses (from FEATURES.md):** History-based recommendations, co-purchase suggestions, individual accounts enabling per-user history

**Avoids (from PITFALLS.md):** Over-engineering recommendations (frequency SQL only, no ML, no external service, no cross-household data), cold-start problem (show purchase history immediately, surface suggestions only after minimum 10 sessions)

**Research flag:** Standard patterns — frequency SQL aggregation is straightforward. No additional research phase needed. Gate on engagement data before adding any complexity beyond this scope.

---

### Phase Ordering Rationale

- Phase 1 before everything: RLS patterns and auth context are prerequisites for all Supabase operations. The SECURITY DEFINER function must exist before any other RLS policy is written.
- Phase 2 before Phase 3: Items must exist before layout ordering is meaningful or testable.
- Phase 2 before Phase 5: Offline support wraps established mutation patterns; building offline on unstable mutations creates rework.
- Phase 4 is independent of Phase 3: Barcode lookup and the Edge Function can be built in parallel with store layouts, but list_items (Phase 2) must exist.
- Phase 6 last: Recommendations require real production data. Building the engine before data exists produces a feature that cannot be validated.

### Research Flags

Phases likely needing a dedicated research sub-step during planning:

- **Phase 4 (Barcode Scanning):** Kassal.app API authentication is only MEDIUM confidence. The endpoint structure is confirmed but the auth token mechanism and response normalization need field-level verification before building the Edge Function. Open Food Facts field mapping for Norwegian product names also needs validation.
- **Phase 5 (PWA + Offline):** Background Sync API support in Workbox + @vite-pwa/sveltekit + Safari has MEDIUM confidence. Browser support matrix for Background Sync is uneven (not supported in Safari at all as of early 2026 — Workbox falls back to sync-on-next-open). This fallback behavior needs explicit design.

Phases with standard, well-documented patterns (no additional research phase needed):

- **Phase 1 (Auth):** Supabase Auth + @supabase/ssr + SvelteKit hooks is fully documented with official quickstarts.
- **Phase 2 (Core Loop):** TanStack Query + Supabase Realtime invalidation pattern is well-established and documented.
- **Phase 3 (Store Layouts):** Fractional indexing pattern for position columns is well-documented. Norwegian store layout order is a hypothesis to be validated with users, not a research question.
- **Phase 6 (Recommendations):** Frequency-based SQL aggregation requires no external research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via npm registry. Official docs for SvelteKit, Supabase, TanStack Query, Vite PWA confirmed current. Version compatibility table covers all critical pairs. |
| Features | MEDIUM-HIGH | Core features HIGH confidence (established patterns from major competitors). Norwegian-specific store layout ordering is MEDIUM (inferred from store descriptions, not first-hand measurement). Kassal.app coverage claims (100K products) taken from their own docs — not independently verified. |
| Architecture | HIGH | Supabase patterns (RLS, Realtime, Edge Functions, schema design) are HIGH confidence from official docs. PWA offline strategy is MEDIUM confidence — Background Sync Safari limitations require verification. Realtime DELETE event RLS limitation is confirmed in official docs. |
| Pitfalls | HIGH | All critical pitfalls verified against official documentation, GitHub issues, or Apple Developer Forum reports. Recovery cost estimates are based on migration complexity analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **Kassal.app auth mechanism:** The API requires a Bearer token but the public documentation does not fully document rate limit enforcement or token acquisition for non-commercial use. Validate during Phase 4 research before building the Edge Function.

- **Background Sync in Safari PWA:** The Background Sync API is not supported in Safari (WebKit). @vite-pwa/sveltekit uses Workbox which provides a "replay on next page load" fallback. This fallback behavior must be explicitly designed in Phase 5 — silent queueing without user feedback is a UX pitfall.

- **Norwegian store layout order accuracy:** The 13-category default order is inferred from general Norwegian supermarket descriptions (MEDIUM confidence). It should be validated with actual users early in the beta period. The per-store override mechanism is the escape hatch for inaccuracies.

- **Kassal.app EAN coverage gaps:** 100K products covers common Norwegian EAN barcodes but imported and niche products will miss. The Open Food Facts fallback and manual entry flow must be production-quality, not an afterthought — a significant share of scans may fall through.

- **Svelte 5 runes in SvelteKit server context:** Runes (`$state`, `$derived`) are client-side primitives. Server-side `load` functions in SvelteKit return plain data, not reactive state. The boundary between server load data and client reactive state must be clearly established in Phase 2 to avoid incorrect runes usage in server contexts.

## Sources

### Primary (HIGH confidence)

- npm registry (`npm show`) — version verification for all packages
- [Supabase Docs — Server-Side Auth for SvelteKit](https://supabase.com/docs/guides/auth/server-side/sveltekit) — @supabase/ssr patterns, hooks setup
- [Supabase Docs — Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax, REPLICA IDENTITY, RLS DELETE limitation
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SECURITY DEFINER pattern, auth.uid() caching (179ms → 9ms improvement)
- [Vite PWA — SvelteKit framework guide](https://vite-pwa-org.netlify.app/frameworks/sveltekit) — build pipeline, Workbox config
- [TanStack Query v6 Svelte docs](https://tanstack.com/query/v5/docs/framework/svelte/overview) — runes-native query/mutation patterns
- [Tailwind CSS v4 + SvelteKit guide](https://tailwindcss.com/docs/guides/sveltekit) — @tailwindcss/vite integration
- [barcode-detector on npm](https://www.npmjs.com/package/barcode-detector) — WASM polyfill, EAN-13 support confirmed
- [STRICH KB — iOS PWA Camera Issues](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa) — permission reset in standalone mode confirmed
- [Supabase Realtime GitHub — Channel Cleanup Issue](https://github.com/supabase/realtime-js/issues/281) — channel leak pattern documented
- [ZXing maintenance mode](https://github.com/zxing-js/library) — maintainer statement confirming deprecation
- [MDN — Offline and Background Operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — Background Sync API patterns

### Secondary (MEDIUM confidence)

- [Kassal.app API docs](https://kassal.app/api/docs) — EAN endpoint, 60 req/min limit, Norwegian product coverage; auth details incomplete
- [Svelte 5 global state patterns](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) — .svelte.ts shared state approach
- [LogRocket — Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — IndexedDB architecture patterns
- [Basedash — Re-ordering at the database level](https://www.basedash.com/blog/implementing-re-ordering-at-the-database-level-our-experience) — fractional indexing pattern
- [Offline sync conflict resolution (sachith.co.uk, Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) — last-write-wins limitations
- [Norwegian supermarkets overview (lifeinnorway.net)](https://www.lifeinnorway.net/supermarkets-in-norway/) — store layout inference
- [OurGroceries User Guide](https://www.ourgroceries.com/user-guide) — competitor feature reference
- [Grocery app comparison (smartcartfamily.com)](https://smartcartfamily.com/en/blog/grocery-apps-comparison) — competitor feature matrix

### Tertiary (LOW confidence)

- SvelteKit vs Next.js 2026 community comparisons — aggregated, multiple sources, bundle size claims directionally consistent but not benchmarked for this specific app
- Grocery app trends 2026 (elitemcommerce.com) — market context only, not technical decisions

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*

# Architecture Research

**Domain:** Collaborative family grocery shopping PWA with Supabase
**Researched:** 2026-03-08
**Confidence:** HIGH (Supabase patterns), MEDIUM (PWA offline strategy), HIGH (schema design)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  React UI    │  │  TanStack    │  │  IndexedDB   │           │
│  │  Components  │  │  Query Cache │  │  Offline     │           │
│  └──────┬───────┘  └──────┬───────┘  │  Store       │           │
│         │                 │          └──────┬───────┘           │
│         └─────────────────┼────────────────┘                    │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │               Service Layer (hooks + queries)             │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │               Service Worker (Workbox)                    │   │
│  │    App Shell Cache │ Background Sync Queue │ Offline      │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼──────────────────────────────────────┐
│                        SUPABASE                                   │
├────────────────┬────────────────┬────────────────┬───────────────┤
│   Auth         │   PostgreSQL   │   Realtime     │  Edge         │
│   (JWT)        │   + RLS        │   (WebSocket)  │  Functions    │
│                │                │                │               │
│   Sessions     │  households    │  Postgres      │  /barcode     │
│   Refresh      │  profiles      │  Changes       │  (Kassal.app  │
│   tokens       │  lists         │  subscribed    │  + OPF proxy  │
│                │  list_items    │  per list_id   │  + DB cache)  │
│                │  categories    │                │               │
│                │  store_layouts │                │               │
│                │  item_history  │                │               │
│                │  product_cache │                │               │
└────────────────┴────────────────┴────────────────┴───────────────┘
                                                   │
                            ┌──────────────────────┼─────────────┐
                            │  External APIs        │             │
                            │  Kassal.app (primary) │             │
                            │  Open Food Facts (fb) │             │
                            └───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React UI | Render lists, items, categories, barcode scanner | Service Layer (hooks) |
| TanStack Query | Client-side cache, optimistic updates, background refetch | Service Layer, IndexedDB (via persist plugin) |
| IndexedDB | Offline structured storage, outbound sync queue | Service Worker, TanStack Query persist |
| Service Worker (Workbox) | App shell caching, background sync, push future | IndexedDB (sync queue), Network |
| Service Layer (hooks) | Abstract Supabase calls, owns business logic | Supabase client, TanStack Query |
| Supabase Auth | JWT issuance, session management, refresh | All Supabase services via RLS |
| Supabase PostgreSQL + RLS | Primary data store, enforces household isolation | Realtime, Edge Functions |
| Supabase Realtime | WebSocket broadcast of DB change events to clients | PostgreSQL (WAL), Client |
| Edge Function: /barcode | Proxy Kassal.app + Open Food Facts, cache in DB | Kassal.app, Open Food Facts, PostgreSQL |

---

## Supabase Schema Design

### Core Tables

```sql
-- Households: the top-level tenant unit
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at  timestamptz default now()
);

-- Profiles: one per auth.users row, belongs to a household
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid not null references households on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz default now()
);
create index on profiles(household_id);

-- Shopping lists: named lists owned by a household
create table lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  store_id     uuid references stores,         -- optional: list tied to a store
  created_by   uuid references profiles,
  archived_at  timestamptz,                    -- soft delete
  created_at   timestamptz default now()
);
create index on lists(household_id);

-- Items on a list
create table list_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references lists on delete cascade,
  product_id   uuid references product_cache,  -- null for manual items
  name         text not null,                  -- denormalized for offline/display
  quantity      numeric default 1,
  unit         text,
  category_id  uuid references categories,
  is_checked   boolean not null default false,
  checked_by   uuid references profiles,
  checked_at   timestamptz,
  sort_order   integer,                         -- position within category group
  added_by     uuid references profiles,
  created_at   timestamptz default now()
);
create index on list_items(list_id);
-- REPLICA IDENTITY FULL required for realtime filter on list_id
alter table list_items replica identity full;

-- Categories: shared across household, with a global default sort order
create table categories (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid references households,   -- null = system default category
  name           text not null,
  default_order  integer not null default 100, -- lower = closer to store entrance
  icon           text,
  created_at     timestamptz default now()
);

-- Stores: named stores a household shops at
create table stores (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  chain        text,                            -- e.g. 'Rema 1000', 'Kiwi'
  created_at   timestamptz default now()
);
create index on stores(household_id);

-- Store layout overrides: per-store category sort order
create table store_layouts (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores on delete cascade,
  category_id uuid not null references categories on delete cascade,
  sort_order  integer not null,
  unique(store_id, category_id)
);
create index on store_layouts(store_id);

-- Item history: immutable log of checked-off items
create table item_history (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households,
  list_id      uuid references lists,
  profile_id   uuid references profiles,
  product_id   uuid references product_cache,
  name         text not null,
  category_id  uuid references categories,
  quantity     numeric,
  unit         text,
  checked_at   timestamptz not null default now()
);
create index on item_history(household_id, checked_at desc);
create index on item_history(household_id, product_id);

-- Product cache: barcode → product data from Kassal.app / Open Food Facts
create table product_cache (
  id           uuid primary key default gen_random_uuid(),
  ean          text unique not null,
  name         text not null,
  brand        text,
  image_url    text,
  category_hint text,                          -- category name from external API
  nutrition    jsonb,
  raw_data     jsonb,                          -- full API response
  source       text not null,                  -- 'kassal' | 'openfoodfacts'
  fetched_at   timestamptz not null default now(),
  expires_at   timestamptz generated always as (fetched_at + interval '30 days') stored
);
create index on product_cache(ean);
```

### RLS Policies

The central pattern: users belong to a household through `profiles`. All tables scoped to a household use a SECURITY DEFINER helper function to avoid per-row subquery cost.

```sql
-- Helper: returns current user's household_id (cached once per query)
create or replace function my_household_id()
  returns uuid language sql stable security definer
  as $$ select household_id from profiles where id = (select auth.uid()) $$;

-- Enable RLS on all tables
alter table households     enable row level security;
alter table profiles       enable row level security;
alter table lists          enable row level security;
alter table list_items     enable row level security;
alter table categories     enable row level security;
alter table stores         enable row level security;
alter table store_layouts  enable row level security;
alter table item_history   enable row level security;
alter table product_cache  enable row level security;

-- households: member can read their own household
create policy "household_select" on households for select
  using (id = my_household_id());

-- profiles: read all profiles in same household
create policy "profiles_select" on profiles for select
  using (household_id = my_household_id());

create policy "profiles_insert_own" on profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on profiles for update
  using (id = (select auth.uid()));

-- lists: full access within household
create policy "lists_select" on lists for select
  using (household_id = my_household_id());

create policy "lists_insert" on lists for insert
  with check (household_id = my_household_id());

create policy "lists_update" on lists for update
  using (household_id = my_household_id());

create policy "lists_delete" on lists for delete
  using (household_id = my_household_id());

-- list_items: scoped via list membership
create policy "list_items_select" on list_items for select
  using (list_id in (select id from lists where household_id = my_household_id()));

create policy "list_items_insert" on list_items for insert
  with check (list_id in (select id from lists where household_id = my_household_id()));

create policy "list_items_update" on list_items for update
  using (list_id in (select id from lists where household_id = my_household_id()));

create policy "list_items_delete" on list_items for delete
  using (list_id in (select id from lists where household_id = my_household_id()));

-- product_cache: readable by all authenticated users (global cache)
create policy "product_cache_select" on product_cache for select
  to authenticated using (true);

-- item_history: household-scoped
create policy "history_select" on item_history for select
  using (household_id = my_household_id());

create policy "history_insert" on item_history for insert
  with check (household_id = my_household_id());
```

---

## Supabase Realtime Subscription Pattern

### Setup Requirements

```sql
-- Add list_items to the realtime publication
alter publication supabase_realtime add table list_items;
-- REPLICA IDENTITY FULL is required to filter on list_id (non-PK column)
alter table list_items replica identity full;
```

### Client Subscription (per active list)

```typescript
// Subscribe to all changes on a specific list
const channel = supabase
  .channel(`list:${listId}`)
  .on(
    'postgres_changes',
    {
      event: '*',                    // INSERT | UPDATE | DELETE
      schema: 'public',
      table: 'list_items',
      filter: `list_id=eq.${listId}`
    },
    (payload) => {
      // Invalidate TanStack Query cache — let it refetch from DB
      queryClient.invalidateQueries({ queryKey: ['list_items', listId] });
    }
  )
  .subscribe();

// Cleanup when component unmounts or list changes
return () => { supabase.removeChannel(channel); };
```

### Subscription Scope Rule

Subscribe at the **list level**, not household level. One channel per open list. This limits authorization checks per event to only users currently viewing that list, avoiding the N-subscribers-per-insert RLS overhead.

### Realtime Limitations to Plan For

- DELETE events cannot be filtered — the payload will arrive but filter is not applied. Mitigation: invalidate and refetch on DELETE rather than applying the event directly.
- RLS is checked per subscriber per event. At family scale (2-10 users) this is negligible. Flag for re-evaluation if household size grows beyond ~50 concurrent users.
- REPLICA IDENTITY FULL is required for filtering on any non-primary-key column (like `list_id`). Apply this DDL before subscribing.

---

## PWA Offline-First Architecture

### Two Storage Layers

| Layer | Technology | What Goes Here |
|-------|-----------|----------------|
| Runtime cache | TanStack Query in-memory + persist plugin | Active list items, categories, household data |
| Persistent offline store | IndexedDB (via `idb` library) | Cached list data, outbound mutation queue, product cache |

### Service Worker Strategy (Workbox)

```
Request Type              Strategy
─────────────────────────────────────────────────────────
App shell (HTML/JS/CSS)   Cache First (precached at install)
Supabase REST API calls   Network First, fall back to IndexedDB
Static assets (icons)     Cache First
Kassal.app API            Network Only (proxied via Edge Function)
```

### Offline Mutation Queue

When the device is offline, writes (add item, check item, delete item) are:

1. Applied optimistically to TanStack Query cache (UI updates instantly)
2. Persisted to an IndexedDB `mutation_queue` store
3. Registered with the Background Sync API (`sync` tag: `list-mutations`)
4. Replayed by the service worker when connectivity returns

```
User checks item off
       │
       ▼
Optimistic update → TanStack Query cache (instant UI)
       │
       ▼
Attempt Supabase mutation
  ├── Online: success → confirm optimistic state
  └── Offline: enqueue to IndexedDB → Background Sync registration
                    │
                    └── On reconnect: service worker replays queue
                                      → Supabase mutation
                                      → Realtime propagates to other devices
```

### Conflict Resolution Strategy

Grocery shopping is append-friendly. True conflicts (two users simultaneously checking the same item) are rare but handled by:

- `is_checked` and `checked_by` are "last writer wins" (PostgreSQL UPDATE semantics)
- Realtime event on UPDATE triggers cache invalidation — stale optimistic state is overwritten
- No CRDT complexity needed at family scale

---

## Barcode / Product Cache Architecture

### Edge Function: `/barcode/{ean}`

```
Client scans barcode (EAN)
       │
       ▼
Check IndexedDB product cache (< 30 days old?)
  ├── Hit: return immediately (no network)
  └── Miss:
       │
       ▼
  Call Supabase Edge Function /barcode/{ean}
       │
       ├── Check product_cache table (< 30 days old?)
       │     └── Hit: return DB cache
       │
       └── Miss: fetch Kassal.app GET /api/v1/products/ean/{ean}
             ├── Success: normalize + upsert product_cache + return
             └── 404 / error: fetch Open Food Facts as fallback
                   ├── Success: normalize + upsert product_cache + return
                   └── No data: return not-found (user types name manually)
```

### Product Cache Expiry

- DB cache TTL: 30 days (`expires_at` generated column)
- Client IndexedDB cache TTL: 30 days (checked on read)
- A background cleanup cron (Supabase pg_cron) removes expired rows weekly

### Norwegian Coverage Notes

- Kassal.app covers Norwegian EAN barcodes comprehensively — prices, brand, category
- Open Food Facts covers international products sold in Norway (imported goods)
- Category hint from Kassal.app is text, not a structured taxonomy — the Edge Function maps it to a category name, but household must confirm/assign the final category

---

## Store Layout / Category Ordering Data Model

### Resolution Order for Displaying Items

```
list_items grouped by category_id
       │
       ▼
For each category, determine sort_order:
  1. Check store_layouts WHERE store_id = list.store_id (per-store override)
  2. Fall back to categories.default_order (global default)
       │
       ▼
Sort category groups by resolved sort_order ASC
Sort items within category by list_items.sort_order ASC
```

### Default Category Order (Norwegian Store Convention)

```
10  Frukt og grønt (produce)
20  Bakeri (bakery)
30  Meieri og egg (dairy/eggs)
40  Kjøtt og fjærkre (meat/poultry)
50  Fisk og sjømat (fish/seafood)
60  Pålegg og delikatesser (deli/cold cuts)
70  Tørrvarer (dry goods / pasta / rice)
80  Hermetikk og glass (canned / jarred)
90  Frysevarer (frozen)
100 Drikke (beverages)
110 Rengjøring og vask (cleaning)
120 Personlig pleie (personal care)
130 Annet (other)
```

This default is seeded at deploy time. Households can reorder categories for specific stores via `store_layouts`.

---

## Recommended Project Structure

```
src/
├── components/           # UI components (presentational)
│   ├── list/             # ListItem, ListGroup, CheckboxRow
│   ├── scanner/          # BarcodeScanner, ProductCard
│   ├── layout/           # BottomNav, PageShell, Header
│   └── ui/               # Button, Input, Modal (design system primitives)
├── features/             # Feature modules (route-level logic)
│   ├── shopping/         # Active list view + realtime hook
│   ├── lists/            # List management (create, archive, select)
│   ├── history/          # Item history + recommendations
│   ├── household/        # Household setup, invite, member management
│   └── settings/         # Store layouts, category ordering
├── hooks/                # Shared data hooks (useList, useCategories, etc.)
├── lib/
│   ├── supabase.ts       # Supabase client singleton
│   ├── queryClient.ts    # TanStack Query client config + persister
│   └── db.ts             # IndexedDB schema (idb library)
├── services/
│   ├── lists.ts          # CRUD for lists, list_items
│   ├── barcode.ts        # Barcode lookup + local cache logic
│   ├── history.ts        # Item history queries
│   └── recommendations.ts# History-based suggestion engine
├── sw/
│   ├── sw.ts             # Service worker entry (Workbox)
│   └── sync.ts           # Background sync queue handler
├── types/                # Shared TypeScript types (Database schema types)
└── pages/                # Route components
    ├── ShoppingPage.tsx
    ├── ListsPage.tsx
    ├── HistoryPage.tsx
    └── SettingsPage.tsx
```

### Structure Rationale

- **features/:** Groups all concerns for a user-facing route — component, hooks, queries. Prevents cross-feature coupling.
- **hooks/:** Shared hooks that multiple features need (e.g., `useHousehold`, `useCategories`).
- **services/:** Pure async functions, no React — makes testing and reuse outside React easier.
- **sw/:** Service worker is a separate compilation target in Vite with `vite-plugin-pwa`.
- **lib/:** Singletons and infrastructure setup that must be initialized once.

---

## Architectural Patterns

### Pattern 1: Query Invalidation on Realtime Event

**What:** When a Realtime INSERT/UPDATE arrives, invalidate the corresponding TanStack Query key rather than applying the event payload directly to cache.
**When to use:** Always, for list_items subscriptions.
**Trade-offs:** Adds one extra DB round-trip per event, but keeps client state authoritative and avoids patch-merge complexity. At family scale this is imperceptible.

```typescript
.on('postgres_changes', { event: '*', table: 'list_items', filter: `list_id=eq.${listId}` },
  () => queryClient.invalidateQueries({ queryKey: ['list_items', listId] })
)
```

### Pattern 2: Optimistic Mutation with Rollback

**What:** Apply local state change immediately in TanStack Query, then issue the Supabase mutation. Roll back if the mutation fails.
**When to use:** Check/uncheck item, add item (high-frequency, fast actions).
**Trade-offs:** UI feels instant; rollback on failure can be jarring if frequent — acceptable for grocery use case where failures are rare.

```typescript
useMutation({
  mutationFn: (item) => supabase.from('list_items').update({ is_checked: true }).eq('id', item.id),
  onMutate: async (item) => {
    await queryClient.cancelQueries({ queryKey: ['list_items', listId] });
    const previous = queryClient.getQueryData(['list_items', listId]);
    queryClient.setQueryData(['list_items', listId], (old) =>
      old.map(i => i.id === item.id ? { ...i, is_checked: true } : i)
    );
    return { previous };
  },
  onError: (_err, _item, ctx) => {
    queryClient.setQueryData(['list_items', listId], ctx.previous);
  },
})
```

### Pattern 3: SECURITY DEFINER Household Helper

**What:** A PostgreSQL function that returns the calling user's `household_id` and is called once per query (not per row).
**When to use:** In every RLS policy that needs household-scoped access.
**Trade-offs:** Requires the function to be maintained alongside schema changes; provides significant query performance gains by preventing per-row subqueries.

---

## Data Flow

### Add Item Flow (Online)

```
User types item name → React component
       │
       ▼
useMutation (optimistic): item appears in list instantly
       │
       ▼
Supabase INSERT into list_items
       │
       ├── Triggers Realtime event on list channel
       │         │
       │         └── Other open clients invalidate cache → refetch → sync
       │
       └── Confirms optimistic state for originating client
```

### Add Item Flow (Offline)

```
User types item name → React component
       │
       ▼
useMutation (optimistic): item appears in list instantly with local UUID
       │
       ▼
Supabase INSERT fails (no network)
       │
       ▼
Mutation enqueued to IndexedDB sync queue
Background Sync API registered
       │
       ▼ (on reconnect)
Service worker fires 'sync' event
Reads queue → replays INSERT to Supabase
       │
       ▼
Realtime propagates to other family devices
TanStack Query invalidated → fresh data from server
```

### Barcode Scan Flow

```
Camera captures barcode (EAN string)
       │
       ▼
Check IndexedDB product_cache (by EAN, within 30 days)
  ├── Hit: prefill item name + category, skip network
  └── Miss:
       │
       ▼
  POST to Supabase Edge Function /barcode/{ean}
  Edge Function: check product_cache table → Kassal.app → Open Food Facts
       │
       ▼
  Product returned → save to IndexedDB
  Prefill item form: name, brand, category hint
       │
       └── User confirms/edits → INSERT list_item
```

### Store Layout Resolution Flow

```
List loaded (with store_id or no store)
       │
       ▼
Fetch list_items + categories + store_layouts
       │
       ▼
Group items by category_id
For each category:
  - If list.store_id exists → join store_layouts for sort_order
  - Else → use categories.default_order
       │
       ▼
Render sorted category groups
```

---

## Component Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React UI ↔ Service Layer | TanStack Query hooks | UI never calls Supabase directly |
| Service Layer ↔ Supabase | Supabase JS client | Authenticated via session JWT |
| Supabase Realtime ↔ Client | WebSocket (managed by Supabase JS) | One channel per open list |
| Service Worker ↔ IndexedDB | `idb` library (Promise-based) | Async, no blocking |
| Edge Function ↔ Kassal.app | HTTPS GET with API key in env | Key stored in Edge Function secrets |
| Edge Function ↔ product_cache | Supabase service role client | Bypasses RLS for cache writes |

---

## Suggested Build Order (Phase Dependencies)

```
Phase 1: Auth + Household Foundation
  → profiles, households tables, RLS, invite flow
  → Nothing else works without authenticated household context

Phase 2: Lists + Items (Core Loop)
  → lists, list_items tables, CRUD, category grouping
  → Realtime subscription (basic, not yet filtered with full REPLICA IDENTITY)
  → This is the testable shopping loop

Phase 3: Store Layouts + Category Ordering
  → stores, store_layouts, categories seeded with Norwegian defaults
  → Depends on: items must exist before layout ordering matters

Phase 4: Barcode Lookup
  → product_cache table + Edge Function + Kassal.app + OPF integration
  → Depends on: list_items must exist to receive scanned products
  → Edge Function can be built independently of Phase 3

Phase 5: PWA + Offline
  → Service worker, IndexedDB persist, Background Sync queue
  → Should wrap Phase 2 flow first (add/check items)
  → Depends on: mutation patterns established in Phase 2

Phase 6: History + Recommendations
  → item_history table, history view, co-purchase suggestion queries
  → Depends on: list_items must have been checked off in production
  → Recommendations are trivially SQL-based at family scale (no ML needed)
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Kassal.app | GET /api/v1/products/ean/{ean} via Edge Function | Bearer token, Norwegian grocery data |
| Open Food Facts | GET /api/v2/product/{ean}.json | Free, no auth, global fallback |
| Supabase Auth | supabase.auth.signUp / signInWithOtp | Email/password or magic link |
| Supabase Realtime | supabase.channel().on('postgres_changes') | WebSocket, auto-reconnect |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| features/ ↔ services/ | Imported async functions | Services are pure, no React deps |
| hooks/ ↔ services/ | Hooks wrap services with useQuery/useMutation | Query keys are the contract |
| sw/ ↔ services/ | IndexedDB queue (no direct import possible) | SW is a separate JS context |

---

## Anti-Patterns

### Anti-Pattern 1: Subscribe at Household Level

**What people do:** Subscribe to all list_items changes filtered by household_id.
**Why it's wrong:** Every INSERT on any list triggers an RLS check per subscriber. A household with many lists accumulates unnecessary event volume. Also, filtering on household_id requires REPLICA IDENTITY FULL on list_items AND list_items does not have a household_id column directly — you'd need a join, which Realtime filters do not support.
**Do this instead:** Subscribe per active list (`list_id=eq.{listId}`). Unsubscribe when the list is closed. This minimizes event scope and RLS overhead.

### Anti-Pattern 2: Applying Realtime Payloads Directly to Cache

**What people do:** Take the `payload.new` from a Realtime event and patch it into TanStack Query cache directly.
**Why it's wrong:** The payload bypasses TanStack Query's normalization, stale-while-revalidate logic, and optimistic update reconciliation. It can produce inconsistent UI if an optimistic update is in-flight.
**Do this instead:** On any Realtime event, call `queryClient.invalidateQueries()`. Let TanStack Query refetch from the source of truth.

### Anti-Pattern 3: Per-Row RLS Subqueries

**What people do:** Write RLS policies with subqueries that reference other tables inline:
```sql
using (household_id = (select household_id from profiles where id = auth.uid()))
```
**Why it's wrong:** PostgreSQL evaluates this subquery once per row scanned, causing full-table scans on large tables.
**Do this instead:** Use the `my_household_id()` SECURITY DEFINER function wrapped in `(select my_household_id())` so the planner caches the result for the query duration.

### Anti-Pattern 4: Storing Complete Product Data in list_items

**What people do:** Copy all product fields (name, brand, image, nutrition) into the list_items row.
**Why it's wrong:** Massively inflates list_items table size, makes Realtime payloads large, and creates data drift if product data is updated.
**Do this instead:** Store only `product_id` (FK to product_cache) and `name` (denormalized for offline display). Fetch full product data separately via JOIN when needed.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 households (family) | Current design is complete — no changes needed |
| 100 households | Index review; ensure `my_household_id()` function is performant |
| 10K households | Consider Realtime connection limits (Supabase Pro: 500 concurrent); evaluate Broadcast over Postgres Changes for list_items |
| 100K+ households | Separate Realtime tier; pgBouncer connection pooling; product_cache becomes shared CDN-backed service |

### Scaling Priorities

1. **First bottleneck (if public):** Realtime concurrent connections — Supabase Free tier is 200, Pro is 500. Mitigation: upgrade plan or switch to Broadcast pattern.
2. **Second bottleneck:** product_cache table scan performance — mitigated by the EAN index already in the schema.

---

## Sources

- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax, REPLICA IDENTITY, RLS interaction (HIGH confidence)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SECURITY DEFINER pattern, index strategy (HIGH confidence)
- [Supabase Realtime Subscribing to DB Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) — subscription setup, channel cleanup (HIGH confidence)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, auth.uid() (HIGH confidence)
- [MDN: Offline and Background Operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — Background Sync API, service worker patterns (HIGH confidence)
- [LogRocket: Offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — IndexedDB patterns, architecture (MEDIUM confidence)
- [TanStack Query: Optimistic Updates](https://tanstack.com/query/v4/docs/framework/react/guides/optimistic-updates) — onMutate/onError pattern (HIGH confidence)
- [Kassal.app API Docs](https://kassal.app/api/docs) — EAN lookup endpoint, response structure (MEDIUM confidence — auth details unclear from public docs)
- [DEV: Enforcing RLS in Supabase Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) — household membership RLS pattern (MEDIUM confidence)

---
*Architecture research for: HandleAppen — Family Grocery Shopping PWA*
*Researched: 2026-03-08*

# Stack Research

**Domain:** Family grocery shopping PWA with Supabase backend
**Researched:** 2026-03-08
**Confidence:** HIGH (core stack verified via npm, official Supabase docs, and official SvelteKit/Svelte docs)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SvelteKit | 2.53.4 | App framework, routing, SSR/SSG, PWA shell | Ships 50-70% less JS than Next.js for equivalent features; compiles away at build time; no runtime overhead; #1 satisfaction in State of JS. For a mobile-first PWA used while physically in a store, TTI and bundle size matter more than ecosystem breadth. |
| Svelte | 5.53.7 | UI component language | Runes system ($state, $derived, $effect) replaces stores for local and shared reactive state; compiler-driven — no virtual DOM. Global shared state lives in `.svelte.ts` files using $state. |
| TypeScript | 5.9.3 | Type safety across entire codebase | SvelteKit is TypeScript-first; the Supabase JS client ships full types generated from your schema; barcode lookup responses from external APIs need typed guards. Non-negotiable for this complexity level. |
| Supabase JS | 2.98.0 | Auth, database queries, realtime subscriptions, edge function calls | Official client for all Supabase services. Use @supabase/ssr (0.9.0) alongside it for server-side cookie-based auth in SvelteKit hooks and load functions. |
| Tailwind CSS | 4.2.1 | Utility-first styling | v4 ships as a Vite plugin (`@tailwindcss/vite`) — zero PostCSS config, zero tailwind.config.js. SvelteKit CLI now scaffolds Tailwind v4 by default. Rapid mobile UI development without context-switching to CSS files. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vite-pwa/sveltekit | 1.1.0 | Service worker generation, web manifest, offline caching, install prompt | Use from day 1. Wraps Workbox and integrates cleanly with SvelteKit's SSR/SSG adapter pipeline. Handles the rebuild step SvelteKit requires after build. |
| @tailwindcss/vite | 4.2.1 | Vite plugin for Tailwind v4 | Required for Tailwind v4 — replaces the PostCSS plugin approach entirely. |
| @tanstack/svelte-query | 6.1.0 | Server-state management: caching, background refetch, optimistic updates | Use for all Supabase data fetching. v6 fully migrated to Svelte 5 runes syntax. Pattern: TanStack Query for data fetching + Supabase Realtime to call `invalidateQueries()` when events arrive. This avoids manually stitching together initial query results with incremental Realtime change events. |
| barcode-detector (npm) | 3.1.0 | Barcode Detection API polyfill for iOS Safari | The native BarcodeDetector Web API works in Chrome/Android but not on iOS Safari (as of early 2026). Use the `barcode-detector` ponyfill which bundles ZXing-C++ compiled to WebAssembly. Supports EAN-13 (the standard format for European/Norwegian grocery barcodes). Import the polyfill path to register globally only when native is absent. |
| workbox-window | 7.4.0 | Service worker lifecycle management from app code | Needed when implementing manual "update available" prompts. @vite-pwa/sveltekit wraps this internally, but version-pin to avoid mismatches. |
| idb | 8.0.3 | IndexedDB wrapper for offline queue | Use for queuing item mutations when the device is offline (during poor in-store connectivity). Provides a Promise-based API over raw IndexedDB. Used by the offline sync layer only — not for primary data. |
| shadcn-svelte | 1.1.1 | Headless, accessible, unstyled component library | Use for form inputs, dialogs, bottom sheets, dropdowns. Built on bits-ui and Tailwind — components are copied into source (not a black-box dependency), which matters for a Svelte 5 + Tailwind v4 setup. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Build tool, dev server | Bundled with SvelteKit — no separate install. vite-plugin-pwa and @tailwindcss/vite both hook into it. |
| Supabase CLI | Local dev stack (Postgres + Auth + Realtime + Storage) | `npx supabase start` launches a full local Supabase via Docker. Required for offline dev and safe schema iteration without touching production. |
| supabase-js type generation | TypeScript types from DB schema | Run `supabase gen types typescript` after every migration. Import the generated `Database` type into your Supabase client for end-to-end type safety on queries. |
| ESLint + Prettier | Code quality and formatting | SvelteKit's official scaffolder includes both with svelte-specific plugins. Keep defaults. |
| Playwright | E2E testing | SvelteKit's official test scaffold. Useful for testing the realtime sync across two browser windows — a scenario unit tests cannot cover. |

---

## Installation

```bash
# Scaffold project (choose TypeScript, Tailwind when prompted)
npx sv create handleappen
cd handleappen

# Supabase client libraries
npm install @supabase/supabase-js @supabase/ssr

# TanStack Query for Svelte 5 (v6 = runes-native)
npm install @tanstack/svelte-query

# PWA support
npm install -D @vite-pwa/sveltekit

# Barcode scanning polyfill
npm install barcode-detector

# Offline queue (IndexedDB)
npm install idb

# Component library (run interactively)
npx shadcn-svelte@latest init

# Dev tooling
npm install -D supabase
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| SvelteKit | Next.js 15 | Your team is already deeply invested in React and cannot take the Svelte learning curve. React ecosystem is genuinely needed (e.g., complex charting with Recharts, heavy form libraries). Not recommended here — no meaningful advantage for this app's scope. |
| SvelteKit | Remix | If your app is heavily form-driven and you want to co-locate mutations with routes. Not applicable — this app is realtime-driven, not form-driven. |
| Svelte 5 runes ($state) | Zustand | Zustand is a React solution. In Svelte 5, reactive `.svelte.ts` state files replace Zustand. No extra dependency needed. |
| @tanstack/svelte-query v6 | Manual Supabase Realtime + writable stores | Works for simple cases but breaks down quickly: you must manually merge initial snapshot data with incremental change events, handle race conditions, and re-implement caching. TanStack Query solves all of this. |
| barcode-detector polyfill | @zxing/browser | @zxing/browser is in maintenance mode (no active maintainers), performance is weaker on poorly-lit barcodes, and the recognition rate for small 1D barcodes (EAN-13 on grocery packaging) is lower than the ZXing-C++ WASM backing `barcode-detector`. |
| barcode-detector polyfill | Scanbot SDK | Scanbot is significantly more accurate but costs money (commercial license). Acceptable if recognition rate proves insufficient in testing, but start with the free polyfill. |
| Tailwind CSS v4 | Tailwind CSS v3 | If you are on an existing project locked to v3, staying on v3 is fine. For greenfield with SvelteKit 2+, v4's Vite-native integration is cleaner and faster — no PostCSS pipeline needed. |
| @vite-pwa/sveltekit | Manual service worker (src/service-worker.ts) | SvelteKit supports hand-authored service workers natively, but you lose Workbox's pre-caching, routing strategies, and background sync. Use manual only if your caching needs are trivial (they are not for this app). |
| shadcn-svelte | Skeleton UI | Skeleton is good but its Svelte 5 support lagged behind. shadcn-svelte v1 is runes-native and actively maintained. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redux / Redux Toolkit | React-specific, massively overengineered for Svelte. In Svelte 5, reactive `.svelte.ts` files cover 90% of Redux use cases with zero boilerplate. | Svelte 5 $state in `.svelte.ts` + TanStack Query for server state |
| Pinia / Vue stores | Vue-ecosystem. Irrelevant in a Svelte project. | Svelte 5 runes |
| QuaggaJS / Quagga2 | CPU-intensive pure-JS 1D barcode decoder; struggles on low-light grocery barcodes; no active maintainer for the original; Quagga2 fork is community-maintained but inconsistent accuracy on EAN-13. | barcode-detector (ZXing-C++ WASM polyfill) |
| @zxing/browser | In maintenance mode as of 2024; maintainers openly stated they no longer have time for active development; lower recognition accuracy than WASM-backed alternatives. | barcode-detector npm polyfill |
| Firebase Realtime Database | Redundant given Supabase is already chosen. Adding a second real-time backend creates sync hell. | Supabase Realtime |
| react-query / @tanstack/react-query | React-specific package. The Svelte adapter is @tanstack/svelte-query. | @tanstack/svelte-query v6 |
| next-pwa | Next.js-specific PWA wrapper. Irrelevant with SvelteKit. | @vite-pwa/sveltekit |
| Tailwind CSS v3 (for new installs) | v4 is GA and the SvelteKit CLI scaffolds it by default. v3 requires PostCSS config that v4 eliminates. Starting on v3 now means migrating later. | Tailwind CSS v4 + @tailwindcss/vite |
| @supabase/auth-helpers-sveltekit | Deprecated in favour of @supabase/ssr. Do not use — the old package is unmaintained and relies on cookie patterns that break on modern SvelteKit. | @supabase/ssr |

---

## Stack Patterns by Variant

**For the Supabase Realtime sync pattern (shared shopping list):**
- Subscribe to Postgres changes (`postgres_changes`) filtered by `household_id` or `list_id`
- On any `INSERT`, `UPDATE`, or `DELETE` event, call `queryClient.invalidateQueries({ queryKey: ['list', listId] })`
- TanStack Query then re-fetches the full list — this is simpler and more correct than manually applying diffs
- Unsubscribe in the component's `onDestroy` or SvelteKit layout's `onDestroy` to prevent memory leaks
- Enable Row-Level Security on all tables — Realtime respects RLS since Supabase Realtime v2

**For barcode scanning (mobile PWA):**
- Use the `BarcodeDetector` API (native where available, polyfill elsewhere) with `formats: ['ean_13', 'ean_8']`
- Stream camera via `getUserMedia` with `facingMode: 'environment'` (rear camera)
- Run detection in a `requestAnimationFrame` loop; stop the loop on successful scan to save battery
- Show a viewfinder overlay using a canvas element positioned over the video feed
- Fallback: manual EAN entry text input if camera permission is denied

**For Kassal.app API integration (barcode lookup):**
- Primary: `GET https://kassal.app/api/v1/products/ean/{ean}` — returns product name, category, image, and prices across Norwegian stores
- Fallback: Open Food Facts `GET https://world.openfoodfacts.net/api/v2/product/{barcode}` — broader global coverage, useful when Kassal has no entry for niche products
- Call from a Supabase Edge Function rather than directly from the client — this hides API keys, centralises error handling, and makes it easy to cache lookups in your own `products` table to avoid redundant API calls
- Cache successful lookups in Postgres: if `products` table already has the EAN, skip the external API call entirely

**For offline support during shopping:**
- Cache the app shell (HTML, JS, CSS) with `CacheFirst` strategy via @vite-pwa/sveltekit's Workbox config
- Cache Supabase REST API responses with `NetworkFirst` strategy (serve stale if network fails)
- Queue mutations (add item, remove item, check off) to IndexedDB using `idb` when offline
- Replay the queue via Background Sync when connectivity returns (Workbox `BackgroundSyncPlugin`)

**For Norwegian language support:**
- SvelteKit has no built-in i18n — use `paraglide-js` (from the same org as SvelteKit, Inlang) as it's compiler-based and produces zero-overhead typed i18n
- Norwegian Bokmål (nb) as primary locale, English (en) as fallback
- Store the user's preferred locale in Supabase user metadata

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @tanstack/svelte-query@6 | Svelte 5, SvelteKit 2 | v6 is required for Svelte 5 runes. v5 has buggy runes compatibility. Do not use v5. |
| @vite-pwa/sveltekit@1.1.0 | SvelteKit 2, Vite 5/6 | Requires the extra `pwa:build` script step in package.json after SvelteKit build completes. |
| @supabase/ssr@0.9.0 | @supabase/supabase-js@2.x | Must be used together. Handles cookie storage for auth sessions across SvelteKit hooks, server load, and client. |
| barcode-detector@3.1.0 | All modern browsers | Registers native BarcodeDetector when absent. Import: `import 'barcode-detector/pure'` for the ponyfill variant or `import 'barcode-detector/polyfill'` to override globally. |
| Tailwind CSS@4.x | Vite 5+, SvelteKit 2 | Use `@tailwindcss/vite` plugin. No PostCSS, no `tailwind.config.js`. Config lives in CSS via `@theme`. Not compatible with PostCSS-based shadcn-svelte versions — use shadcn-svelte v1+ which supports v4. |
| shadcn-svelte@1.x | Svelte 5, Tailwind v4 | v1 is a breaking change from v0. v1 is Svelte 5 runes-native and Tailwind v4 compatible. Do not mix with shadcn-svelte v0. |

---

## Sources

- npm registry (verified via `npm show`) — versions for all packages above
- [Supabase Docs — SvelteKit Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/sveltekit) — MEDIUM confidence (official docs, verified current)
- [Supabase Docs — Server-Side Auth for SvelteKit](https://supabase.com/docs/guides/auth/server-side/sveltekit) — HIGH confidence (official)
- [Supabase Docs — Realtime](https://supabase.com/docs/guides/realtime) — HIGH confidence (official)
- [Vite PWA — SvelteKit framework guide](https://vite-pwa-org.netlify.app/frameworks/sveltekit) — HIGH confidence (official plugin docs)
- [TanStack Query — Svelte v5 docs](https://tanstack.com/query/v5/docs/framework/svelte/overview) — HIGH confidence (official)
- [Kassal.app API docs](https://kassal.app/api/docs) — MEDIUM confidence (endpoint structure confirmed; auth mechanism not fully documented publicly)
- [barcode-detector polyfill on npm](https://www.npmjs.com/package/barcode-detector) — HIGH confidence (npm-verified)
- [Svelte 5 runes — global state patterns](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) — MEDIUM confidence (community article, current)
- [ZXing maintenance mode announcement](https://github.com/zxing-js/library) — HIGH confidence (GitHub repo, maintainer statement)
- [Tailwind CSS v4 + SvelteKit official guide](https://tailwindcss.com/docs/guides/sveltekit) — HIGH confidence (official Tailwind docs)
- WebSearch cross-references for SvelteKit vs Next.js 2026 — LOW-MEDIUM confidence (aggregated from multiple community comparisons)

---
*Stack research for: HandleAppen — family grocery shopping PWA*
*Researched: 2026-03-08*

# Feature Research

**Domain:** Family grocery shopping PWA (Norwegian market)
**Researched:** 2026-03-08
**Confidence:** MEDIUM-HIGH (core features HIGH; Norwegian-specific integrations MEDIUM)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time list sync across devices | Every competitor (OurGroceries, AnyList, Bring) offers this; users share lists while one person is already in the store | MEDIUM | Supabase Realtime handles this; core challenge is conflict resolution when two users edit simultaneously. Timestamp-based merge is standard. |
| Add items by typing | Most basic list interaction; any app missing this is broken | LOW | Autocomplete from item history is expected too — OurGroceries surfaces every item ever entered |
| Check off items while shopping | The act of shopping; users tap to strike through items | LOW | Checked state must sync in near-real-time — this is the moment another family member sees progress |
| Multiple named lists | Families organize by store, occasion, or week; a single list is too rigid | LOW | e.g., "Kiwi mandag", "Spar helg", "Fest lørdag" |
| Household / family sharing | Core use case — one list, multiple shoppers | MEDIUM | OurGroceries uses shared account email; AnyList uses invite links; individual accounts under a shared household is the right model for history-per-person |
| Item grouping by category | Users expect items to be grouped, not a flat dump — all major apps do this | LOW | Categories: produce, dairy, meat, bakery, frozen, dry goods, beverages, household, personal care |
| Barcode scanning to add items | OurGroceries (17M product DB), AnyList, and Bring all support this — users expect it for packaged goods | MEDIUM | Kassal.app API covers ~100,000 Norwegian products via EAN; Open Food Facts as fallback. Camera access required in PWA (works on mobile Chrome/Safari). |
| Offline / poor-connectivity support | Grocery stores often have weak signal — app must work in the aisle | HIGH | Service worker + IndexedDB for optimistic local mutations; sync on reconnect. This is the hardest table-stakes item technically. |
| Item history / quick re-add | OurGroceries remembers every item ever entered; users re-buy the same ~70% of items weekly | LOW | Surface history as autocomplete suggestions when typing; also used for recommendations |
| Norwegian product names | App is for Norwegian families; UI language and product names must be Norwegian | LOW | Kassal.app returns Norwegian product names natively; UI strings in Norwegian (bokmål primary) |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Store-layout-aware category ordering | The core value of HandleAppen — you shop in aisle order, never backtrack. No major competitor does this automatically for Norwegian stores. | MEDIUM | One default ordering (produce → dairy → meat → bakery → frozen → dry goods → beverages → household) tuned to common Norwegian store layouts (Rema 1000, Kiwi, Meny, Spar all share similar flow). Per-store overrides via drag-and-drop reordering. Any family member can edit. |
| Per-store layout overrides | Rema 1000 differs from Meny in layout; power users want precision per store | MEDIUM | The default layout reduces setup friction. Override is optional but unlocks precision. Stored per named list or per store entity. |
| History-based recommendations | ~70% of grocery items are repetitive; surfacing "you usually buy X on Mondays" reduces cognitive load | HIGH | Requires purchase history log (items checked off = purchased). Co-purchase suggestions (items bought together) add value. Supabase edge function for aggregation logic. This is a long-term differentiator — gets better over time. |
| Individual accounts + shared household | Users get personal history and personal recommendations while sharing lists — better than pure shared-account models (OurGroceries) | MEDIUM | Who added what, who checked it off — richer data for recommendations. AnyList and OurGroceries use simpler shared-account approaches. |
| Kassal.app barcode data (Norwegian-first) | Norwegian product names, prices, allergen data, nutritional info — not available in international databases like Open Food Facts for many local products | LOW (integration) | 100,000 Norwegian products. EAN lookup returns product name, brand, category, ingredients, nutritional data. Free tier: 60 req/min. |
| PWA installability (no app store) | Families can install from browser link without Play Store / App Store friction — important for less tech-savvy family members | LOW (PWA manifest) | Requires HTTPS, web app manifest, service worker. Works on Android Chrome fully; iOS Safari has some PWA limitations (no push notifications in older iOS). |
| Clean Norwegian UI (no ads, no monetization clutter) | Bring runs sponsored product ads from Nestlé/Unilever; Listonic is ad-supported; users are frustrated. A clean, private-first app for family use is a real differentiator. | LOW | No third-party data sharing, no sponsored placements |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Price comparison across stores | Users want cheapest option; Kassal.app has price data | Requires tracking real-time prices per store per product — data is stale quickly, Kassal.app data lags. Becomes the entire product focus at expense of list UX. Mattilbud and Kassal.app already do this better. | Out of scope for v1. If needed, deep-link to Kassal.app for price lookup on a specific product. |
| Meal planning integration | Recipe-driven lists are popular (AnyList's main differentiator) | Different use case, different UX, significant scope expansion. Splits focus between two product identities. | Defer to v2+. The purchase history + recommendations approach satisfies "what did we eat last week?" without full meal planning. |
| Push notifications for list changes | "Notify me when someone adds to the list" is frequently requested | iOS PWA push notification support is unreliable pre-iOS 16.4 and still buggy. Adds backend complexity (web-push service). Real-time sync already surfaces changes immediately when the app is open. | Show an in-app indicator when new items were added since last view. Defer push notifications to v2 after PWA push support matures. |
| Native mobile app (iOS / Android) | Better performance, push notifications, deeper OS integration | Doubles development and maintenance burden. PWA covers the core mobile use case adequately. Separate codebases diverge over time. | PWA installable on home screen. Revisit if PWA limitations become blockers. |
| Receipt scanning / OCR | "Scan receipt to log what you bought" — automatic history | OCR accuracy on Norwegian grocery receipts is poor; receipt formats vary per chain; maintenance burden for parsing rules is high | Manual check-off during shopping is the correct logging mechanism — it captures intent, not receipt |
| Budget tracking / spending stats | Most-requested missing feature across OurGroceries, AnyList, Bring | Requires price data per item per store at time of purchase — either manual entry (friction) or price API integration (complexity + staleness). Scope creep that dilutes shopping list focus. | Surface Kassal.app price on barcode scan (read-only, no tracking). Defer budget tracking to v2+ if validated. |
| Social / community features (sharing with neighbors, public lists) | Some apps experiment with community bulk-buying | Wrong audience for family grocery tool; privacy concerns; moderation overhead | Keep scope firmly on private household use |
| AI-powered image recognition for adding items | "Take photo of fridge, AI adds what's missing" | Accuracy is low for fresh/unpackaged produce (escarole vs frisée problem); creates wrong expectations; UX for reviewing AI output adds friction | Barcode scan for packaged goods + text search for produce. Clear beats clever here. |

---

## Feature Dependencies

```
[Household / family sharing]
    └──requires──> [Individual user accounts]
                       └──requires──> [Auth system (Supabase Auth)]

[Store-layout-aware category ordering]
    └──requires──> [Item grouping by category]
                       └──requires──> [Category data model]

[Per-store layout overrides]
    └──requires──> [Store-layout-aware category ordering]
    └──requires──> [Named lists (per store)]

[History-based recommendations]
    └──requires──> [Item history / purchase log]
                       └──requires──> [Check-off action logged to DB]
                       └──requires──> [Individual accounts] (for per-user history)

[Barcode scanning]
    └──requires──> [Kassal.app API integration]
    └──enhances──> [Item history] (product identified = richer history entry)

[Offline support]
    └──requires──> [Service worker]
    └──requires──> [IndexedDB local cache]
    └──enhances──> [Real-time sync] (sync-on-reconnect pattern)

[Real-time sync]
    └──requires──> [Supabase Realtime subscriptions]
    └──requires──> [Auth system] (authenticated channels)

[Co-purchase recommendations]
    └──requires──> [Item history / purchase log]
    └──requires──> [Multiple shopping sessions] (cold-start problem — useless for new users)
```

### Dependency Notes

- **Store-layout ordering requires categories:** You cannot sort by store layout without a category system. Categories must be built before layout ordering.
- **Recommendations require history:** The recommendations section (bottom nav) has a cold-start problem for new users. It should show history-based "you bought these recently" before co-purchase logic kicks in. Usable from day one, gets better over time.
- **Offline support enhances real-time sync:** These are not alternatives — offline-first means optimistic local mutations that sync when reconnected. Both are needed simultaneously.
- **Individual accounts required for per-user history:** If history is attached to household only (OurGroceries model), you lose the ability to surface "you personally buy X" vs "household buys X". Individual accounts are a prerequisite for high-quality recommendations.
- **Barcode scan enhances history quality:** A text-typed "melk" vs a barcode-scanned "Q-Meieriene Lettmelk 1L" are different history entries. Barcode scanning makes history richer and recommendations more specific.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Individual accounts + household joining — users need identity to share lists
- [ ] Multiple named shopping lists — the container for everything else
- [ ] Add items by typing with autocomplete from history — primary input method
- [ ] Item grouping by category with default Norwegian store layout order — the core differentiator; must ship in v1 or product is generic
- [ ] Real-time sync across household members — table stakes; without this it is just a notes app
- [ ] Check off items while shopping — core shopping interaction
- [ ] Barcode scanning via Kassal.app + Open Food Facts fallback — differentiates from plain text lists; solves packaged goods naming
- [ ] Offline support (read list, check items, add items when offline; sync on reconnect) — required for grocery store use where signal is unreliable
- [ ] Purchase history log (items checked off → logged) — feeds recommendations; must start logging from day one to build history
- [ ] Norwegian UI (bokmål) — language must match market

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Per-store layout overrides — add when users report their store differs from default; build drag-and-drop category reordering
- [ ] History-based recommendations section (bottom nav) — add once sufficient purchase history exists in production; minimum ~4-6 weeks of real data
- [ ] Co-purchase suggestions — layer on top of recommendations once history is established
- [ ] Nutritional / allergen data display on barcode scan — Kassal.app provides this; surface it after scan UX is stable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Push notifications for list changes — defer until iOS PWA push support is reliable; prioritize in-app notifications first
- [ ] Meal planning integration — separate product concern; only if user demand is validated
- [ ] Price tracking / budget features — requires sustained price data investment; validate demand first
- [ ] Native iOS / Android app — only if PWA limitations (push, background sync) become user-reported blockers at scale

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Real-time sync | HIGH | MEDIUM | P1 |
| Add items by typing | HIGH | LOW | P1 |
| Check off items | HIGH | LOW | P1 |
| Multiple named lists | HIGH | LOW | P1 |
| Household / family sharing | HIGH | MEDIUM | P1 |
| Item grouping by category | HIGH | LOW | P1 |
| Store-layout category ordering | HIGH | LOW-MEDIUM | P1 |
| Offline support | HIGH | HIGH | P1 |
| Norwegian UI (bokmål) | HIGH | LOW | P1 |
| Barcode scanning (Kassal.app) | MEDIUM-HIGH | MEDIUM | P1 |
| Purchase history log | HIGH | LOW | P1 (foundation for P2 features) |
| Per-store layout overrides | MEDIUM | MEDIUM | P2 |
| History-based recommendations | MEDIUM | HIGH | P2 |
| Co-purchase suggestions | MEDIUM | HIGH | P2 |
| Nutritional data on barcode scan | LOW | LOW | P2 |
| Push notifications | LOW | HIGH | P3 |
| Meal planning | MEDIUM | HIGH | P3 |
| Budget / price tracking | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | OurGroceries | AnyList | Bring | HandleAppen (planned) |
|---------|--------------|---------|-------|----------------------|
| Real-time sync | Yes (free) | Yes (free tier) | Yes | Yes (Supabase Realtime) |
| Household sharing | Yes (shared account) | Yes (invite) | Yes | Yes (individual accounts + household) |
| Barcode scanning | Yes (17M products, international) | Yes | No | Yes (Kassal.app Norwegian-first + OFF fallback) |
| Category grouping | Yes | Yes | Yes | Yes |
| Store layout ordering | No (alpha or custom drag only) | Manual drag | Manual drag | Yes (default + per-store override) |
| Offline support | Partial | Partial | Partial | Yes (service worker + IndexedDB) |
| Purchase history | Basic (item name recall) | Basic | No | Yes (full log → recommendations) |
| Recommendations | No | No | Basic (trending) | Yes (history-based + co-purchase) |
| Norwegian product data | No (international DB) | No | No | Yes (Kassal.app) |
| No ads | No ($6/yr to remove) | Yes (paid) | No (sponsored placements) | Yes |
| PWA / installable | Yes (web app) | Yes (web premium) | No (native only) | Yes (PWA-first) |
| Meal planning | No | Yes (core feature) | No | No (out of scope) |
| Norwegian market focus | No | No | Partial (European) | Yes |

---

## Norwegian Market Specifics

### Store Chains and Layout

The major Norwegian grocery chains — Rema 1000, Kiwi, Meny, Spar, Coop (Prix/Extra/Mega/Obs) — share a broadly similar store layout pattern despite being different chains:

**Common Norwegian store category flow (confidence: MEDIUM — inferred from store descriptions; exact order varies by location):**

1. Produce (frukt og grønt)
2. Bakery (bakeri / brød)
3. Deli / cold cuts / cheese (delikatesse / pålegg / ost)
4. Meat and fish (kjøtt og fisk)
5. Dairy (meieri — melk, yoghurt, smør, egg)
6. Frozen (frysedisk)
7. Dry goods / pantry (tørrvarer — pasta, ris, hermetikk, mel)
8. Beverages (drikke — juice, brus, vann)
9. Snacks / confectionery (snacks / godteri)
10. Household and cleaning (husholdning / rengjøring)
11. Personal care (personlig pleie)

This default ordering is the reasonable starting point. Per-store overrides handle deviations (Meny premium stores differ more; larger Coop Obs stores have different flows).

### Norwegian-Specific Features

- **Kassal.app API:** 100,000 Norwegian products, EAN barcode lookup, Norwegian product names, price history, allergens, nutritional data. Free tier: 60 req/min. No bulk EAN limitation beyond 100 per request. This is the right primary source — no equivalent international API covers Norwegian products well.
- **Open Food Facts fallback:** International DB covers imported products that Kassal.app may miss. Important for non-Norwegian brands.
- **Loyalty card apps (Æ / Rema 1000, Kiwi app, Trumf / NorgesGruppen):** These are separate chain-owned apps. HandleAppen does NOT integrate with them — they require store partnerships. Users manage these separately. Anti-feature for v1.
- **Mattilbud app:** Norwegian deal aggregator across all chains. Separate concern — do not replicate. Could deep-link if needed.
- **Language:** Norwegian bokmål (bokmål) as primary UI language. English fallback acceptable for dev but Norwegian is the shipped experience.

---

## Sources

- OurGroceries User Guide: https://www.ourgroceries.com/user-guide
- SmartCart Family comparison (Listonic, Bring, AnyList, OurGroceries): https://smartcartfamily.com/en/blog/grocery-apps-comparison
- Bring collaborative features: https://www.getbring.com/en/features/collaborative
- Kassal.app API documentation: https://kassal.app/api
- NerdWallet grocery app comparison 2025: https://www.nerdwallet.com/finance/learn/best-grocery-list-apps
- Scandit barcode scanning UX guide: https://www.scandit.com/resources/guides/barcode-scanning-challenges/
- Norwegian supermarkets overview: https://www.lifeinnorway.net/supermarkets-in-norway/
- NLS Norway: Rema 1000, Kiwi, Meny guide: https://nlsnorwayrelocation.no/a-guide-to-norwegian-supermarkets-rema-1000-kiwi-and-meny-explained/
- PWA offline sync patterns: https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/
- Grocery app trends 2026: https://www.elitemcommerce.com/blog/2025/09/12/building-the-ultimate-grocery-app-trends-to-watch-in-2026/

---
*Feature research for: Family grocery shopping PWA (Norwegian market)*
*Researched: 2026-03-08*

# Pitfalls Research

**Domain:** Family grocery shopping PWA with Supabase Realtime, household sharing, barcode scanning, store-layout-aware lists
**Researched:** 2026-03-08
**Confidence:** HIGH (Supabase limits and RLS patterns verified against official docs; iOS camera issues verified against Apple Developer Forums and STRICH knowledge base; barcode API verified against official Kassal.app docs)

---

## Critical Pitfalls

### Pitfall 1: Supabase Realtime Channels Never Cleaned Up (Memory Leak)

**What goes wrong:**
Every call to `supabase.channel('name')` appends a new `RealtimeChannel` object to the client's internal channels array. In React, if the `useEffect` that creates the subscription does not call `supabase.removeChannel(channel)` in its cleanup function, each render/mount cycle grows the array without bound. After a long session (navigating between lists, going in and out of the shopping view), the browser accumulates hundreds of phantom subscriptions, all receiving events. This causes duplicate state updates, sluggish UI, and eventually crashes the tab on lower-end Android devices. React 18 Strict Mode doubles the effect — every channel is created twice in development, making the leak appear immediately.

**Why it happens:**
Supabase documentation examples historically did not emphasize cleanup. Developers copy-paste subscription code into `useEffect` without a return function. The channels array grows silently — there is no error, just degraded performance.

**How to avoid:**
Always pair channel creation with removal in the same `useEffect`:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('list-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [listId]);
```

Use `supabase.getChannels()` in development to assert only N channels are open at any time. Never share a single channel reference across multiple components — create one per logical subscription scope.

**Warning signs:**
- Event handlers firing 2x, 4x, 8x per database change
- `supabase.getChannels().length` growing over a session
- Performance degrades after navigating between shopping lists multiple times

**Phase to address:** Core real-time sync phase (when list subscriptions are first built)

---

### Pitfall 2: Postgres Changes DELETE Events Are Not Filterable and Bypass RLS

**What goes wrong:**
Developers assume that setting up an RLS policy on the `list_items` table means only authorized users will receive DELETE events via Postgres Changes. This is wrong. Supabase's own documentation states: "RLS policies are not applied to DELETE statements" because Postgres cannot verify user access to an already-deleted row. Additionally, DELETE events cannot be filtered by column value. A subscription listening for `filter: 'list_id=eq.123'` will NOT reliably filter DELETE events. The client receives every deletion on the subscribed table, with only primary key data in the `old` record (unless `REPLICA IDENTITY FULL` is set).

**Why it happens:**
The INSERT and UPDATE event documentation correctly shows filtered subscriptions working as expected. Developers assume DELETE follows the same rules. The limitation is buried in fine print in the Postgres Changes docs.

**How to avoid:**
Two approaches, pick one:

1. **Never rely on DELETE events for security.** Apply application-level filtering on the client after receiving the event: check that the deleted `id` belongs to your current context before acting on it.
2. **Use Broadcast instead of Postgres Changes for mutations you control.** When a list item is deleted via an Edge Function or client call, emit a Broadcast event (`{ event: 'item-deleted', payload: { id, list_id } }`) on a channel scoped to the household. Broadcast is filterable and does not have the RLS limitation.

For a grocery app where security is household-level (not per-item), approach (2) is cleaner: use Broadcast channels named `household:{household_id}` and manually emit change events. This also scales better — Postgres Changes processes on a single thread, Broadcast does not.

**Warning signs:**
- DELETE events arriving for items from other lists during integration testing
- Client throwing "item not found" errors when processing deletions

**Phase to address:** Real-time sync architecture phase — decide Postgres Changes vs. Broadcast before building any subscription code

---

### Pitfall 3: RLS Policy Recursion on Household Membership Table

**What goes wrong:**
The natural data model has a `household_members` join table (`user_id`, `household_id`). To protect `lists` (which belong to a household), you write an RLS policy like:

```sql
-- BROKEN: causes infinite recursion
CREATE POLICY "household members can see lists"
ON lists FOR SELECT
USING (
  household_id IN (
    SELECT household_id FROM household_members WHERE user_id = auth.uid()
  )
);
```

This works in isolation, but the moment `household_members` itself has an RLS policy (which it must, to prevent users from seeing other households' membership), Postgres enters infinite recursion: checking `lists` triggers a check on `household_members`, which triggers its own policy, which may reference back to `lists`. The error is `ERROR: infinite recursion detected in policy for relation "household_members"` and it breaks ALL queries on affected tables.

**Why it happens:**
RLS policies evaluate recursively. Developers write separate policies for each table without realizing they create a circular dependency when both tables reference each other.

**How to avoid:**
Wrap membership checks in a `SECURITY DEFINER` function. Security definer functions bypass RLS on the tables they query, breaking the recursion:

```sql
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- Policy that uses the function (no recursion)
CREATE POLICY "household members can see lists"
ON lists FOR SELECT
USING (household_id IN (SELECT get_my_household_ids()));
```

Additionally, wrap `auth.uid()` calls in a `SELECT` subquery in all policies — this caches the result per query instead of re-evaluating per row, reducing policy overhead from ~179ms to ~9ms on large tables (measured by Supabase).

**Warning signs:**
- `infinite recursion detected` errors immediately after adding a second table's RLS policy
- Queries returning empty results after enabling RLS (often confused with recursion when policies silently break)

**Phase to address:** Auth and household data model phase — establish security definer pattern before writing any RLS policies

---

### Pitfall 4: iOS Safari PWA Camera Permissions Reset on Every Launch

**What goes wrong:**
When a user adds the HandleAppen PWA to their iOS home screen (the `apple-mobile-web-app-capable` behavior), camera permissions are NOT persisted between sessions. Every time the user opens the app from the home screen and tries to scan a barcode, iOS prompts for camera access again. This is a known, long-standing WebKit bug (bug #215884 on the WebKit bug tracker). The permission also resets when the app is sent to the background and brought back. On iOS 18, the problem worsened — the Shape Detection API (which had partial barcode support) regressed and is reported broken as of the iOS 18 update.

**Why it happens:**
PWA standalone mode on iOS runs in a separate WebKit process that does not share permission state with Safari. Apple has not fixed this despite it being reported since iOS 13.

**How to avoid:**
Do not rely on the `BarcodeDetector` Web API on iOS — it is not implemented in WebKit/Safari at all, on any iOS version. Use a WebAssembly-based barcode library instead:

- **`barcode-detector` npm package (v3+)** — polyfills the `BarcodeDetector` API using ZXing-C++ WASM; works on iOS Safari
- **`barcode-detector-polyfill`** — ZBar compiled to WASM via Emscripten; handles EAN-13, EAN-8, UPC-A, Code 128 (all formats needed for Norwegian grocery barcodes)

For the camera permission reset: implement a graceful re-request flow. Show an explicit "Tap to activate camera" button that calls `getUserMedia()` on user gesture each session, instead of auto-starting the camera. This is less surprising than a repeated system prompt appearing automatically. Consider providing a manual EAN input field as the reliable fallback — many users will prefer typing in poor lighting anyway.

**Warning signs:**
- Barcode scanning "works on desktop/Android but not iPhone"
- `BarcodeDetector is not defined` errors in console on iOS
- Users report being asked for camera permission every time they open the app

**Phase to address:** Barcode scanning phase — design around WASM from the start, not as an afterthought when iOS bugs appear

---

### Pitfall 5: Store Layout Category Ordering Using Sequential Integers (The Position Column Trap)

**What goes wrong:**
The obvious data model for ordered categories is a `position` integer column (1, 2, 3, ...). This works until a user reorders categories: moving "Frozen" from position 8 to position 3 requires updating every row between positions 3-8 to shift them. With 10-15 categories per store layout, this is 8 UPDATE statements in a transaction. With multiple family members editing layouts simultaneously, this creates write contention and Realtime events for every shifted row — flooding the subscription with irrelevant change events that appear as layout thrashing on other devices.

**Why it happens:**
Sequential integers are the intuitive first choice. The mutation overhead only becomes apparent when implementing drag-and-drop reordering UI.

**How to avoid:**
Use **lexicographic fractional indexing** (also called "order key" pattern). Store position as a string or float with gaps:

- Initial positions: `"a"`, `"b"`, `"c"` (or integers with gaps: 1000, 2000, 3000)
- Moving "Frozen" between positions `"b"` and `"c"` produces `"bm"` (or 1500)
- Only ONE row is updated per reorder operation

For this app, the simplest safe implementation: use `NUMERIC` with gaps of 1000, start at 1000. When a user reorders, set the new position to `(prev_position + next_position) / 2`. Re-normalize positions (reset to 1000, 2000, ...) only when precision exhausts (detectable when gap < 1). This is one UPDATE per drag. Combined with optimistic UI, reordering feels instant and emits a single Realtime event.

Apply the same pattern to the `list_items` table if item ordering within categories is needed.

**Warning signs:**
- Realtime subscription showing 10+ events for a single category reorder
- Write conflicts on the layout table when two family members save changes simultaneously
- Sluggish drag-and-drop UI during reordering

**Phase to address:** Store layout / category management phase

---

### Pitfall 6: Offline Conflict — Both Devices Check Off the Same Item

**What goes wrong:**
Family member A is shopping in-store with poor connectivity. They check off "Milk." Family member B, also shopping, checks off "Milk" offline two seconds later. Both devices queue the operation locally (IndexedDB). When connectivity resumes, both sync — resulting in either a duplicate "checked off" event or a conflict where one device's state clobbers the other. More problematically: if A also adds "Butter" while offline, and B deletes the list item category while offline, syncing produces an item without a valid category FK reference.

**Why it happens:**
Developers implement offline-first as a simple queue flush (send all pending operations on reconnect) without considering concurrent edits. For a shopping list, the naive last-write-wins approach based on wall-clock timestamps fails because device clocks are not synchronized and network delays skew ordering.

**How to avoid:**
For a **shopping list** specifically, conflict resolution is simpler than general document sync because the operations are coarse and largely commutative:

1. **Checked-off is idempotent.** Both devices checking off the same item produces the same result. Model the `checked` field as a monotone boolean: `true` wins over `false`, always. Never "un-check" based on a stale timestamp. In the DB, use: `UPDATE list_items SET checked = checked OR $1`.

2. **Additions are additive.** Two devices adding the same named item results in a duplicate — acceptable for v1, or de-duplicate on name + category on sync.

3. **Deletions are the risky case.** Do not hard-delete items on the client while offline. Queue a delete operation with a `client_timestamp`. On sync, the server applies the delete only if the item has not been checked off by another user since the client timestamp. Use soft deletes (`deleted_at TIMESTAMPTZ`) and resolve on the server via an Edge Function.

4. **Category FK integrity.** Apply foreign key constraints with `ON DELETE SET NULL` for `category_id`, not `ON DELETE CASCADE`. This prevents a category deletion from silently removing all items assigned to it.

**Warning signs:**
- Items appearing/disappearing when connectivity is restored
- Duplicate items in the list after a shared shopping session
- Test: put two browser tabs in offline mode, make conflicting changes, bring both online — observe the result

**Phase to address:** Offline sync phase — define conflict policy per operation type before implementing the sync queue

---

### Pitfall 7: Over-Engineering the Recommendation Engine

**What goes wrong:**
The recommendation section is scoped to "history-based + co-purchase suggestions." Teams frequently interpret this as requiring collaborative filtering across users, a separate ML model, or a vector similarity service. They spend 2-3 phases building a recommendation pipeline before verifying that families actually click on suggestions. The real dataset at launch is a single household's purchase history — typically 100-500 item entries — far too small for collaborative filtering, which degrades with sparse data.

**Why it happens:**
Collaborative filtering is the well-known "Amazon does this" pattern. Engineers reach for it by default. The complexity also feels proportional to the feature's prominence in the nav bar.

**How to avoid:**
For v1, recommendations should be purely frequency-based SQL:

```sql
-- "You usually buy these" — items checked off most in last 90 days
SELECT item_name, category_id, COUNT(*) as frequency
FROM shopping_history
WHERE household_id = $1
  AND checked_at > NOW() - INTERVAL '90 days'
GROUP BY item_name, category_id
ORDER BY frequency DESC
LIMIT 20;
```

Co-purchase suggestions (items bought together): a simple JOIN on the same `shopping_session_id` grouping, counting co-occurrence pairs. This is a single SQL query, no ML pipeline needed.

Collaborative filtering across households requires: shared data consent model, household privacy considerations, minimum data volume to produce non-garbage results. None of these are designed for in the current requirements. The Norwegian market is also small — cross-household similarity data will be sparse for months.

**Build the simplest thing that could be useful, gate on engagement data before adding complexity.** If family members don't tap the recommendation section in the first two weeks, the entire feature is lower priority than assumed.

**Warning signs:**
- Planning a separate service or vector database for recommendations
- Spending more than one phase on the recommendation feature before shipping
- Designing a schema that requires cross-household data without a privacy model

**Phase to address:** Recommendation section phase — explicitly constrain scope to frequency SQL in the phase definition

---

### Pitfall 8: Kassal.app API Used Directly from the Client (Key Exposure + Rate Limits)

**What goes wrong:**
The Kassal.app API requires a Bearer token. If a barcode lookup call is made directly from the browser (client-side fetch), the API key is visible in browser DevTools network tab and JavaScript bundles. Additionally, the free hobby plan is capped at 60 requests/minute. A family of 4 scanning barcodes simultaneously while setting up their initial list could exhaust the rate limit in seconds, returning HTTP 429 errors with no user-visible explanation.

**Why it happens:**
The simplest implementation of barcode lookup is a direct client fetch. Supabase's client-side SDK makes this feel natural. The API key exposure risk is easy to overlook when iterating quickly.

**How to avoid:**
Route all barcode lookups through a **Supabase Edge Function**:

1. The Edge Function holds the Kassal.app API key in environment secrets (never exposed to the client)
2. The Edge Function can implement response caching: cache barcode-to-product mappings in the Supabase database's `product_cache` table. Norwegian EAN codes do not change — a barcode lookup result is valid indefinitely. After the first lookup, subsequent requests for the same EAN are served from DB, not the external API.
3. With caching, the 60 req/min limit only matters for first-time lookups of new EANs — in practice, a family's common products are scanned repeatedly and are cached after the first time.

For Open Food Facts (fallback): this API is open and rate-limit-tolerant, but should still route through the Edge Function for consistency.

**Warning signs:**
- API key appearing in browser Network tab
- HTTP 429 errors during barcode scanning sessions
- Product lookups failing for a household member while another is scanning

**Phase to address:** Barcode scanning phase — establish Edge Function proxy pattern before wiring up the scan UI

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct client-to-Kassal.app API calls | Faster to prototype | API key exposed; no caching; rate limit hits | Never — use Edge Function from day one |
| Sequential integer position column | Simpler initial schema | 8+ UPDATEs per reorder, Realtime event floods | Never for user-reorderable lists |
| Hard deletes on list items | Simpler schema, no `deleted_at` | Unrecoverable sync errors when deleting while offline | Only if offline is explicitly not supported |
| Skipping SECURITY DEFINER functions in RLS | Fewer abstractions | Infinite recursion the moment tables cross-reference each other | Never — write the function once, use everywhere |
| Using `BarcodeDetector` API without WASM fallback | Less code | Feature silently broken for all iOS users | Never — iOS is likely majority of family mobile users |
| Storing Realtime subscriptions outside React state management | Quick to wire up | Channel leak if component re-renders; hard to debug | Never — always manage channel lifecycle in effect cleanup |
| Fetching full list on every Realtime event | Simpler state logic | Unnecessary network round-trips, flickering UI | Only during early prototyping, remove before first user test |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Kassal.app API | Calling from browser with key in env var | Supabase Edge Function proxy with response caching in DB |
| Kassal.app API | Assuming 100% product coverage for Norwegian EANs | Always implement Open Food Facts as fallback; show graceful "product not found, enter manually" UI |
| Supabase Realtime Postgres Changes | Assuming DELETE events respect RLS filters | Never rely on DELETE events for access control; use Broadcast or app-level filtering |
| Supabase Realtime | Creating channels without cleanup | Always `removeChannel()` in useEffect return function |
| iOS camera (PWA) | Using `BarcodeDetector` Web API | Use WASM polyfill (barcode-detector npm package); trigger camera on explicit user gesture each session |
| IndexedDB offline queue | Flushing entire queue on reconnect without deduplication | Assign each queued operation a UUID; server-side idempotency keys prevent double-application |
| Open Food Facts | Assuming product names are in Norwegian | Product names are often in English or the origin country language; display as-is with manual override option |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS policy with uncached `auth.uid()` subquery | Every row-level read triggers multiple auth lookups; query times 10-20x higher than expected | Wrap in `(select auth.uid())` to cache per query; verified improvement from 179ms to 9ms | At >100 rows in any table with complex RLS |
| RLS policy with inline JOIN to `household_members` | Query times grow with household membership table size | Use `SECURITY DEFINER` function returning household ID set; reverse the join direction | At >10 households or complex policy chains |
| Subscribing to entire table via Postgres Changes without filter | All events for all households broadcast to all connected clients, then filtered client-side | Always pass `filter: 'household_id=eq.{id}'` in the subscription config | At >5 concurrent households using the app |
| Caching all product images for barcode lookups in Service Worker cache | Cache storage grows unboundedly; Safari evicts entire origin data at 7 days of inactivity | Set explicit cache size limit; use LRU eviction in service worker; only cache app shell, not product images | When cached images exceed ~50MB (Safari's effective soft limit for PWA storage) |
| Fetching full list on every Realtime event (re-fetch pattern) | Network waterfall on every item check-off; UI stutters during active shopping | Apply optimistic updates locally; use the Realtime payload directly to update state without re-fetch | At >2 concurrent users making rapid changes |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Kassal.app API key in client bundle | API key stolen, quota exhausted, potential billing if on Business plan | Store key only in Supabase Edge Function secrets; never in client env vars |
| Using `user_metadata` in RLS policies | Users can modify their own metadata via the Supabase client; a user could elevate their `role` claim | Only use `auth.uid()` and database-stored roles in RLS policies; verify household membership from DB, not JWT claims |
| Forgetting RLS on new tables | All authenticated users can read/write any row | Run a migration audit script: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` — verify every table has RLS enabled |
| Service role key in client code | Bypasses all RLS; complete data exposure | The service role key must never appear in client code or public env vars; only in server-side Edge Function secrets |
| Not rate-limiting the barcode lookup Edge Function | A malicious user could exhaust Kassal.app API quota or cause billing overrun | Add per-user rate limiting in the Edge Function (check call frequency by `auth.uid()` against a calls log table) |
| Household invite links with no expiry | Old invite links reused to join household without owner's knowledge | Expire invite tokens after 48 hours or single use; store in DB with `used_at` and `expires_at` columns |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-starting camera on page load | iOS PWA prompts for permission immediately; user hasn't indicated intent to scan; feels intrusive | Show explicit "Scan barcode" button; call `getUserMedia()` only on tap |
| Showing a loading spinner during Realtime sync | During shopping, items appear to "load" when another family member adds something; disorienting | Use optimistic updates; items appear instantly on the adding device; animate in on other devices without blocking UI |
| Sorting categories alphabetically as default | "Chips" appears before "Dairy" — useless in-store | Always use layout-order sort as default; only fall back to alphabetical when position data is missing |
| Losing scroll position when list updates | Family member checks off item → entire list re-renders → user's scroll position jumps to top | Apply fine-grained state updates (update only the changed item in local state); never replace the entire list array reference |
| Not distinguishing "checked" from "deleted" in list view | Checked items scroll to bottom or disappear — user loses context of what they already have in the cart | Keep checked items visible in a "In Cart" section below unchecked items; only fully remove on "Complete Shopping" action |
| Generic "Error" messages for barcode scan failures | User doesn't know if the product exists in Norwegian databases or if their camera failed | Show specific messages: "Barcode not found in Norwegian databases — add manually" vs. "Camera unavailable — check permissions" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Real-time sync:** Verify that channels are cleaned up — open browser DevTools, navigate between lists, run `supabase.getChannels().length` — it should stay constant, not grow
- [ ] **Barcode scanning:** Test on a real iPhone using the PWA installed to home screen — desktop testing will show false success since `BarcodeDetector` works in Chrome
- [ ] **Offline sync:** Test by: add items on device A (offline), add conflicting items on device B (offline), bring both online simultaneously — confirm no duplicate/missing items
- [ ] **RLS coverage:** Run `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` after each migration — result must be empty
- [ ] **Category ordering:** Drag a category to a new position, verify exactly one UPDATE event appears in Supabase Realtime logs (not N events for N categories)
- [ ] **Kassal.app key security:** Open browser DevTools Network tab during a barcode scan — confirm no requests go directly to `kassal.app`; all calls should be to your Supabase Edge Function
- [ ] **iOS camera re-permission:** Install PWA to iPhone home screen, grant camera permission, close app, reopen — verify the permission prompt behavior is handled gracefully
- [ ] **Store layout per-store override:** Confirm a store-specific layout change does not affect the default layout for other stores or other households

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Channel memory leak discovered in production | LOW | Deploy fix with proper `removeChannel()` cleanup; no data migration needed; instruct users to refresh |
| RLS infinite recursion | MEDIUM | Identify circular table dependency; wrap membership lookup in `SECURITY DEFINER` function; deploy migration; verify with integration test suite |
| Position column approach requiring rewrite | HIGH | Migrate to fractional indexing: add `position_key NUMERIC` column, back-fill with `row_number() * 1000`, remove old integer column; requires coordination with active users |
| API key exposed in client bundle | HIGH | Rotate Kassal.app API key immediately; move call to Edge Function; redeploy; audit access logs for unauthorized use |
| iOS camera never working for PWA users | MEDIUM | Implement WASM barcode library as drop-in replacement for `BarcodeDetector`; add explicit per-session camera prompt UI |
| Offline sync producing corrupt state | HIGH | Implement server-side idempotency for all mutation operations; add soft deletes; may require a "reset and re-sync" recovery flow for affected users |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Channel memory leak | Real-time sync implementation phase | `supabase.getChannels().length` stays stable under navigation; React StrictMode does not double channels |
| Postgres Changes DELETE + RLS | Real-time architecture decision (before building subscriptions) | Integration test: delete an item as user A, confirm user B (different household) does not receive the event |
| RLS recursion on household tables | Auth + data model phase | All RLS policies use `SECURITY DEFINER` functions for cross-table lookups; regression test with two tables that reference each other |
| iOS camera permissions reset | Barcode scanning phase | Manual test on real iPhone PWA installed to home screen; camera accessible without crashing or looping permission prompts |
| Integer position column | Store layout / category management phase | Single reorder operation produces exactly one DB UPDATE; verified in Supabase logs |
| Offline sync conflicts | Offline-first / sync queue phase | Two-device offline conflict test; checked-off items use OR semantics; soft deletes in place |
| Recommendation over-engineering | Recommendation section phase | Phase scope explicitly bounded to frequency SQL; no external ML service in tech plan |
| Kassal.app key exposure | Barcode scanning phase | Network tab shows zero direct requests to `kassal.app` from browser |
| RLS policy performance | Auth + data model phase (established early) | `EXPLAIN ANALYZE` on list queries confirms policy functions cached via `(select auth.uid())` wrapper |
| Safari storage eviction | Offline / service worker phase | Service Worker cache has explicit size cap; product images not cached; app shell only |

---

## Sources

- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) — verified connection limits, channel limits, payload truncation behavior
- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) — DELETE event RLS limitation, filter restrictions
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — auth.uid() caching, JOIN reversal pattern, security definer functions
- [Supabase Realtime GitHub Issues — Channel Cleanup](https://github.com/supabase/realtime-js/issues/281) — documented community issue confirming channels need explicit removal
- [Supabase RLS Infinite Recursion Discussion](https://github.com/orgs/supabase/discussions/1138) — community-confirmed pattern; security definer solution
- [STRICH Knowledge Base — iOS PWA Camera Issues](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa) — confirmed permission reset behavior in PWA standalone mode; `apple-mobile-web-app-capable` workaround
- [Barcode Scanning on iOS — WebAssembly Solution (DEV Community)](https://dev.to/ilhannegis/barcode-scanning-on-ios-the-missing-web-api-and-a-webassembly-solution-2in2) — ZBar WASM approach for EAN-13 on iOS Safari
- [barcode-detector-polyfill (GitHub)](https://github.com/undecaf/barcode-detector-polyfill) — ZBar WASM polyfill, supports EAN-13/EAN-8/UPC
- [Kassal.app API Documentation](https://kassal.app/api) — 60 req/min free tier limit confirmed; Bearer token authentication requirement
- [Offline Sync and Conflict Resolution Patterns (sachith.co.uk, Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) — last-write-wins limitations, CRDT alternatives
- [Implementing Re-Ordering at the Database Level (Basedash)](https://www.basedash.com/blog/implementing-re-ordering-at-the-database-level-our-experience) — fractional indexing pattern for position columns
- [WebKit Storage Policy Updates](https://webkit.org/blog/14403/updates-to-storage-policy/) — Safari PWA 7-day eviction behavior and storage quota behavior
- [MDN Storage Quotas and Eviction Criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — cross-browser storage limit reference

---
*Pitfalls research for: Family grocery shopping PWA (HandleAppen) — Supabase Realtime, household RLS, iOS barcode scanning, offline sync*
*Researched: 2026-03-08*