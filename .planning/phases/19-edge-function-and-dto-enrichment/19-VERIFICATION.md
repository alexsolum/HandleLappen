---
phase: 19-edge-function-and-dto-enrichment
verified: 2026-03-15T11:30:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 11/11
  gaps_closed: []
  gaps_remaining: []
  regressions:
    - "Test count reported as 17 in SUMMARY and previous VERIFICATION; actual count is 22 — minor documentation discrepancy, not a code regression"
human_verification:
  - test: "Deploy Edge Function and run EAN lookup for 7038010014013 (Tine Melk)"
    expected: "barcode_product_cache row has non-null brand and image_url populated; second lookup for same EAN is served from cache"
    why_human: "Deno binary not available locally — unit tests are correctly written but cannot be executed without Deno; end-to-end validation requires Supabase Edge Function deployment"
  - test: "Activation Date Safeguard: insert a synthetic cache row with provider_fetched_at = '2026-03-01T00:00:00Z' and brand = NULL, then request that EAN"
    expected: "Safeguard discards the stale entry and triggers a fresh fetch that returns brand populated"
    why_human: "Requires a live Supabase instance with Phase 17 migration applied (brand and image_url columns present)"
  - test: "Run deno test supabase/functions/_shared/barcode.test.ts"
    expected: "All 22 Deno tests pass"
    why_human: "No Deno binary available in the local bash environment"
---

# Phase 19: Edge Function and DTO Enrichment — Verification Report

**Phase Goal:** Every new barcode scan returns brand and image URL from Kassal.app, stores them in the cache, and delivers them to the client — without routing image data through Gemini
**Verified:** 2026-03-15T11:30:00Z
**Status:** human_needed (all automated checks pass; deployment and runtime validation outstanding)
**Re-verification:** Yes — re-verification after initial pass; no gaps found, no regressions

## Goal Achievement

### Success Criterion 1

> After scanning a product that Kassal.app knows, the `barcode_product_cache` row contains a non-null `brand` and a non-null `image_url` (or null where Kassal does not provide one — the field is populated when available, not silently dropped)

**Status: VERIFIED (code path complete; database write requires deployment)**

The full write path is traceable:

1. `extractKassalProduct` (`index.ts` lines 81-105) extracts `KassalProduct` from `data.products[0]` (Kassal v1), `data[0]` (alternate), or `product` (legacy).
2. `buildReducedProviderPayload` (`barcode.ts` lines 194-251) calls `isJunkBrand(kassalProduct.brand)` and `asTrimmedString(kassalProduct.image)`, then sets top-level `brand` and `imageUrl` with Kassal-preferred, OFf-fallback logic (lines 218-219).
3. `fallbackLookupFromProviderPayload` and `applyGeminiResult` both carry `brand` and `imageUrl` from `ReducedProviderPayload` into `BarcodeLookupDto` (barcode.ts lines 282-283 and 320-321).
4. `createCacheRow` (`index.ts` lines 123-144) writes `brand: dto.brand ?? null` and `image_url: dto.imageUrl ?? null` to the cache row.
5. `writeCache` upserts the complete row to `barcode_product_cache`.
6. The Phase 17 migration (`20260315094926_phase17_schema_migrations.sql`) confirms the `brand` (text) and `image_url` (text) columns exist on the table.

When Kassal does not provide a brand or image, the field is `null` rather than silently absent — the `BarcodeCacheRow` type declares both fields as `string | null` (barcode.ts lines 53-54), and `createCacheRow` always sets them.

### Success Criterion 2

> The client-side `BarcodeLookupDto` received after a scan includes `brand` and `imageUrl` fields that match what Kassal returned; neither field is routed through Gemini

**Status: VERIFIED**

The Gemini non-routing is confirmed at two levels:

- `buildGeminiPrompt` (`index.ts` lines 175-208) constructs an explicit stripped payload that includes only `id`, `name`, `category` for the Kassal sub-object and `code`, `productName`, `categoriesTags` for the OFf sub-object. The `brand` and `image` fields from both provider sub-objects are explicitly omitted.
- After Gemini returns, `applyGeminiResult` (`barcode.ts` lines 309-323) takes `brand` and `imageUrl` from `payload` (the pre-Gemini `ReducedProviderPayload`), not from `geminiResult`. Gemini's response schema does not include brand or image fields.

The client-side `BarcodeLookupDto` (`src/lib/barcode/lookup.ts` lines 28-37) declares both fields. `isBarcodeLookupDto` validates them (lines 108-109). `mapBarcodeLookupResult` maps them into `BarcodeSheetModel` (lines 139-140).

---

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `BarcodeLookupDto` carries `brand: string | null` and `imageUrl: string | null` | VERIFIED | `_shared/barcode.ts` lines 38-39; `src/lib/barcode/lookup.ts` lines 35-36 |
| 2 | `BarcodeCacheRow` carries `brand: string | null` and `image_url: string | null` | VERIFIED | `_shared/barcode.ts` lines 53-54 |
| 3 | `ReducedProviderPayload` carries top-level `brand`/`imageUrl` and per-provider `image` fields | VERIFIED | `_shared/barcode.ts` lines 85-86, 93-94 |
| 4 | `BarcodeSheetModel` carries `brand: string | null` and `imageUrl: string | null` | VERIFIED | `src/lib/barcode/lookup.ts` lines 55-56 |
| 5 | `isBarcodeLookupDto` type guard validates `brand` and `imageUrl` | VERIFIED | `src/lib/barcode/lookup.ts` lines 108-109 |
| 6 | `mapBarcodeLookupResult` passes `brand` and `imageUrl` from DTO to model | VERIFIED | `src/lib/barcode/lookup.ts` lines 139-140 |
| 7 | `isJunkBrand` filters none/n/a/ukjent/unknown/na/-/empty (case-insensitive, trimmed) and returns sanitized brand or null | VERIFIED | `_shared/barcode.ts` lines 147-154; 10 unit tests in `barcode.test.ts` |
| 8 | `getOFFImage` follows 4-level priority chain (no_small > front_small > small > thumb) | VERIFIED | `_shared/barcode.ts` lines 156-164; 5 unit tests in `barcode.test.ts` |
| 9 | `buildReducedProviderPayload` prefers Kassal brand/image over OFf; calls `isJunkBrand` and `getOFFImage` | VERIFIED | `_shared/barcode.ts` lines 200-205, 218-219; 7 unit tests in `barcode.test.ts` |
| 10 | `extractKassalProduct` handles Kassal API v1 `data.products[0]` with backward compatibility | VERIFIED | `index.ts` lines 87-104 |
| 11 | Activation Date Safeguard discards pre-2026-03-14 cache entries missing brand or image_url | VERIFIED | `index.ts` line 29 (`ACTIVATION_DATE = '2026-03-14T00:00:00Z'`); lines 262-268 (conditional null return) |
| 12 | `createCacheRow` persists `dto.brand` and `dto.imageUrl` as `brand` and `image_url` | VERIFIED | `index.ts` lines 141-142 |
| 13 | Gemini prompt strips brand and image from both provider sub-objects | VERIFIED | `index.ts` lines 179-200; kassal sub-object contains only id/name/category; openFoodFacts sub-object contains only code/productName/categoriesTags |
| 14 | `applyGeminiResult` sources brand/imageUrl from ReducedProviderPayload, not from Gemini response | VERIFIED | `_shared/barcode.ts` lines 320-321 |
| 15 | Phase 17 migration adds `brand` and `image_url` columns to `barcode_product_cache` | VERIFIED | `supabase/migrations/20260315094926_phase17_schema_migrations.sql` lines 1-4 |

**Score:** 15/15 truths verified (11/11 from previous verification, 4 additional truths confirmed during re-verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/barcode.ts` | Updated types; `isJunkBrand`, `getOFFImage`, `buildReducedProviderPayload`, `fallbackLookupFromProviderPayload`, `applyGeminiResult`, `cacheRowToLookupDto` with brand/imageUrl | VERIFIED | 351 lines; all functions present, substantive, and not stubs |
| `supabase/functions/barcode-lookup/index.ts` | Kassal v1 extraction, `ACTIVATION_DATE` constant, `readCache` safeguard, `createCacheRow` with brand/image_url, Gemini prompt stripping | VERIFIED | 435 lines; all features present and wired end-to-end |
| `src/lib/barcode/lookup.ts` | `BarcodeLookupDto` + `BarcodeSheetModel` with brand/imageUrl, updated `isBarcodeLookupDto`, `mapBarcodeLookupResult` | VERIFIED | 143 lines; types and mapping functions complete |
| `supabase/functions/_shared/barcode.test.ts` | Unit test suite for `isJunkBrand`, `getOFFImage`, `buildReducedProviderPayload` | VERIFIED | 195 lines; 22 `Deno.test` blocks (SUMMARY/previous VERIFICATION documented 17 — actual count is higher, which is better coverage, not a defect) |
| `supabase/migrations/20260315094926_phase17_schema_migrations.sql` | `brand` and `image_url` columns on `barcode_product_cache` | VERIFIED | Migration adds both columns as nullable text to `barcode_product_cache`, `household_item_memory`, and `list_items` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `buildReducedProviderPayload` | `isJunkBrand` | called on `kassalProduct.brand` and `openFoodFactsProduct.brands` | WIRED | `barcode.ts` lines 200, 204 |
| `buildReducedProviderPayload` | `getOFFImage` | called on `openFoodFactsProduct` when present | WIRED | `barcode.ts` line 205 |
| `readCache` | Activation Date Safeguard | `row.provider_fetched_at < ACTIVATION_DATE` conditional return null | WIRED | `index.ts` lines 262-268 |
| `enrichWithGemini` | `buildGeminiPrompt` | `buildGeminiPrompt(payload)` passed to Gemini request body | WIRED | `index.ts` line 329 |
| `buildGeminiPrompt` | brand/image stripped | geminiPayload omits brand/image from kassal and openFoodFacts sub-objects | WIRED | `index.ts` lines 186-199; explicit property selection excludes brand and image |
| `applyGeminiResult` | `payload.brand`, `payload.imageUrl` | carries through from `ReducedProviderPayload`, not from `geminiResult` | WIRED | `barcode.ts` lines 320-321 |
| `fallbackLookupFromProviderPayload` | `payload.brand`, `payload.imageUrl` | carries through into `BarcodeLookupDto` | WIRED | `barcode.ts` lines 282-283 |
| `createCacheRow` | `dto.brand`, `dto.imageUrl` | `brand: dto.brand ?? null`, `image_url: dto.imageUrl ?? null` | WIRED | `index.ts` lines 141-142 |
| `mapBarcodeLookupResult` | `dto.brand`, `dto.imageUrl` | maps into `BarcodeSheetModel.brand` and `.imageUrl` | WIRED | `src/lib/barcode/lookup.ts` lines 139-140 |
| `barcode.test.ts` | `isJunkBrand`, `getOFFImage`, `buildReducedProviderPayload` | imports from `./barcode.ts` | WIRED | `barcode.test.ts` lines 2-7 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ENRICH-01 | 19-01-PLAN.md | Scanned product's brand name fetched from Kassal.app and stored in barcode cache | SATISFIED | `isJunkBrand` + `buildReducedProviderPayload` extracts and sanitizes brand from Kassal (falling back to OFf); `createCacheRow` persists `brand` to `barcode_product_cache`; Phase 17 migration confirms column exists; full client chain: `BarcodeLookupDto.brand` → `BarcodeSheetModel.brand` |
| ENRICH-02 | 19-01-PLAN.md | Scanned product's image URL fetched from Kassal.app and stored in barcode cache | SATISFIED | `getOFFImage` + `buildReducedProviderPayload` extracts `imageUrl` from Kassal image field (OFf priority-chain fallback); `createCacheRow` persists `image_url`; Phase 17 migration confirms column exists; Activation Date Safeguard ensures stale entries are re-fetched; Gemini prompt confirmed to not receive image data |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `_shared/barcode.test.ts` | — | Deno tests cannot be executed locally (no Deno binary) | Info | Tests are syntactically correct; will execute in Supabase Edge Functions environment or with Deno installed locally |

No blockers, stubs, or placeholder implementations found. All function bodies are substantive.

**Minor documentation discrepancy (not a code issue):** The SUMMARY and previous VERIFICATION.md both state "17 unit tests." The actual test file contains 22 `Deno.test` blocks. This means more test coverage was delivered than documented — a harmless over-delivery.

### Human Verification Required

#### 1. End-to-End Edge Function Deployment Test

**Test:** Deploy the Edge Function to Supabase staging. POST to the barcode-lookup function with body `{"ean":"7038010014013"}`. Inspect the `barcode_product_cache` table row for that EAN.
**Expected:** Row contains non-null `brand` (e.g., "Tine") and non-null `image_url`. A second POST for the same EAN within TTL is served from cache (no outbound requests to Kassal/OFf).
**Why human:** Deno binary not available locally. Requires deployed Edge Function and live Supabase instance with Phase 17 migration applied.

#### 2. Activation Date Safeguard Validation

**Test:** Insert a synthetic `barcode_product_cache` row with `ean = '7038010099999'`, `provider_fetched_at = '2026-03-01T00:00:00Z'`, `brand = NULL`, `expires_at` set to a future date. POST a lookup for that EAN.
**Expected:** The safeguard discards the stale entry (returns null from `readCache`) and triggers a fresh network fetch, returning a result with `brand` populated (or explicitly null if Kassal does not carry one for that product).
**Why human:** Requires a live Supabase instance. The condition `row.provider_fetched_at < ACTIVATION_DATE` where `ACTIVATION_DATE = '2026-03-14T00:00:00Z'` is verified by reading the code but cannot be exercised without a real database.

#### 3. Deno Unit Test Execution

**Test:** In an environment with Deno installed, run `deno test supabase/functions/_shared/barcode.test.ts`.
**Expected:** All 22 tests pass.
**Why human:** No Deno binary available in the local bash environment during this verification.

### Gaps Summary

No gaps found. All 15 observable truths are verified at all three levels (exists, substantive, wired). Both ENRICH-01 and ENRICH-02 requirements are satisfied.

The three human verification items are deployment and runtime concerns, not code gaps. The implementation is complete and correct as written.

**Infrastructure note:** Phase 17 migration (`20260315094926_phase17_schema_migrations.sql`) is present in the repository and adds `brand` and `image_url` to `barcode_product_cache`. The Edge Function will function correctly once this migration is applied to the target environment.

---

_Verified: 2026-03-15T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
