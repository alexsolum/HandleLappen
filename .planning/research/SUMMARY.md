# Project Research Summary

**Project:** HandleAppen — v2.0 Barcode Scanner Improvement and Product Image/Brand Enrichment
**Domain:** Family grocery shopping PWA (Norwegian market) — SvelteKit + Supabase
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

HandleAppen is a production Norwegian-market family grocery PWA built on SvelteKit 2 / Svelte 5 / Supabase / TanStack Query. The v2.0 milestone has two tightly coupled goals: fix a confirmed iOS black screen bug in the barcode scanner, and enrich barcode lookup results with product images and brand names from Kassal.app. Both goals share the same code path — barcode-lookup edge function to client DTO to UI components — so they are correctly treated as a single milestone rather than independent tasks. The fix is surgical and the enrichment is additive. No new backend services are required, and only one npm package changes (`html5-qrcode` is replaced with `@undecaf/barcode-detector-polyfill` in the long-term scanner migration phase).

The iOS black screen is a structural problem with `html5-qrcode`: the library controls the `<video>` element lifecycle and sets `playsinline` after the camera stream has already attached — too late for iOS Safari in standalone PWA mode. The immediate fix is a `MutationObserver` that intercepts the video element the moment html5-qrcode inserts it and sets `playsinline`, `muted`, and `autoplay` before any frame is rendered. A secondary fix adds a single-tick delay before `startScanner` to let the modal dialog paint before the camera permission prompt fires. These two changes have no API surface impact and require no test changes, since the scanner is fully mocked in the test environment. The validated long-term direction — replacing `html5-qrcode` with a `BarcodeDetector`-polyfill-based implementation that owns the video element — is out of scope for this sprint but is fully researched and ready for a follow-on milestone.

Product image and brand enrichment requires coordinated changes at three layers: the Supabase schema (three migrations adding nullable columns), the edge function pipeline (carrying `imageUrl` and `brand` from Kassal.app through the DTO without routing them through Gemini), and the client (a new `ProductThumbnail` component, extended `BarcodeLookupSheet`, updated `ItemRow`). The critical risk is CDN URL instability: Kassal.app images are served from external CDN paths that rotate. The mitigations are a dedicated `image_url` column (not buried in jsonb), an `onerror` fallback in every image component, and URL prefix validation before storage. All migrations must use nullable columns — no `NOT NULL` constraints on live tables with existing data.

---

## Key Findings

### Recommended Stack

The existing stack requires only one package change across the entire v2.0 milestone, and even that change belongs to a later phase. The immediate iOS fix and the image enrichment work are both achievable with zero package additions.

**Core technologies (existing, validated):**
- `@sveltejs/kit ^2.50.2` + `svelte ^5.51.0` — Svelte 5 runes in active use; all new components follow the runes pattern (`$state`, `$props`, `$derived`)
- `@supabase/supabase-js ^2.98.0` + `@supabase/ssr ^0.9.0` — covers all v2.0 needs (schema migrations, edge function calls, Storage)
- `@tanstack/svelte-query ^6.1.0` — same fetch/mutate/invalidate pattern used for all new item and image mutations
- `tailwindcss ^4.2.1` — Tailwind v4; dark mode via `@custom-variant dark` in `app.css` (already implemented in v1.2)
- `idb-keyval ^6.2.2` + `@vite-pwa/sveltekit ^1.1.0` — offline PWA; unaffected by v2.0
- `html5-qrcode ^2.3.8` — kept for the MutationObserver fix phase; replaced by polyfill in the long-term scanner migration

**v2.0 package change (long-term scanner migration phase only):**
- Remove: `html5-qrcode` — iOS black screen unfixable without owning the video element; ZXing-js engine in maintenance mode
- Add: `@undecaf/barcode-detector-polyfill ^0.9.23` — ZBar compiled to WASM; EAN-13, EAN-8, UPC-A, UPC-E; app controls video element lifecycle; LGPL compliance requires loading the `.wasm` as a separate file, not inlining it

**What NOT to add for v2.0:**
- `@zxing/browser` / `@zxing/library` — JavaScript ZXing port, maintenance mode, same iOS attribute timing problem
- Native `BarcodeDetector` without polyfill — behind a flag in Safari settings; broken in iOS 18; effectively unavailable
- Any image loading library (`svelte-img`, `unpic`, `svelte-lazy-image`) — native `loading="lazy"` covers 96%+ of browsers including iOS Safari 15.4+; overkill for 40px thumbnails from a CDN

### Expected Features

The v2.0 feature scope is narrowly defined. This is not a new feature design exercise — it is a targeted improvement to two existing capabilities (scanner reliability and barcode data richness).

**Must have (gates the milestone):**
- iOS barcode scanner black screen fix — current scanner is unusable on installed iPhone PWA; blocks core app utility for iOS users
- Product image displayed in scan result sheet — users scanning a product need visual confirmation of what was found
- Brand name displayed in scan result sheet — brand is the primary identifier for many Norwegian grocery products
- Product image thumbnail in shopping list row (`ItemRow`) — photo must appear where items are consumed, not only where they are scanned
- `onerror` fallback on every product image — Kassal CDN URLs rotate; every `<img>` must degrade gracefully to a placeholder

**Should have (completes the data pipeline):**
- Image and brand written to `list_items` at insert time (Option C from architecture research) — avoids a complex fuzzy JOIN on the hot list read path; consistent with how `category_id` is already handled
- Image and brand written to `household_item_memory` — enriches item memory for future scans of the same EAN
- Admin items view renders `ProductThumbnail` per row — consistency with list view; lowest priority, does not affect shopping flow

**Defer (not v2.0):**
- Full replacement of `html5-qrcode` with `BarcodeDetector` API + polyfill — validated direction; requires rewriting the scan loop and updating tests; out of scope for this sprint
- Offline WASM caching (service worker caches the `.wasm` file) — the default CDN load works for online sessions; offline scanning can be a follow-up
- Proxying Kassal images through Supabase Storage for long-term URL stability — justified only if CDN instability becomes user-reported at scale; adds storage cost and upload latency

**Anti-features (do not build):**
- Price comparison across stores — data is stale quickly; Kassal.app and Mattilbud already do this better; scope creep
- Image URL routing through Gemini — Gemini is used only for name normalization and category resolution; sending image URLs adds token cost and latency for zero benefit
- Joining `household_item_memory` on normalized_name in the list query to pull images — fuzzy join key, performance penalty, breaks if item name is edited

### Architecture Approach

The v2.0 change set touches 14 existing files and adds 1 new component. Changes follow a strict layered dependency order: schema first, then edge function shared types, then edge function logic, then client types, then UI components. This order ensures DB columns exist before code writes to them and the edge function produces enriched DTOs before the client expects them.

**Major components and their v2.0 change summary:**
1. `supabase/functions/_shared/barcode.ts` (MODIFIED) — add `imageUrl: string | null` to `BarcodeLookupDto`, `ReducedProviderPayload`, `BarcodeCacheRow`; update `buildReducedProviderPayload`, `fallbackLookupFromProviderPayload`, `applyGeminiResult`, `cacheRowToLookupDto`
2. `supabase/functions/barcode-lookup/index.ts` (MODIFIED) — update `readCache` `.select()` string; update `createCacheRow` to write `image_url` and `brand`
3. `src/lib/barcode/scanner.ts` (MODIFIED) — add MutationObserver before `htmlScanner.start()`; remove or demote the post-hoc `playsinline` block
4. `src/lib/components/barcode/BarcodeScannerSheet.svelte` (MODIFIED) — add single-tick delay before `startScanner()` for iOS dialog timing
5. `src/lib/barcode/lookup.ts` (MODIFIED) — client DTO mirror; extend `BarcodeLookupDto`, `BarcodeSheetModel`, `mapBarcodeLookupResult`, `isBarcodeLookupDto`
6. `src/lib/components/items/ProductThumbnail.svelte` (NEW) — lazy `<img>` with `onerror` fallback; `sm` (32px) and `md` (56px) size variants
7. `src/lib/components/barcode/BarcodeLookupSheet.svelte` (MODIFIED) — render `ProductThumbnail` and brand; extend `onConfirm` payload to include `imageUrl` and `brand`
8. `src/lib/components/items/ItemRow.svelte` + `src/lib/queries/items.ts` (MODIFIED) — extend item type; render thumbnail; extend add mutations to write image/brand
9. Three Supabase migrations — nullable columns on `barcode_product_cache`, `household_item_memory`, and `list_items`

**Key architectural patterns applied:**
- Additive DTO extension with null defaults — backward-compatible; consumers that do not use new fields are unaffected
- Write-at-insert-time for list items — consistent with the existing `category_id` pattern; no JOIN required on the list read path
- Image bypasses Gemini — Gemini schema stays as-is; `imageUrl` and `brand` are copied directly from `ReducedProviderPayload` into the final DTO
- `NULL` means "no image" — never use `NOT NULL DEFAULT ''`; the `ProductThumbnail` component checks truthiness before rendering

### Critical Pitfalls

1. **iOS `playsinline` applied after stream attachment** — the existing `scanner.ts` sets `playsinline` in the `start()` promise callback, but iOS Safari has already rendered a black frame by then. Prevention: MutationObserver on the container element intercepts the video element synchronously before any frame is painted and sets `playsinline`, `muted`, and `autoplay`. Confirmed by WebKit bugs 185448, 252465, and html5-qrcode issues #890, #713.

2. **iOS PWA camera permission re-prompts every session** — WebKit bugs 215884 and 185448 remain open; every new `getUserMedia` call in a standalone PWA may re-prompt. Prevention: cache the `MediaStream` from the first successful call and reuse it within the session (check `stream.active` before re-requesting); distinguish `NotAllowedError` (user denied — show settings link) from a dismissed prompt (show "Prøv igjen" with no alarm UI).

3. **Kassal CDN image URLs are not stable** — Kassal uses Cloudinary version tokens that rotate, and CDN providers have changed in the past. URLs stored in `barcode_product_cache` (30-day TTL) can go dead before expiry. Prevention: store `image_url` in a dedicated nullable column (not inside jsonb `provider_payload`), validate URL prefix before storing (`res.cloudinary.com/norgesgruppen` or `bilder.ngdata.no`), implement `onerror` fallback in `ProductThumbnail`.

4. **Migration risks on live tables with trigger activity** — `household_item_memory` is trigger-driven (fires on every `list_items` write) and has live rows. Adding `NOT NULL` columns or running full-table backfills causes timeout or lock contention on Supabase Free tier. Prevention: all new columns must be nullable text with no default; no backfill in the migration transaction; test against a seeded DB with 1000+ rows before applying to production.

5. **DTO type mismatch between edge function and client** — `_shared/barcode.ts` (Deno) and `src/lib/barcode/lookup.ts` (browser) are physically separate files by design. A mismatch causes silent bugs. Prevention: update both files in the same commit; run integration tests covering the full scan-to-list-item flow end-to-end.

---

## Implications for Roadmap

Research reveals a clear dependency chain that maps to four phases. The ordering is strictly dependency-driven.

### Phase 1: Schema Migrations
**Rationale:** Database columns must exist before any code writes to or reads from them. This phase has no code risk — nullable columns with no defaults are safe on live tables with active triggers. Deploying schema first creates a clean deployment window for subsequent phases without risk of runtime errors.
**Delivers:** Three migrations — `barcode_product_cache` gains `image_url text` and `brand text`; `household_item_memory` gains `product_image_url text` and `brand text`; `list_items` gains `product_image_url text` and `brand text`. All columns nullable, no defaults, no backfill.
**Avoids:** Pitfall 4 (migration risk on live tables — all columns nullable; test against seeded DB first).
**Research flag:** Standard pattern — migration DDL fully specified in ARCHITECTURE.md. No additional research needed.

### Phase 2: iOS Scanner Black Screen Fix
**Rationale:** This fix has no dependency on schema changes or image features. It can ship as a hotfix before the enrichment phases. Getting iOS working first means that subsequent testing of image display features happens on a functioning scanner. The stream-caching improvement and permission UX distinction belong in this phase as well — they address the same root iOS camera reliability concern.
**Delivers:** `scanner.ts` MutationObserver fix before `htmlScanner.start()`; `BarcodeScannerSheet.svelte` single-tick delay before `startScanner()`; MediaStream caching within the PWA session; improved error UX distinguishing "camera denied" from "prompt dismissed".
**Avoids:** Pitfall 1 (playsinline timing), Pitfall 2 (permission re-prompt and error UX).
**Research flag:** Cannot verify on simulator — real iPhone in installed PWA mode (home screen) required. The fix code is fully specified in PITFALLS.md and ARCHITECTURE.md; verification is the unknown.

### Phase 3: Edge Function and DTO Enrichment
**Rationale:** The edge function must be updated and deployed before the client can receive `imageUrl` and `brand` in the lookup response. This phase is the prerequisite for all client-side image display work. Updating the shared types and edge function logic in a single deployment ensures both the Deno and browser DTO definitions stay in sync.
**Delivers:** `_shared/barcode.ts` extended with `imageUrl` in `BarcodeLookupDto`, `ReducedProviderPayload`, and `BarcodeCacheRow`; `barcode-lookup/index.ts` updated to read and write `image_url`/`brand`; `src/lib/barcode/lookup.ts` client types extended; `mapBarcodeLookupResult` and `isBarcodeLookupDto` updated. Image and brand bypass Gemini entirely.
**Uses:** Kassal API — `image` and `brand` fields are already typed in `KassalProduct` but discarded before the DTO is built; this phase wires them through.
**Avoids:** Pitfall 5 (DTO mismatch — both files updated in same commit); Anti-Pattern 1 (image URL not routed through Gemini).
**Research flag:** Standard pattern. Add Kassal URL prefix validation before storing (`res.cloudinary.com/norgesgruppen` or `bilder.ngdata.no`) as a low-cost security measure noted in PITFALLS.md security section.

### Phase 4: Client Image Display
**Rationale:** Depends on Phase 3 (edge function must return enriched DTO) and Phase 1 (DB columns must exist for mutations to write image data). This is the user-visible deliverable. All five user-facing changes belong together because they share the `ProductThumbnail` component and the extended `onConfirm` callback signature.
**Delivers:** `ProductThumbnail.svelte` (new component — lazy `<img>`, `onerror` fallback, `sm`/`md` size variants); `BarcodeLookupSheet.svelte` updated to show image and brand; `ItemRow.svelte` updated to show thumbnail; `queries/items.ts` mutations extended to write `product_image_url`/`brand`; `lister/[id]/+page.svelte` wired to pass image/brand from barcode confirm to add mutation; Admin items view updated to show thumbnails.
**Implements:** Lazy image with onerror fallback (Architecture Pattern 2); write-at-insert-time for list_items (Option C from ARCHITECTURE.md data flow analysis).
**Avoids:** Pitfall 3 (CDN instability — onerror fallback); layout shift (fixed dimensions on `ProductThumbnail`).
**Research flag:** Svelte 5 `onerror` event timing with SSR-rendered `<img>` is a known issue (sveltejs/svelte#10352). Verify whether the Svelte event binding works or whether the inline HTML `onerror` attribute is required for cross-origin images. This is a one-line difference but must be validated early in implementation.

### Phase Ordering Rationale

- Phase 1 must be first — schema is the foundation; columns must exist before edge function or client code writes to them
- Phase 2 is independent and high-urgency — iOS scanner fix can ship as a hotfix before or in parallel with Phases 3 and 4
- Phase 3 must precede Phase 4 — edge function must produce enriched DTO before client can consume it
- Phase 4 depends on both Phase 1 and Phase 3 — DB columns and edge function enrichment must both be in place
- Phases 2 and 3 can run in parallel if two developers are available

### Research Flags

Needs verification during implementation:
- **Phase 2:** iOS black screen fix must be verified on a real iPhone in installed PWA mode; simulator cannot reproduce the issue. This is the single validation gap — the fix code is fully specified.
- **Phase 4:** Svelte 5 `onerror` event timing with SSR hydration (sveltejs/svelte#10352) — verify early. If the Svelte event binding does not fire reliably for cross-origin images, use the inline HTML attribute instead.

Standard patterns (no additional research needed):
- **Phase 1:** Migration DDL fully specified in ARCHITECTURE.md; nullable-column-on-live-table pattern is standard.
- **Phase 3:** All DTO field names, pipeline functions, and data flow specified from direct codebase inspection; no unknowns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing packages validated against `package.json`; polyfill recommendation based on official repo and author article (Soledad Penades, Feb 2025); Kassal API fields confirmed from official docs |
| Features | HIGH | v2.0 feature scope derived entirely from existing codebase; no speculative features; Norwegian market features validated from v1.x research |
| Architecture | HIGH | All findings based on direct source file reads — `scanner.ts`, `_shared/barcode.ts`, `lookup.ts`, migration files, component files; no inference from documentation alone |
| Pitfalls | HIGH | iOS camera pitfalls confirmed against WebKit bug tracker (bugs 185448, 215884, 252465) and html5-qrcode issues (#713, #890); migration risks confirmed against Supabase official troubleshooting docs; Kassal CDN instability inferred from URL format and documented past CDN change |

**Overall confidence:** HIGH

### Gaps to Address

- **Kassal CDN URL rotation frequency in production:** Research confirms URLs can change (Cloudinary version tokens, documented past CDN provider change). The mitigation is designed. The actual frequency in practice is unknown — monitor after launch and consider a background refresh edge function if users report broken images at scale.
- **Kassal 429 rate limiting under concurrent family scanning:** The edge function test suite does not cover HTTP 429 from Kassal. Add a test case mocking a 429 response. The fix (return cache data or degrade gracefully) is straightforward but currently untested.
- **`household_item_memory` image freshness policy:** The migration adds the column, but the product decision — whether to write the Kassal image URL to item memory and accept it may go stale, or to omit it and re-fetch on each scan — should be confirmed during Phase 4 implementation. The conservative choice is to write and accept staleness; the aggressive choice avoids stale data at the cost of a cache miss on repeated scans of the same EAN.
- **Offline WASM caching:** If offline PWA scanning becomes a requirement, the `@undecaf/barcode-detector-polyfill` WASM file must be copied to `/static/` and cached by the service worker. The implementation approach is fully documented in STACK.md (`setModuleArgs`, Vite copy step) but is out of scope for the current milestone.

---

## Sources

### Primary (HIGH confidence)
- Direct source file reads — `src/lib/barcode/scanner.ts`, `BarcodeScannerSheet.svelte`, `BarcodeLookupSheet.svelte`, `ItemRow.svelte`, `ItemInput.svelte`, `src/lib/barcode/lookup.ts`, `src/lib/queries/barcode.ts`, `src/lib/queries/items.ts`, `src/lib/queries/item-memory-admin.ts`, `supabase/functions/_shared/barcode.ts`, `supabase/functions/barcode-lookup/index.ts`, existing Supabase migration files
- Kassal.app official API docs (`kassal.app/api/docs`) — `image`, `brand`, `vendor` field names, 60 req/min rate limit
- GitHub `undecaf/barcode-detector-polyfill` — v0.9.23, July 2025, EAN-13/8/UPC-A/E confirmed
- Can I Use — `loading="lazy"` iOS Safari 15.4+ support, ~96% global coverage
- Supabase Storage standard uploads docs — upload API, upsert guidance, image transformation Pro plan requirement
- Supabase Troubleshooting — Slow ALTER TABLE on Large Tables (official docs)

### Secondary (MEDIUM confidence)
- GitHub `mebjas/html5-qrcode` issues #890, #822, #895, #951 — iOS black screen confirmed, unresolved
- WebKit Bug 185448 — getUserMedia not working in apps added to home screen (open)
- WebKit Bug 215884 — getUserMedia recurring permissions prompts in standalone mode (open)
- WebKit Bug 252465 — HTML Video Element may be unable to play stream from getUserMedia in PWA (open)
- STRICH Knowledge Base — Camera Access Issues in iOS PWA/Home Screen Apps
- Soledad Penades, "On barcodes and Web APIs" (Feb 2025) — Safari BarcodeDetector behind a flag, considered unavailable
- Svelte Issue #10352 — Svelte 5 onerror event not called on img element

### Tertiary (LOW confidence)
- Kassal CDN past provider change (`bilder.kassal.app` → `bilder.ngdata.no`) — inferred from current URL format; no official Kassal changelog
- Kassal Cloudinary version token rotation frequency — inferred from URL format; no official stability guarantee documented

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
