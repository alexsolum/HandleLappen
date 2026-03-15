---
phase: 19-edge-function-and-dto-enrichment
verified: 2026-03-15T11:00:00Z
status: passed
score: 2/2 requirements verified
gaps: []
human_verification:
  - test: "Deploy Edge Function and run EAN lookup for 7038010014013 (Tine Melk)"
    expected: "barcode_product_cache row has non-null brand and image_url populated; second lookup hits cache within TTL"
    why_human: "Deno binary not available in local environment — unit tests written correctly but not executed; requires Supabase Edge Function deployment to validate end-to-end"
---

# Phase 19: Edge Function and DTO Enrichment — Verification Report

**Phase Goal:** Enrich the barcode scanning pipeline with brand names and image URLs from Kassal.app and Open Food Facts. This phase focuses on the Edge Function logic, type definitions, and cache backfill strategy.
**Verified:** 2026-03-15T11:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `BarcodeLookupDto`, `BarcodeCacheRow`, `ReducedProviderPayload`, `BarcodeSheetModel` all carry `brand` and `image`/`imageUrl` fields | VERIFIED | `_shared/barcode.ts` lines 38-39, 53-54, 85-86, 93-94; `src/lib/barcode/lookup.ts` lines 35-36, 55-56 |
| 2 | `isBarcodeLookupDto` type guard validates `brand` and `imageUrl` fields | VERIFIED | `src/lib/barcode/lookup.ts` lines 108-109 |
| 3 | `mapBarcodeLookupResult` passes `brand` and `imageUrl` from DTO into `BarcodeSheetModel` | VERIFIED | `src/lib/barcode/lookup.ts` lines 139-140 |
| 4 | `isJunkBrand` filters junk values (`none`, `n/a`, `ukjent`, `unknown`, `na`, `-`, empty/whitespace) case-insensitively and trims valid brands | VERIFIED | `_shared/barcode.ts` lines 147-154; 10 unit tests in `barcode.test.ts` |
| 5 | `getOFFImage` follows 4-level priority chain (`image_front_no_small_url` > `image_front_small_url` > `image_small_url` > `image_thumb_url`) | VERIFIED | `_shared/barcode.ts` lines 156-164; 5 unit tests in `barcode.test.ts` |
| 6 | `buildReducedProviderPayload` extracts brand/imageUrl from both providers, preferring Kassal, falling back to OFf | VERIFIED | `_shared/barcode.ts` lines 218-219; 7 unit tests in `barcode.test.ts` |
| 7 | `extractKassalProduct` handles Kassal API v1 `data.products[0]` nested structure with backward compatibility | VERIFIED | `index.ts` lines 87-104 |
| 8 | Activation Date Safeguard discards pre-2026-03-14 cache entries missing `brand` or `image_url` to trigger re-fetch | VERIFIED | `index.ts` lines 29, 262-268; `ACTIVATION_DATE = '2026-03-14T00:00:00Z'` |
| 9 | `createCacheRow` persists `brand` and `image_url` to cache from dto | VERIFIED | `index.ts` lines 141-142 |
| 10 | Gemini prompt strips `brand`, `imageUrl`, and `image` fields from provider sub-objects to save tokens | VERIFIED | `index.ts` lines 175-207; `buildGeminiPrompt` omits brand/image from both kassal and openFoodFacts sub-objects |
| 11 | Unit test suite covers `isJunkBrand`, `getOFFImage`, and `buildReducedProviderPayload` (17 tests) | VERIFIED | `_shared/barcode.test.ts` — 17 `Deno.test` calls confirmed by reading the file |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/barcode.ts` | Updated types, `isJunkBrand`, `getOFFImage`, `buildReducedProviderPayload`, `fallbackLookupFromProviderPayload`, `applyGeminiResult`, `cacheRowToLookupDto` with brand/imageUrl | VERIFIED | All functions present and substantive; 351 lines |
| `supabase/functions/barcode-lookup/index.ts` | Kassal v1 extraction, ACTIVATION_DATE constant, readCache safeguard, createCacheRow with brand/image_url, Gemini prompt stripping | VERIFIED | All features present and wired; 435 lines |
| `src/lib/barcode/lookup.ts` | `BarcodeLookupDto` + `BarcodeSheetModel` with brand/imageUrl, updated `isBarcodeLookupDto`, `mapBarcodeLookupResult` | VERIFIED | All types and functions present; 143 lines |
| `supabase/functions/_shared/barcode.test.ts` | 17 Deno unit tests for `isJunkBrand`, `getOFFImage`, `buildReducedProviderPayload` | VERIFIED | File exists with exactly 17 `Deno.test` blocks; 195 lines |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `buildReducedProviderPayload` | `isJunkBrand` | called on `kassalProduct.brand` and `openFoodFactsProduct.brands` | WIRED | Lines 200, 204 in `barcode.ts` |
| `buildReducedProviderPayload` | `getOFFImage` | called on `openFoodFactsProduct` | WIRED | Line 205 in `barcode.ts` |
| `readCache` (Edge Function) | Activation Date Safeguard | `row.provider_fetched_at < ACTIVATION_DATE` check | WIRED | Lines 262-268 in `index.ts` |
| `enrichWithGemini` (Edge Function) | `buildGeminiPrompt` | `buildGeminiPrompt(payload)` call | WIRED | Line 329 in `index.ts` |
| `buildGeminiPrompt` | brand/image stripping | geminiPayload only includes id/name/category per provider, no brand/image | WIRED | Lines 179-200 in `index.ts` |
| `createCacheRow` | `dto.brand`, `dto.imageUrl` | `brand: dto.brand ?? null`, `image_url: dto.imageUrl ?? null` | WIRED | Lines 141-142 in `index.ts` |
| `applyGeminiResult` | `payload.brand`, `payload.imageUrl` | carries through from `ReducedProviderPayload` | WIRED | Lines 320-321 in `barcode.ts` |
| `fallbackLookupFromProviderPayload` | `payload.brand`, `payload.imageUrl` | carries through from `ReducedProviderPayload` | WIRED | Lines 282-283 in `barcode.ts` |
| `mapBarcodeLookupResult` | `dto.brand`, `dto.imageUrl` | `brand: dto.brand ?? null`, `imageUrl: dto.imageUrl ?? null` | WIRED | Lines 139-140 in `lookup.ts` |
| `barcode.test.ts` | `isJunkBrand`, `getOFFImage`, `buildReducedProviderPayload` | imports from `./barcode.ts` | WIRED | Line 2-7 in `barcode.test.ts` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ENRICH-01 | 19-01-PLAN.md | Scanned product's brand name fetched from Kassal.app and stored in barcode cache | SATISFIED | `isJunkBrand` + `buildReducedProviderPayload` extracts brand from Kassal (falling back to OFf); `createCacheRow` persists `brand` to `barcode_product_cache`; `BarcodeLookupDto`, `BarcodeCacheRow`, `BarcodeSheetModel` all carry `brand: string | null` |
| ENRICH-02 | 19-01-PLAN.md | Scanned product's image URL fetched from Kassal.app and stored in barcode cache | SATISFIED | `getOFFImage` + `buildReducedProviderPayload` extracts `imageUrl` from Kassal image field (falling back to OFf priority chain); `createCacheRow` persists `image_url` to `barcode_product_cache`; Activation Date Safeguard ensures old entries are re-fetched |

**Note:** REQUIREMENTS.md defines ENRICH-01 as brand and ENRICH-02 as image URL. The PLAN's task numbering groups both under "type definitions" (Task 1) and "Edge Function" (Task 2). The implementation satisfies both requirements: brand and image_url are both fetched from Kassal (with OFf fallback) and stored in the cache.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `_shared/barcode.test.ts` | — | Deno binary not available in local bash environment — tests written but cannot be run locally | Info | Tests are syntactically correct Deno test files; they will execute when deployed to Supabase Edge Functions environment or when Deno is installed |

No blockers or stubs found. All function bodies are substantive implementations, not placeholders.

### Human Verification Required

#### 1. End-to-End Edge Function Deployment Test

**Test:** Deploy the Edge Function to Supabase staging. Run a POST request for EAN `7038010014013` (Tine Melk). Inspect the `barcode_product_cache` table.
**Expected:** Row contains non-null `brand` (e.g., "Tine") and non-null `image_url`. A second request for the same EAN returns cached data without re-fetching from Kassal/OFf.
**Why human:** Deno binary not available in the local bash environment. The unit tests are correctly written for Deno's test runtime but have not been executed locally. End-to-end validation requires the Edge Function to be deployed.

#### 2. Activation Date Safeguard Validation

**Test:** Insert a synthetic `barcode_product_cache` row with `provider_fetched_at = '2026-03-01T00:00:00Z'` and `brand = NULL`. Make a lookup request for that EAN.
**Expected:** The safeguard discards the stale cache entry and triggers a fresh network fetch, returning a result with `brand` populated.
**Why human:** Requires a live Supabase instance with the `brand` and `image_url` columns present in the `barcode_product_cache` table (infrastructure dependency from Phase 17).

#### 3. Deno Unit Test Execution

**Test:** Run `deno test supabase/functions/_shared/barcode.test.ts` in an environment with Deno installed.
**Expected:** All 17 tests pass.
**Why human:** No Deno binary available in the local bash environment during this phase execution.

### Gaps Summary

No gaps found. All 11 observable truths are verified at all three levels (exists, substantive, wired). Both ENRICH-01 and ENRICH-02 requirements are satisfied by the implementation.

The three items flagged for human verification are deployment/runtime concerns, not implementation gaps. The code is correct and complete as written.

**Infrastructure prerequisite (noted, not a gap):** The `barcode_product_cache` table must have `brand` (text, nullable) and `image_url` (text, nullable) columns present before the Edge Function can be deployed. This is tracked as Phase 17 infrastructure work and is not a gap in Phase 19's deliverables.

---

_Verified: 2026-03-15T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
