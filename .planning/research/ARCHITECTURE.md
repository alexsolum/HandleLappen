# Architecture Research

**Domain:** Family grocery PWA — barcode scanner improvement and product image/brand enrichment (v2.0)
**Researched:** 2026-03-14
**Confidence:** HIGH (all findings based on direct codebase inspection)

---

## v2.0 Change Overview

This document extends the v1.2 architecture research with integration-focused analysis for the four v2.0 focus areas:

1. Schema changes: add `product_image_url` and `brand` to item storage tables
2. Edge function response changes: return `imageUrl` and `brand` from Kassal.app
3. Image display component: lazy loading, fallback, reusable across views
4. iOS camera / scanner reliability fixes

All findings are based on direct reading of the existing source files. Confidence is HIGH throughout.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SvelteKit PWA (Client)                        │
├──────────────────────────┬──────────────────────────────────────────┤
│  Scanner Layer           │  UI Layer                                 │
│  ┌────────────────────┐  │  ┌──────────────┐  ┌──────────────────┐  │
│  │  scanner.ts        │  │  │BarcodeScan-  │  │BarcodeLookup-    │  │
│  │  (html5-qrcode)    │  │  │nerSheet      │  │Sheet.svelte      │  │
│  │  [MODIFIED]        │  │  │[MODIFIED]    │  │[MODIFIED]        │  │
│  └────────────────────┘  │  └──────────────┘  └──────────────────┘  │
│                          │  ┌──────────────┐  ┌──────────────────┐  │
│  Barcode Data Layer      │  │ ItemRow      │  │ProductThumbnail  │  │
│  ┌────────────────────┐  │  │.svelte       │  │.svelte [NEW]     │  │
│  │  lookup.ts         │  │  │[MODIFIED]    │  │                  │  │
│  │  [MODIFIED]        │  │  └──────────────┘  └──────────────────┘  │
│  └────────────────────┘  │                                           │
├──────────────────────────┴──────────────────────────────────────────┤
│                     TanStack Query v5 (Data Layer)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ barcode.ts   │  │ items.ts     │  │ item-memory- │               │
│  │ [NO CHANGE]  │  │ [MODIFIED]   │  │ admin.ts     │               │
│  └──────────────┘  └──────────────┘  │ [MODIFIED]   │               │
│                                      └──────────────┘               │
├─────────────────────────────────────────────────────────────────────┤
│                     Supabase (Backend)                                │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  barcode-lookup      │  │  Database Tables                      │  │
│  │  (Edge Function)     │  │  barcode_product_cache [MIGRATION]   │  │
│  │  [MODIFIED]          │  │  household_item_memory [MIGRATION]   │  │
│  │  _shared/barcode.ts  │  │  list_items [OPTIONAL MIGRATION]     │  │
│  │  [MODIFIED]          │  └──────────────────────────────────────┘  │
│  └──────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Schema Changes: product_image_url and brand

### Current State

`barcode_product_cache` has columns: `ean`, `normalized_name`, `canonical_category`, `confidence`, `source`, `status`, `provider_payload`, `provider_fetched_at`, `ai_enriched_at`, `expires_at`, `created_at`, `updated_at`. No image or brand columns.

`household_item_memory` has columns: `id`, `household_id`, `normalized_name`, `display_name`, `last_category_id`, `use_count`, `last_used_at`, `created_at`, `updated_at`. No image or brand columns.

`list_items` has columns: `id`, `list_id`, `name`, `quantity`, `is_checked`, `checked_at`, `sort_order`, `category_id`, `created_at`. No image or brand columns.

The `KassalProduct` type in `_shared/barcode.ts` already declares `image?: string | null` and `brand?: string | null`. These fields are parsed by `buildReducedProviderPayload` (brand is captured in `ReducedProviderPayload.brand`; `image` is present in the Kassal response but currently discarded before the DTO is built).

### Required Migrations

**Migration 1 — `barcode_product_cache`:**
```sql
alter table public.barcode_product_cache
  add column image_url text,
  add column brand text;
```
These columns are nullable with no default. No backfill is needed. The existing 30-day cache TTL applies; entries written before this migration simply have NULL for both columns, which the client handles by showing the placeholder.

**Migration 2 — `household_item_memory`:**
```sql
alter table public.household_item_memory
  add column product_image_url text,
  add column brand text;
```
Same rationale: nullable, no backfill. The `upsert_household_item_memory` stored procedure must be updated to accept and write these columns when provided.

**Migration 3 (recommended) — `list_items`:**
```sql
alter table public.list_items
  add column product_image_url text,
  add column brand text;
```
This is the recommended approach for showing product thumbnails in the active shopping list without a secondary lookup. See Data Flow section for the alternative options and why this is preferred. Existing rows get NULL; `ItemRow.svelte` shows the placeholder in that case.

### Migration Order

Run Migration 1 first (cache table). Deploy the updated edge function. Run Migration 2 (item memory). Run Migration 3 (list_items) if taking the list_items approach. Deploy the client changes last. This order means the edge function writes new fields to the cache before the client starts reading them, eliminating a window where the client would expect a field that does not exist yet.

---

## 2. Edge Function Response Changes

### Current State

`_shared/barcode.ts` defines `BarcodeLookupDto` with: `ean`, `found`, `itemName`, `canonicalCategory`, `confidence`, `source`. The `KassalProduct.image` field is extracted by `extractKassalProduct` in `index.ts` but is not forwarded into `ReducedProviderPayload`. The `brand` field IS captured in `ReducedProviderPayload.brand` but is not carried through to `BarcodeLookupDto`.

`buildReducedProviderPayload` correctly captures `kassalBrand` and sets `payload.brand`. However, `fallbackLookupFromProviderPayload` and `applyGeminiResult` both return `BarcodeLookupDto` objects that drop `brand` and never had an `imageUrl` field.

`cacheRowToLookupDto` reads from `BarcodeCacheRow` which also lacks `image_url` and `brand` columns in the current schema.

### What Must Change

**`_shared/barcode.ts`:**

1. Add `imageUrl: string | null` and `brand: string | null` to `BarcodeLookupDto`.
2. Add `image_url: string | null` and `brand: string | null` to `BarcodeCacheRow`.
3. Add `imageUrl: string | null` to `ReducedProviderPayload` (carry it alongside `brand`).
4. Update `buildReducedProviderPayload` to extract `KassalProduct.image` into `payload.imageUrl`. Open Food Facts does not provide a usable product image URL in the v2 API response, so `imageUrl` only comes from Kassal.
5. Update `fallbackLookupFromProviderPayload` to include `imageUrl` and `brand` in its return.
6. Update `applyGeminiResult` to copy `imageUrl` and `brand` from the `ReducedProviderPayload` into the returned DTO. Gemini does not and should not touch these fields — Gemini only normalizes `itemName` and `canonicalCategory`.
7. Update `cacheRowToLookupDto` to read and forward `image_url` → `imageUrl` and `brand`.

**`barcode-lookup/index.ts`:**

1. Update `readCache`: add `image_url, brand` to the `.select()` string so newly-cached entries carry these columns.
2. Update `createCacheRow`: populate `image_url` from `dto.imageUrl` and `brand` from `dto.brand`.
3. Confirm `extractKassalProduct` already returns the `image` field — it does, because `KassalProduct` already types it and the function returns the full product object.

**No change to the Gemini call or schema:** Gemini's response schema only asks for `itemName`, `canonicalCategory`, `confidence`, and the optional `found` boolean. Image and brand bypass Gemini entirely, which is correct.

---

## 3. Client-Side DTO and Component Changes

### `src/lib/barcode/lookup.ts`

This file duplicates the DTO type from `_shared/barcode.ts` by design (edge function runs Deno; client runs in the browser). Both copies must stay in sync manually.

1. Add `imageUrl: string | null` and `brand: string | null` to `BarcodeLookupDto`.
2. Add `imageUrl: string | null` and `brand: string | null` to `BarcodeSheetModel`.
3. Update `mapBarcodeLookupResult` to pass `imageUrl` and `brand` through from the DTO to the model.
4. Update `isBarcodeLookupDto` to accept `imageUrl` and `brand` as valid optional fields. The current guard checks for exact field presence; the new fields must be allowed as `string | null` or absent without causing the guard to reject the response.

### `ProductThumbnail.svelte` (NEW)

A new single-purpose component. Accepts `src: string | null | undefined`, `alt: string`, and an optional `size` prop. Renders a lazy-loaded `<img>` when `src` is present. On `onerror`, renders a fallback grocery-bag SVG placeholder. No external library needed.

Size variants:
- `sm` — 32×32px, used in `ItemRow` (shopping list) and Admin Items rows
- `md` — 56×56px, used in `BarcodeLookupSheet` confirmation header

The component is placed in `src/lib/components/items/` because it is consumed by `ItemRow` and the admin items page. It could alternatively go in `src/lib/components/ui/` if more views adopt it.

### `BarcodeLookupSheet.svelte`

The confirm sheet currently shows only EAN, item name, quantity, and category. It must be updated to:

1. Accept `imageUrl` and `brand` from the `BarcodeSheetModel` via its `result` prop.
2. Render `ProductThumbnail` (`size='md'`) in the found/not_found state section.
3. Show `brand` as a secondary line below the item name input, read-only, visible when non-null.
4. Extend the `onConfirm` payload type from `{ name, quantity, categoryId }` to `{ name, quantity, categoryId, imageUrl, brand }`. The parent page needs these to pass them to the add mutation.

### `ItemRow.svelte`

The current `item` prop shape is `{ id, name, quantity, is_checked }`. If Migration 3 (list_items) is adopted:

1. Extend the `item` prop type to include `product_image_url: string | null` and `brand: string | null`.
2. Render `ProductThumbnail` (`size='sm'`) to the left of the item name, between the checkbox indicator and the name span.
3. The existing layout is `flex items-center gap-3`. The thumbnail fits naturally as the second element in the flex row.

### `queries/items.ts`

If Migration 3 is adopted:

1. Add `product_image_url: string | null` and `brand: string | null` to the `Item` type.
2. Add `imageUrl?: string | null` and `brand?: string | null` to `AddItemVariables` and `AddOrIncrementItemVariables`.
3. Update `createAddItemMutation` insert to write `product_image_url` and `brand` when provided.
4. Update `createAddOrIncrementItemMutation` insert to write `product_image_url` and `brand` when provided. The `update` path (quantity increment) does not need to write image/brand — the existing row already has them.
5. Update the `.select()` strings in `createItemsQuery` to include `product_image_url, brand`.

### `queries/item-memory-admin.ts`

1. Add `product_image_url` and `brand` to the `.select()` string.
2. Extend `ItemMemoryEntry` type to include these fields.
3. Update `createUpdateItemMemoryMutation` to optionally accept and write `product_image_url` and `brand` if the admin edit UI gains the ability to clear or update them.

---

## 4. iOS Camera / Scanner Reliability Fixes

### Root Cause

The current `startScanner` in `scanner.ts` applies `playsinline` on the `<video>` element after `htmlScanner.start()` resolves (lines 248–251). On iOS Safari in standalone PWA mode, this is too late. iOS requires `playsinline` to be set on the `<video>` element before the browser attaches the camera stream. When the attribute is missing at stream attachment time, iOS renders a black video surface or silently fails to render frames.

This is confirmed by the existing code, which already contains a post-hoc fix attempt — its placement after the await is the problem.

### Fix: MutationObserver Before `htmlScanner.start()`

Attach a `MutationObserver` to the scanner container element immediately before calling `htmlScanner.start()`. The observer fires as soon as html5-qrcode inserts the `<video>` element into the DOM, setting `playsinline` and `muted` before any frame is requested. After the first match, disconnect the observer.

The existing post-hoc setAttribute block (lines 248–251) can then be removed or kept as a belt-and-suspenders fallback.

This approach:
- Does not change the `startScanner` API or its return type
- Does not require test changes (existing tests mock the scanner entirely)
- Is the smallest change that addresses the iOS timing issue
- Does not depend on a new library

### Secondary Fix: Dialog Open Timing in `BarcodeScannerSheet.svelte`

The current `$effect` in `BarcodeScannerSheet.svelte` calls `bootScanner()` whenever `open` becomes true. `bootScanner` calls `teardownScanner` first (which is correct), then calls `startScanner`. On iOS, the `showModal()` call and the camera start happen in the same microtask queue flush, which can cause the browser to deny the `getUserMedia` request because the dialog's paint has not completed.

Recommendation: add a `requestAnimationFrame` or single-tick `setTimeout(0)` inside `bootScanner` before calling `startScanner`, ensuring the dialog is fully rendered before the camera permission prompt fires. This does not affect the scanner's functional behavior but gives iOS time to render the dialog surface.

### Long-Term Direction: BarcodeDetector API

The `BarcodeDetector` Web API (available in Safari 17.0+, Chrome 83+) eliminates html5-qrcode's control over the `<video>` element lifecycle entirely. When using `BarcodeDetector` directly with `getUserMedia`, the developer controls when and how `<video>` is created, allowing `playsinline` to be set declaratively in the Svelte template before stream attachment.

This is the correct long-term architecture. It also removes the `html5-qrcode` npm dependency. However, it requires:
1. A polyfill path for Safari versions below 17 (Edge and some older iOS Safari)
2. Rewriting the scan loop (requestAnimationFrame + BarcodeDetector.detect())
3. Updating tests that currently mock `html5-qrcode`

This migration is out of scope for the current milestone sprint but should be planned as a follow-on.

---

## Data Flow

### Scan-to-List Flow (v2.0)

```
User taps barcode button in ItemInput
    ↓
BarcodeScannerSheet opens (showModal)
    ↓ [iOS fix: setTimeout before startScanner, MutationObserver for playsinline]
startScanner() — camera boots
    ↓
EAN detected → stopScanner() → onDetected(ean)
    ↓
BarcodeScannerSheet closes → parent: barcodeLookupMutation.mutate({ ean })
    ↓
supabase.functions.invoke('barcode-lookup', { body: { ean } })
    ↓
Edge function: readCache(ean)
  CACHE HIT → return DTO (now includes imageUrl + brand)
  CACHE MISS →
    fetchKassalProduct(ean) → extract name, brand, image from response
    buildReducedProviderPayload() → carries imageUrl alongside brand
    [if Kassal not usable] fetchOpenFoodFactsProduct() → brand only, no image
    enrichWithGemini() → returns itemName + canonicalCategory (brand/image bypass Gemini)
    applyGeminiResult() → copies imageUrl, brand from payload into DTO
    writeCache() → writes image_url, brand to barcode_product_cache
    return DTO: { ean, found, itemName, canonicalCategory, confidence, source, imageUrl, brand }
    ↓
Client: isBarcodeLookupDto(data) → passes (guard allows optional fields)
mapBarcodeLookupResult(dto, categories) → BarcodeSheetModel with imageUrl, brand
    ↓
BarcodeLookupSheet renders:
  ProductThumbnail (src=imageUrl, size='md')
  brand shown as read-only subtitle
  editable: name, quantity, category
    ↓
User confirms → onConfirm({ name, quantity, categoryId, imageUrl, brand })
    ↓
createAddItemMutation or createAddOrIncrementItemMutation
  → list_items insert: { list_id, name, quantity, category_id, product_image_url, brand }
  → household_item_memory trigger fires (upsert_household_item_memory)
    [trigger or explicit call also writes product_image_url, brand to item memory]
    ↓
ItemRow re-renders with product_image_url → ProductThumbnail shows thumbnail
```

### Image Display in List Views — Option Analysis

Three options exist for surfacing image URLs in the shopping list `ItemRow`:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | JOIN list_items with household_item_memory in query | No schema change to list_items | Complex JOIN; item memory keyed by normalized_name, not FK; JOIN is fuzzy |
| B | Separate query to household_item_memory keyed by item names | No schema change | Extra query per list page load; N+1 risk |
| C | Add product_image_url + brand to list_items at insert time | Simple; no JOIN; data self-contained in row | Slight schema growth; update path (increment) does not re-write image |

**Recommendation: Option C.** Write `product_image_url` and `brand` to `list_items` at the time of insert. This is consistent with the existing pattern (category_id is also written at insert time, not derived from a JOIN). Existing rows with NULL will show the placeholder. If an item is added manually (not via barcode), both fields remain NULL — correct behavior.

---

## Component Boundaries: New vs Modified

| Artifact | Status | What Changes |
|----------|--------|-------------|
| `supabase/functions/_shared/barcode.ts` | MODIFIED | Add `imageUrl` to `BarcodeLookupDto`; add `image_url`/`brand` to `BarcodeCacheRow`; add `imageUrl` to `ReducedProviderPayload`; update `buildReducedProviderPayload`, `fallbackLookupFromProviderPayload`, `applyGeminiResult`, `cacheRowToLookupDto` |
| `supabase/functions/barcode-lookup/index.ts` | MODIFIED | Update `readCache` `.select()` string; update `createCacheRow` to write `image_url` and `brand` |
| `src/lib/barcode/lookup.ts` | MODIFIED | Add `imageUrl`/`brand` to `BarcodeLookupDto` and `BarcodeSheetModel`; update `mapBarcodeLookupResult`; update `isBarcodeLookupDto` guard |
| `src/lib/barcode/scanner.ts` | MODIFIED | Add MutationObserver before `htmlScanner.start()`; remove or demote post-hoc `playsinline` block |
| `src/lib/components/barcode/BarcodeScannerSheet.svelte` | MODIFIED | Add delay before `startScanner()` call for iOS dialog timing |
| `src/lib/components/barcode/BarcodeLookupSheet.svelte` | MODIFIED | Accept and display `imageUrl`/`brand` from result; extend `onConfirm` payload |
| `src/lib/components/items/ProductThumbnail.svelte` | NEW | Lazy image with onerror fallback; two size variants |
| `src/lib/components/items/ItemRow.svelte` | MODIFIED | Add optional thumbnail slot; extend item prop type |
| `src/lib/queries/items.ts` | MODIFIED | Extend `Item` type and mutations to include `product_image_url`/`brand` |
| `src/lib/queries/item-memory-admin.ts` | MODIFIED | Add `product_image_url`/`brand` to select and type |
| `src/routes/(protected)/admin/items/+page.svelte` | MODIFIED | Render `ProductThumbnail` per item row |
| `src/routes/(protected)/lister/[id]/+page.svelte` | MODIFIED | Pass `imageUrl`/`brand` from barcode confirm to add mutation |
| `barcode_product_cache` table | MIGRATION | Add `image_url text`, `brand text` (nullable) |
| `household_item_memory` table | MIGRATION | Add `product_image_url text`, `brand text` (nullable) |
| `list_items` table (recommended) | MIGRATION | Add `product_image_url text`, `brand text` (nullable) |
| `queries/barcode.ts` | NO CHANGE | Mutation wrapper unchanged; type changes flow through from lookup.ts |
| `ManualEanEntrySheet.svelte` | NO CHANGE | Manual EAN path does not produce image/brand |
| `ItemInput.svelte` | NO CHANGE | Orchestrates flow but does not own barcode data |

---

## Build Order (Dependency-Based)

```
Step 1: DB migrations
  - barcode_product_cache: add image_url, brand
  - household_item_memory: add product_image_url, brand
  - list_items: add product_image_url, brand (if Option C)
  Output: schema ready for all subsequent writes
  Why first: edge function and client code will start writing these
             fields; columns must exist before the code deploys

Step 2: _shared/barcode.ts — types and pure functions
  - Add imageUrl to BarcodeLookupDto, ReducedProviderPayload, BarcodeCacheRow
  - Update buildReducedProviderPayload, fallbackLookupFromProviderPayload,
    applyGeminiResult, cacheRowToLookupDto
  Output: shared types ready for both edge function and (separately) client
  Why second: both edge function and client depend on these definitions

Step 3: barcode-lookup/index.ts — edge function update
  - Update readCache select string
  - Update createCacheRow to write image_url, brand
  Output: deploy updated edge function; cache entries now include image/brand
  Depends on: Steps 1 and 2

Step 4: src/lib/barcode/lookup.ts — client DTO types
  - Extend BarcodeLookupDto, BarcodeSheetModel, mapBarcodeLookupResult,
    isBarcodeLookupDto
  Output: client ready to consume imageUrl and brand from edge function
  Depends on: nothing (parallel with Step 3 in practice)

Step 5: ProductThumbnail.svelte — new shared component
  - Lazy image, onerror fallback, size variants
  Output: reusable component ready to embed in other components
  No dependencies; can be built at any point

Step 6: BarcodeLookupSheet.svelte — show image and brand in confirm sheet
  - Accept imageUrl, brand from BarcodeSheetModel
  - Render ProductThumbnail
  - Extend onConfirm payload
  Depends on: Steps 4, 5

Step 7: scanner.ts — iOS playsinline fix
  - MutationObserver before htmlScanner.start()
  Output: iOS camera no longer shows black screen
  No dependency on Steps 1-6; can be done in parallel

Step 8: BarcodeScannerSheet.svelte — iOS dialog timing fix
  - Add delay before startScanner()
  Depends on: Step 7 (confirm scanner.ts approach first)

Step 9: queries/items.ts — extend Item type and mutations
  - Add product_image_url, brand to Item type
  - Pass image/brand through add mutations
  Depends on: Step 1 (columns must exist), Step 6 (onConfirm payload extended)

Step 10: lister/[id]/+page.svelte — wire image/brand to add mutation
  - Read imageUrl, brand from barcode confirm callback
  - Pass to add mutation
  Depends on: Steps 6, 9

Step 11: ItemRow.svelte — show thumbnail in list
  - Add ProductThumbnail to row layout
  - Extend item prop type
  Depends on: Steps 5, 9

Step 12: item-memory-admin.ts + admin/items page — thumbnails in admin
  - Extend query to include product_image_url, brand
  - Render ProductThumbnail in admin items list
  Depends on: Steps 1, 5
  Lowest priority — does not affect the core shopping flow
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Current State | Change for v2.0 |
|---------|---------------------|---------------|-----------------|
| Kassal.app | REST fetch in edge function, bearer token | Working; `KassalProduct.image` already typed but discarded | Extract `product.image` in `buildReducedProviderPayload` and carry it through the pipeline |
| Open Food Facts | REST fetch fallback | Working | No change to image — OFF v2 API does not return a stable image URL in the existing response path |
| Gemini | REST enrichment for name + category only | Working | No change — Gemini response schema stays as-is; image and brand bypass Gemini |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Edge function ↔ `barcode_product_cache` | Supabase admin client (service role, RLS bypassed) | New columns must be in the `.select()` string in `readCache` and in the `upsert` payload in `writeCache` |
| Edge function ↔ Client DTO | JSON response body | `BarcodeLookupDto` is defined in two places by design (Deno vs browser). Both must be updated in sync. |
| `BarcodeLookupSheet` ↔ `lister/[id]/+page.svelte` | `onConfirm` callback prop | Must add `imageUrl` and `brand` to the callback signature; parent page currently destructures `{ name, quantity, categoryId }` |
| `upsert_household_item_memory` (SQL function) ↔ client or trigger | PostgreSQL RPC | The function signature must gain `p_image_url text default null` and `p_brand text default null` params to write these to `household_item_memory`. Alternatively, the client writes them separately after add — simpler but two writes |
| `ItemRow` ↔ item query data | TanStack Query cache | `Item` type change in `items.ts` propagates to all consumers of `createItemsQuery` |

---

## Architectural Patterns

### Pattern 1: Additive DTO Extension with Null Default

**What:** Add optional fields `imageUrl: string | null` and `brand: string | null` to `BarcodeLookupDto` in both the edge function shared types and the client types. Both default to `null`. Consumers that do not use the new fields are unaffected.

**When to use:** Whenever new optional data is added to an existing API contract and backward compatibility must be preserved.

**Trade-offs:** The edge function `_shared/barcode.ts` and client `src/lib/barcode/lookup.ts` share the same logical type but are physically separate files. A mismatch causes silent bugs (the client ignores unknown fields, the guard may reject missing required fields). Keep them in sync manually.

### Pattern 2: Lazy Image with onerror Fallback

**What:** A `ProductThumbnail` Svelte component wraps `<img>` with `loading="lazy"`, listens for `onerror`, and replaces the broken image with a generic grocery icon placeholder when the URL is missing or the image fails to load.

**When to use:** Any place that renders a product image from Kassal.app CDN. Kassal images are not guaranteed to be permanent.

**Trade-offs:** Lazy loading keeps list render fast — images below the fold load on scroll. The `onerror` fallback handles: null URLs (items added manually), stale CDN URLs from older cache entries, and network failures. No external image loading library is needed.

### Pattern 3: MutationObserver for iOS playsinline

**What:** Before calling `htmlScanner.start()`, attach a `MutationObserver` to the scanner container. The moment html5-qrcode inserts a `<video>` element into the DOM, the observer sets `playsinline` and `muted` before any frame is painted. The observer is disconnected after the first match.

**When to use:** Any time `html5-qrcode` or any library that creates `<video>` elements is used on iOS Safari.

**Trade-offs:** Minimal surface area — one observer, one callback. The existing post-hoc setAttribute block can remain as a fallback or be removed. Tests are unaffected because the scanner is fully mocked in the test environment.

---

## Anti-Patterns

### Anti-Pattern 1: Routing Image URL Through Gemini

**What people do:** Include `imageUrl` in the Gemini prompt payload to have Gemini validate or enrich it.

**Why it's wrong:** Gemini is used only for name normalization and canonical category resolution. Image URLs are opaque strings that Gemini cannot improve. Sending them adds token cost and latency for no benefit.

**Do this instead:** Carry `imageUrl` alongside but separate from the Gemini call. In `applyGeminiResult`, copy `imageUrl` directly from `ReducedProviderPayload` into the final DTO without routing through Gemini.

### Anti-Pattern 2: Setting `playsinline` After `htmlScanner.start()` Resolves

**What people do:** Set `playsinline` on the video element in the promise callback of `htmlScanner.start()` (the current approach in `scanner.ts` lines 248–251).

**Why it's wrong:** On iOS Safari, the camera stream attaches to the `<video>` element synchronously as part of `start()`. By the time the promise resolves, the stream is already attached — setting `playsinline` after this point has no effect and results in a black camera surface.

**Do this instead:** Use a `MutationObserver` on the container element before calling `start()` to intercept the video element the moment it is inserted and set `playsinline` before the stream attaches.

### Anti-Pattern 3: NOT NULL Constraint on New Image Columns

**What people do:** Add `product_image_url text not null default ''` to avoid nullable columns.

**Why it's wrong:** Every existing row in `list_items`, `household_item_memory`, and `barcode_product_cache` predates this feature. A `NOT NULL` constraint with an empty-string default adds no semantic value and pollutes the data — an empty string is not the same as "no image". The `ProductThumbnail` component must then distinguish between `null`, `undefined`, and `''`.

**Do this instead:** Add columns as `text` with no constraint. `NULL` means "no image available". The component checks for truthiness (`!!src`) before rendering.

### Anti-Pattern 4: Joining `household_item_memory` in the List Items Query for Images

**What people do:** Join `list_items` with `household_item_memory` on `normalized_name` to pull the image URL without adding columns to `list_items`.

**Why it's wrong:** The join key is a fuzzy normalized text match, not a foreign key. The join adds complexity and a potential performance penalty for every list page load. If a user edits the item name after adding it (via `createUpdateItemMutation`), the normalized name changes and the join breaks.

**Do this instead:** Write `product_image_url` and `brand` to `list_items` at insert time (Option C). The data is self-contained in the row. Existing rows without images show the placeholder.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (family use, <50 users) | No scaling concerns. Image URLs stored as text in DB. Lazy load on client is sufficient. Kassal CDN handles image serving. |
| 1k-10k users | Edge function cold starts may become noticeable on first scan after idle. Consider warming or switching to a persistent compute layer. No image hosting changes needed — Kassal's CDN scales independently. |
| 100k+ users | Barcode cache should be promoted to a read replica. Consider an image proxy to resize Kassal CDN images to thumbnail dimensions server-side, reducing client-side decode work on lists with many items. Out of scope for this app's current user base. |

---

## Sources

- Direct source file reads (HIGH confidence): `src/lib/barcode/scanner.ts`, `BarcodeScannerSheet.svelte`, `BarcodeLookupSheet.svelte`, `ItemRow.svelte`, `ItemInput.svelte`, `src/lib/barcode/lookup.ts`, `src/lib/queries/barcode.ts`, `src/lib/queries/items.ts`, `src/lib/queries/item-memory-admin.ts`, `supabase/functions/_shared/barcode.ts`, `supabase/functions/barcode-lookup/index.ts`
- Direct migration file reads (HIGH confidence): `20260310000006_phase4_barcode_cache.sql`, `20260312190000_phase11_household_item_memory.sql`
- Key finding in `_shared/barcode.ts` line 62: `KassalProduct.image?: string | null` — field is typed but unused in pipeline
- Key finding in `_shared/barcode.ts` line 186–211: `buildReducedProviderPayload` captures `brand` but discards `image` — fix is to add `imageUrl` to the payload type and extract it here
- Key finding in `scanner.ts` lines 248–251: `playsinline` is set after `start()` resolves — confirmed timing problem for iOS

---
*Architecture research for: HandleAppen v2.0 — Barcode scanner improvement and product lookup*
*Researched: 2026-03-14*
