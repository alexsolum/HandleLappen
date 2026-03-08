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
