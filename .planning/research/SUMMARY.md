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
