# Project Research Summary

**Project:** HandleAppen v1.2
**Domain:** Family grocery shopping PWA (Norwegian market) — adding recipes, admin hub, item pictures, and dark mode to an existing SvelteKit + Supabase production app
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

HandleAppen v1.2 is an incremental feature release layered onto a production SvelteKit + Supabase PWA. The codebase already uses Svelte 5 runes, Tailwind v4, TanStack Query v6, Supabase Realtime, and `@vite-pwa/sveltekit`. Research confirms that **zero new npm packages are required** for any v1.2 feature: image handling uses the native `OffscreenCanvas` API (not `browser-image-compression`, which is unmaintained), dark mode uses `localStorage` plus Tailwind v4's `@custom-variant` directive (Tailwind v4 has no `tailwind.config.js` and no `darkMode: 'class'` key), routing uses SvelteKit's built-in nested layouts, and recipe data uses the same TanStack Query + Supabase pattern already established for shopping lists. The central structural change is replacing the current bottom nav with four dedicated tabs: Handleliste, Oppskrifter, Anbefalinger, Admin.

The recommended execution order is strictly dependency-driven. The database migration (new `recipes` and `recipe_ingredients` tables, two Supabase Storage buckets, and a `picture_path` column on `household_item_memory`) must land first because every subsequent task builds on that schema. The BottomNav restructure comes second because it gates all UX review of new routes. The Admin hub routing establishes the third gate, unlocking the items management, history relocation, and settings subpages. Recipe CRUD, dark mode, and image upload can then proceed once their prerequisites exist, with dark mode being the most independent and suitable for parallel execution.

The two highest-risk areas are image handling and navigation state. Image handling has three compounding pitfalls: incomplete Supabase Storage RLS (missing SELECT/UPDATE/DELETE policies are silently broken — uploads succeed but display fails), uncompressed mobile camera uploads exceeding the free-tier 6 MB standard upload limit, and service worker cache serving stale images after replacement (uploading to the same path does not invalidate the cache). Navigation carries risk around the bottom nav active-state detection breaking on deep routes and PWA back-navigation trapping users on removed top-level routes (`/husstand`, `/butikker`). Both risks have documented, specific mitigations that must be applied at the correct phase, not retrofitted.

---

## Key Findings

### Recommended Stack

The existing stack requires no additions for v1.2. Every capability needed is already installed or browser-native. The most important version constraint is Tailwind v4: it has no `tailwind.config.js` and no `darkMode: 'class'` config key. Dark mode class strategy is declared in CSS via `@custom-variant dark (&:where(.dark, .dark *));` in `app.css`. Any developer copying Tailwind v3 tutorials will produce a config file that has zero effect.

**Core technologies (all already installed):**
- `@sveltejs/kit ^2.50.2` — routing, nested layouts, SSR; handles admin hub structure natively with no additional package
- `svelte ^5.51.0` — Svelte 5 runes (`$state`, `$props`) required for `theme.svelte.ts` store pattern; already in use throughout the app
- `tailwindcss ^4.2.1` — Tailwind v4; dark mode via `@custom-variant` in `app.css`, not `tailwind.config.js`
- `@supabase/supabase-js ^2.98.0` — includes the full Storage client; `supabase.storage.from().upload()` and `createSignedUrl()` are available immediately with no extra install
- `@tanstack/svelte-query ^6.1.0` — recipe fetch/mutate pattern is identical to the existing shopping list pattern; reuse `createQuery` and `useMutation` with no API changes
- `@vite-pwa/sveltekit ^1.1.0` — existing service worker; must be updated to exclude Supabase Storage CDN URLs from caching to prevent stale image display after replacement
- `browser-native OffscreenCanvas` — replaces any image compression package; `convertToBlob({ type: 'image/webp', quality: 0.85 })` handles client-side resize before upload

**What NOT to add:**
- `browser-image-compression` npm — unmaintained (v2.0.2, last published 3 years ago, flagged as inactive); native Canvas API is the correct replacement and has zero package cost
- `svelte-dark-mode` — thin wrapper over 5 lines of vanilla JS; last meaningful commit 2022; adds a dependency for trivial logic
- Supabase Storage image transforms (`transform` in `getPublicUrl`) — requires Supabase Pro plan; silently serves the original unresized image on the free tier without any error

### Expected Features

**Must have (v1.2 P1 — gates everything else):**
- Bottom nav 4-tab restructure (Handleliste / Oppskrifter / Anbefalinger / Admin) — all other features depend on navigation existing; restructure includes prefix-based `isActive` logic and 301 redirects from removed top-level routes
- Admin hub (`/admin`) with subpage skeleton — gates items management, history relocation, and settings; establishes `householdId` from `locals` pattern for all sub-routes
- Recipe list + detail view with "Legg til i liste" — the primary new user-facing feature; individual ingredient selection (checkbox per ingredient) is expected because users have pantry items already
- Recipe ingredient to household item linkage — without this, added ingredients lose category/sort fidelity and appear as anonymous text strings, defeating the store-layout ordering
- Recipe cover image upload via Supabase Storage — visual-first recipe UX; text-only feels like a database, not an app
- Dark mode toggle in Brukerinnstillinger — low cost, universally expected since iOS 13/Android 10
- Items management subpage (rename, recategorize) — prerequisite for item picture feature; lives in Admin hub
- Butikker / Husstand / Historikk relocated as Admin subpages — part of nav restructure, not new functionality

**Should have (v1.2 P2 — adds value after P1 works):**
- Item picture attach and display as thumbnail in shopping list — differentiator (AnyList, Bring, Listonic all support this); items are usable without photos
- Dark mode cross-device sync via Supabase `user_preferences` table — nice-to-have after the `localStorage` version works

**Defer (v2+):**
- Push notifications for list changes — iOS PWA push support is unreliable pre-iOS 16.4; in-app indicators are the correct v1 approach
- Meal planning / calendar integration — separate product concern; out of scope
- Price tracking / budget features — requires sustained price data investment; validate demand first
- Recipe import from URL (web scraping) — fragile parsers, legal grey area, AnyList charges premium for this feature
- Recipe scaling (2x, 0.5x servings) — unit conversion adds significant UI and logic complexity
- Native iOS/Android app — only if PWA limitations become user-reported blockers at scale

### Architecture Approach

v1.2 extends the existing architecture without replacing any of it. Two new database tables (`recipes`, `recipe_ingredients`) and two new Storage buckets (`recipe-covers`, `item-pictures`) are added via migration. A `picture_path text` column is added to `household_item_memory`. Routes are extended with `/oppskrifter`, `/oppskrifter/[id]`, and an `/admin/**` subtree. Existing `/butikker` and `/husstand` routes stay at their current paths and are linked from the admin hub rather than moved — this avoids a refactor risk with no user-facing benefit (users never see the URL path). The BottomNav component is modified (not replaced). All other existing files are unchanged.

**Major components:**
1. `BottomNav.svelte` (MODIFIED) — tab array, icon union, prefix-based `isActive` logic for admin sub-routes (`/admin/*`) and lister sub-routes (`/lister/*`)
2. `src/lib/queries/recipes.ts` (NEW) — list/detail/create/update/delete queries for recipes; signed URL generation at query time (never stored in DB — signed URLs expire)
3. `src/lib/queries/item-memory-admin.ts` (NEW) — household item admin reads, intentionally separate from `remembered-items.ts` autocomplete query to avoid coupling
4. `src/lib/stores/theme.svelte.ts` (NEW) — `localStorage` read/write, `document.documentElement.classList` toggle; no Supabase involvement
5. `/oppskrifter/**` routes (NEW) — recipe list and detail pages; reuse existing `createAddOrIncrementItemMutation` for add-to-list; upsert with `ignoreDuplicates: true` prevents duplicate list items
6. `/admin/**` routes (NEW) — hub page (sectioned link list grouped by concern) + historikk, items, innstillinger subpages; thin `+layout.svelte` for shared back-nav chrome
7. DB migration (NEW) — `recipes`, `recipe_ingredients` tables with RLS, Storage buckets and four RLS policies each (INSERT/SELECT/UPDATE/DELETE), `household_item_memory.picture_path` column, unique constraint on `(list_id, item_id)` in `list_items`
8. `app.html` + `app.css` (MODIFIED) — inline blocking script in `<head>` for FOUC prevention, `@custom-variant dark (&:where(.dark, .dark *));` in `app.css`

**Key patterns:**
- Store only the Storage object path in the DB; generate signed URLs at query time — signed URLs expire, paths do not
- Use versioned filenames for image uploads (`{id}-{timestamp}.webp`) to guarantee cache-bust on replacement; never reuse the same path on upsert
- Read `householdId` from `locals` directly in admin sub-route load functions; never call `await parent()` at the top of a load function just to get household context — this serializes what SvelteKit would parallelize
- Recipe "add to list" must use upsert with `ignoreDuplicates: true` against a unique constraint on `(list_id, item_id)` to prevent duplicate rows

### Critical Pitfalls

1. **Dark mode FOUC + Tailwind v4 config mismatch** — Two fixes required together and in the same deployment: (a) add `@custom-variant dark (&:where(.dark, .dark *));` to `app.css` (Tailwind v4 has no `darkMode: 'class'` config key — developers copying v3 tutorials add a config file that has zero effect), and (b) add an inline blocking `<script>` in `app.html` `<head>` that reads `localStorage` and applies `.dark` before first paint. Fixing one without the other produces partial breakage that is hard to diagnose.

2. **Supabase Storage RLS incomplete — four policies required, not one** — The Supabase dashboard prompts for one policy operation at a time. Developers create an INSERT policy, uploads succeed, and they consider the job done. Images then fail to display (missing SELECT), replacing fails with 403 (missing UPDATE), and old files accumulate because delete is blocked (missing DELETE). Additionally, without household-path scoping (`(storage.foldername(name))[1] = my_household_id()::text`), any authenticated user can read or overwrite any household's images by guessing the path. Write all four policies with path scoping before writing any upload UI code.

3. **Uncompressed mobile camera images exceed the free-tier limit** — Modern phones produce 4–12 MB HEIC/JPEG. Supabase's standard upload API is designed for files up to 6 MB; the free tier has a 50 MB storage limit. Testing with small desktop PNG files does not surface this. Compress client-side with `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.85 })` (max 1200px) before calling `storage.upload()`. This is a correctness requirement, not an optimization — it must be in the first implementation, not added after.

4. **Service worker caches stale images after replacement** — Uploading a new image to the same Storage path does not invalidate the service worker or browser cache. The existing Workbox handler may match Supabase Storage CDN URLs. Use versioned filenames (append timestamp or UUID to path) so the URL changes on every update. Also configure the existing Workbox handler to explicitly exclude Supabase Storage CDN URLs from caching.

5. **Bottom nav active state breaks on sub-routes** — Exact pathname matching (`page.url.pathname === href`) leaves admin sub-routes (`/admin/items`) and list detail routes (`/lister/[id]`) with no highlighted tab — the app appears broken. Replace with prefix matching: Admin tab is active when `pathname.startsWith('/admin')`, Handleliste tab is active when `pathname === '/'` or `pathname.startsWith('/lister/')`. Must be implemented with the BottomNav restructure, not as a follow-up.

6. **PWA back-navigation trap after route restructure** — Existing PWA users have browser history entries pointing to `/husstand` and `/butikker`. After restructure, pressing the Android back button or accessing old bookmarks hits routes that no longer exist at those paths. Add 301 redirects from the old top-level routes to their new admin sub-route destinations before the restructure build ships.

7. **Recipe duplicate list items from "add all ingredients"** — A plain INSERT for each recipe ingredient creates duplicate rows when an item already exists on the target list. Two devices offline, a checked item appearing unchecked again, and duplicate rows in the same category section all result. Add a unique constraint on `(list_id, item_id)` in the migration that creates the recipe schema and use Supabase upsert with `ignoreDuplicates: true` in the add-to-list mutation.

8. **`await parent()` waterfall in admin sub-routes** — Calling `await parent()` at the top of every admin sub-route load function to get `householdId` serializes what SvelteKit would parallelize (protected layout load → admin layout load → page load, three sequential server round-trips). Read `householdId` from `locals` directly. If `await parent()` is genuinely needed for data that depends on parent output, call it after independent data fetches, not before.

---

## Implications for Roadmap

Based on the architecture dependency chain and pitfall-to-phase mapping from research, six phases are suggested. The ordering is strictly dependency-driven.

### Phase 1: Database Foundation
**Rationale:** Every subsequent phase depends on the schema. Recipe queries cannot be built without `recipes`/`recipe_ingredients` tables. Image upload cannot be built without Storage buckets and RLS. Item pictures require the `picture_path` column on `household_item_memory`. The unique constraint on `list_items(list_id, item_id)` must be added here, not as a follow-up migration. This phase has no UI but unlocks all subsequent work.
**Delivers:** Supabase migration with `recipes`, `recipe_ingredients` tables, RLS policies for both (household-scoped via `my_household_id()`), Storage buckets `recipe-covers` and `item-pictures` (private), four RLS policies per bucket with `storage.foldername(name)[1] = my_household_id()::text` path scoping, `household_item_memory.picture_path text` column, unique constraint on `list_items(list_id, item_id)`, TypeScript types regenerated via `supabase gen types typescript`.
**Addresses:** Recipe management (data layer), item picture management (storage layer), recipe duplicate prevention (unique constraint)
**Avoids:** Pitfalls 2 (Storage RLS incomplete), 7 (recipe duplicate items), storage path traversal (use `crypto.randomUUID()` for all image paths)

### Phase 2: Navigation Restructure (BottomNav + Route Scaffolding)
**Rationale:** All four new tabs gate UX review of every subsequent phase. Without working navigation, no new page can be reviewed in context. Route redirects from `/husstand` and `/butikker` must ship with this phase — implementing them as a follow-up after the restructure ships creates a window where PWA users are stranded.
**Delivers:** BottomNav updated to 4 tabs (Handleliste / Oppskrifter / Anbefalinger / Admin), prefix-based `isActive` logic, stub pages for `/oppskrifter` and `/admin`, 301 redirects from `/husstand` and `/butikker`, updated icon union in the `Tab` type.
**Addresses:** Bottom nav restructure, PWA back-navigation safety, admin tab active state on sub-routes
**Avoids:** Pitfalls 5 (active state breaks on deep links), 6 (PWA back-navigation trap)

### Phase 3: Admin Hub + Subpage Routing
**Rationale:** Admin hub page and subpage routes must exist before any admin content can be built. The thin `+layout.svelte` for shared back-nav chrome should be established here so all subpages inherit it. The `householdId` from `locals` data access pattern must be established here before building any individual subpages — it is the correct pattern and easier to get right once than to fix across five pages.
**Delivers:** `/admin` hub page (sectioned link list grouped by logical concern: Handlelister, Butikker, Husstand, Varer, Bruker), `admin/+layout.svelte` with back-nav chrome, skeleton subpages for `historikk`, `items`, `innstillinger`, history content migrated from `/anbefalinger` to `/admin/historikk`, data access pattern established (`householdId` from `locals`, not `await parent()`).
**Addresses:** Admin hub UX pattern, history relocation, correct data access pattern for sub-routes
**Avoids:** Pitfall 8 (`await parent()` waterfall — correct pattern established once, inherited by all subpages)

### Phase 4: Recipe CRUD + Add to List
**Rationale:** The primary v1.2 user-facing feature. Depends on Phase 1 (schema) and Phase 2 (navigation to `/oppskrifter`). Cover image upload is deferred to Phase 5 — recipes should work end-to-end without images first. Recipe ingredient to household item linkage is the most non-trivial piece and must be built before the add-to-list flow: without it, added ingredients lose their category and sort order position.
**Delivers:** Recipe list view (`/oppskrifter`), recipe detail view (`/oppskrifter/[id]`), create/edit/delete recipe, individual ingredient selection with checkboxes, "Legg til i liste" with list picker sheet (all three states: lists available / no lists with inline "Ny liste" prompt / loading skeleton), ingredient resolution to household item entities via normalized-name match with create-on-no-match fallback, upsert-safe add-to-list mutation, summary toast showing how many items were added vs already present.
**Addresses:** Recipe list + detail, "add all/individual to list", household-shared recipes, ingredient to item linkage
**Avoids:** Pitfall 7 (recipe duplicate items — upsert with `ignoreDuplicates: true`), Pitfall 9 (list picker empty state — all three states specced before implementation)

### Phase 5: Image Upload (Recipe Covers + Item Pictures)
**Rationale:** Depends on Phase 1 (Storage buckets and RLS), Phase 3 (admin items subpage route), Phase 4 (recipe detail page for cover upload). Image compression and versioned filenames must be in the first implementation — these are correctness requirements, not optimizations added later. The service worker exclusion for Storage CDN URLs must also land here.
**Delivers:** Recipe cover image upload on recipe edit page (OffscreenCanvas resize to max 1200px → WebP 0.85 quality → Supabase Storage, path stored as `recipes.cover_image_path`, signed URL generated at query time with 5-minute TTL), item picture upload in `/admin/items/[id]` (same pipeline), item picture thumbnail displayed in shopping list view, versioned filenames (`{uuid}-{timestamp}`), Workbox handler updated to exclude Supabase Storage CDN URLs from caching.
**Addresses:** Recipe cover image, item picture attach/display, Supabase Storage integration, service worker cache correctness
**Avoids:** Pitfalls 2 (all four RLS policies required), 3 (OffscreenCanvas compression required before upload), 4 (versioned paths + Storage CDN excluded from service worker)

### Phase 6: Dark Mode
**Rationale:** Depends only on Phase 3 (Brukerinnstillinger subpage exists). The most independent phase — can run in parallel with Phase 4 or 5 if developer bandwidth allows. The two fixes (Tailwind v4 `@custom-variant` and inline FOUC script) must land together in the same deployment; deploying them separately produces a partially broken dark mode that is difficult to diagnose.
**Delivers:** `@custom-variant dark (&:where(.dark, .dark *));` in `app.css`, inline blocking `<script>` in `app.html` `<head>` that reads `localStorage` and applies `.dark` before first paint, `theme.svelte.ts` store with `toggle()` and `init()`, dark mode toggle UI in `/admin/innstillinger`, `localStorage` persistence, system preference (`prefers-color-scheme`) respected on first load with no stored preference.
**Addresses:** Dark mode toggle, FOUC prevention, system preference fallback, preference persistence across sessions
**Avoids:** Pitfall 1 (both Tailwind config fix and inline FOUC script land in the same deployment)

### Phase Ordering Rationale

- Phase 1 must be first: schema is the foundation for all data work; unique constraint on `list_items` must exist before recipe add-to-list is built
- Phase 2 must be second: navigation gates all UX review; redirects must ship with the restructure build, not after
- Phase 3 must precede Phases 4 and 5: admin routes must exist before subpage content is built; `householdId` from `locals` pattern is established once and inherited
- Phase 4 precedes Phase 5: recipe detail page must exist before recipe cover image upload can be wired
- Phase 6 is independent of Phases 4 and 5 (depends only on Phase 3) and can run concurrently if parallel development is possible
- Items management within Phase 3/5 depends on Storage being ready (Phase 1) and the admin route existing (Phase 3)

### Research Flags

Phases likely needing deeper research during task planning:
- **Phase 4 (Recipe CRUD):** Recipe ingredient to household item matching logic needs careful spec. The matching must handle spelling variations ("Løk" vs "Kepaløk"), case differences, and the create-or-link decision. A normalized exact match is recommended for v1.2 with fuzzy matching deferred to v1.3 based on user feedback. The exact normalization approach (lowercase, trim, strip special characters) needs to be defined and consistent with the existing `normalized_name` column logic in `household_item_memory`.
- **Phase 5 (Image Upload):** `OffscreenCanvas` compatibility on iOS 15 (Safari 15) needs verification — `OffscreenCanvas` is fully supported in Safari 16.4+ but only partially in Safari 15. A `<canvas>` element fallback path may be needed. Verify before writing the compression utility.

Phases with standard patterns (skip research-phase):
- **Phase 1 (DB Migration):** SQL schema, RLS patterns, and Storage bucket configuration are fully documented in ARCHITECTURE.md and PITFALLS.md. Direct implementation.
- **Phase 2 (BottomNav):** Well-documented SvelteKit routing change. Exact code patterns provided in ARCHITECTURE.md.
- **Phase 3 (Admin Hub):** Standard SvelteKit nested layout plus hub-and-spoke navigation. Pattern is documented. No research needed.
- **Phase 6 (Dark Mode):** Exact implementation code documented in both STACK.md and PITFALLS.md. The two-fix pattern is clear and specific.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing `package.json` read directly; all dependencies confirmed present; no new packages required; Tailwind v4 `@custom-variant` approach verified against official docs; Supabase Storage client confirmed in `@supabase/supabase-js` |
| Features | HIGH (core) / MEDIUM (Norwegian-specific) | Recipe and admin feature expectations confirmed via OurGroceries, AnyList, Bring competitor analysis. Norwegian store layout ordering is MEDIUM — inferred from store descriptions, not direct survey; per-store override is the designed escape hatch |
| Architecture | HIGH | Existing source files read directly (`BottomNav.svelte`, `app.html`, `app.css`, `database.ts`, query files, layout files); SvelteKit routing patterns verified against official docs; Supabase Storage RLS verified against official access control docs; `await parent()` waterfall confirmed against SvelteKit docs and GitHub issue #8579 |
| Pitfalls | HIGH | Tailwind v4 config verified against official docs; Storage RLS four-policy requirement verified against official docs; service worker image caching conflict confirmed via Supabase community reports; `await parent()` waterfall confirmed against official docs and GitHub issues |

**Overall confidence:** HIGH

### Gaps to Address

- **`OffscreenCanvas` iOS 15 compatibility:** `OffscreenCanvas` is fully supported in Safari 16.4+ but only partially in Safari 15. If the app targets iOS 15 users, Phase 5 needs a `<canvas>` element fallback for the compression utility. Verify the installed PWA's minimum iOS target before implementing the image upload pipeline.
- **Supabase Storage bucket creation approach:** ARCHITECTURE.md provides the SQL for bucket creation (`insert into storage.buckets`) but the Supabase dashboard also supports bucket creation via UI. Confirm whether the project uses migration-based setup or dashboard setup for storage configuration before writing Phase 1 migration SQL.
- **`my_household_id()` vs `get_my_household_ids()` function name:** ARCHITECTURE.md uses `my_household_id()` in Storage RLS examples; PITFALLS.md uses `get_my_household_ids()`. Confirm the exact SECURITY DEFINER function name in the existing codebase before writing any Storage RLS policies — a name mismatch will cause all policies to fail silently (policies evaluate to false, not error).
- **Recipe ingredient normalized name matching:** The exact normalization approach (lowercase, trim, strip special characters, Norwegian character handling such as æøå) must be consistent with the existing `normalized_name` column logic in `household_item_memory`. Inspect the existing `upsert_household_item_memory` RPC to understand the current normalization before building the recipe ingredient matching logic.

---

## Sources

### Primary (HIGH confidence)
- Existing source files (direct read): `BottomNav.svelte`, `(protected)/+layout.svelte`, `+layout.server.ts`, `database.ts`, `items.ts`, `history.ts`, `remembered-items-core.ts`, `active-list.svelte.ts`, `app.html`, `vite.config.ts`, `app.css`
- [Tailwind CSS v4 Dark Mode — Official Docs](https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark`, class strategy, confirmation that `darkMode` config key does not exist in v4
- [Supabase Storage Access Control — Official Docs](https://supabase.com/docs/guides/storage/security/access-control) — four-policy requirement, `storage.foldername()` path scoping
- [Supabase Storage Upload Docs](https://supabase.com/docs/guides/storage/uploads/standard-uploads) — upload API, 6 MB standard upload recommendation, signed URL generation
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) — 50 MB free tier limit
- [SvelteKit Load Functions — `await parent()`](https://svelte.dev/docs/kit/load) — waterfall warning, parallel fetch pattern
- [SvelteKit Routing: Nested Layouts](https://svelte.dev/docs/kit/routing#layout)
- [SvelteKit Advanced Routing](https://svelte.dev/docs/kit/advanced-routing)
- [SvelteKit GitHub Issue #8579](https://github.com/sveltejs/kit/issues/8579) — `await parent()` waterfall confirmed

### Secondary (MEDIUM confidence)
- [CaptainCodeman — Dark Mode in SvelteKit](https://www.captaincodeman.com/implementing-dark-mode-in-sveltekit) — inline script FOUC prevention pattern
- [WeWeb Community — Supabase Storage cached images on replace](https://community.weweb.io/t/supabase-storage-preventing-cached-images-when-updating-files-replace-storage-file-issue/17601) — same-path upsert caching conflict documented
- OurGroceries User Guide, AnyList features, Bring features — recipe and admin interaction flow expectations
- [Kassal.app API documentation](https://kassal.app/api) — Norwegian product database, 100K product coverage, 60 req/min free tier
- Norwegian supermarket layout descriptions (Life in Norway, NLS Norway Relocation) — default category ordering inference

### Tertiary (LOW confidence)
- Norwegian store category flow ordering — inferred from general store descriptions; exact per-location order varies by store and chain. The default ordering in the app is a reasonable starting point; per-store overrides are the designed escape hatch for inaccuracies.

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
