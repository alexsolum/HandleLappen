---
phase: 04-barcode-scanning
verified: 2026-03-14T00:00:00Z
status: passed
score: 12/12 must-haves verified
human_verification:
  - test: "Open a shopping list on a physical Android Chrome device, tap the scan button, present a real EAN-13 grocery barcode, and confirm the item is added with prefilled name and category"
    expected: "Rear camera opens, barcode is detected automatically, lookup sheet appears with product name and category, confirming inserts the item into the list"
    why_human: "Physical camera hardware, autofocus, and lighting variance cannot be verified by Playwright mocks"
  - test: "Install the PWA on an iPhone and test scan flow in standalone mode (Add to Home Screen)"
    expected: "Camera opens without black screen, scan or manual EAN fallback both reach the lookup sheet and allow adding an item"
    why_human: "iOS Safari standalone PWA camera behavior requires physical device — known risk area flagged in original verification document"
---

# Phase 4: Barcode Scanning Verification Report

**Phase Goal:** Deliver a working barcode scanning flow that lets users scan or manually enter EAN codes to look up products and add them to shopping lists
**Verified:** 2026-03-14
**Status:** passed — all 12 must-haves verified; REQUIREMENTS.md traceability gap closed by Plan 04-04
**Re-verification:** No — initial structured verification (previous 04-VERIFICATION.md was narrative-only with no YAML frontmatter)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A Supabase Edge Function owns all barcode lookups so third-party secrets never reach the browser | VERIFIED | `supabase/functions/barcode-lookup/index.ts` — JWT auth validated on every request; Kassal Bearer token and Gemini API key read from `Deno.env`, never returned in responses. E2E test asserts `authHeader` starts with `Bearer` and does not contain `KASSAL`. |
| 2 | Kassal.app is the primary provider and Open Food Facts is the silent fallback | VERIFIED | `index.ts` lines 340-343: OFF is called only when `isKassalProductUsable` returns false. `_shared/barcode.ts` `buildReducedProviderPayload` merges both. Deno tests cover the Kassal-miss → OFF path. |
| 3 | Barcode results are normalized into one DTO with EAN, name, canonical category, confidence, source, and found status | VERIFIED | `BarcodeLookupDto` type in `_shared/barcode.ts` and `src/lib/barcode/lookup.ts` match exactly. `cacheRowToLookupDto`, `fallbackLookupFromProviderPayload`, and `applyGeminiResult` all return this shape. |
| 4 | A shared barcode cache stores found and not-found results with expiry TTLs so repeated scans skip provider calls | VERIFIED | Migration `20260310000006_phase4_barcode_cache.sql` creates `public.barcode_product_cache` with `expires_at` column, expiry indexes, and service-role-only access. `index.ts` checks `expires_at > now` on read and writes TTLs (found: 30 days, not-found: 3 days). |
| 5 | Gemini enrichment is schema-validated and limited to the canonical category enum | VERIFIED | `validateGeminiResponse` in `_shared/barcode.ts` rejects responses that fail enum check via `asCategory`. Gemini request uses `responseSchema` with an enum constraint over `CANONICAL_CATEGORIES`. |
| 6 | The function returns one user-facing outcome per lookup: found or not found, never split provider states | VERIFIED | `handleBarcodeLookupRequest` returns `json(200, dto)` for all outcomes. The DTO `found` field is the only signal. E2E tests assert no "Open Food Facts" or "Kassal" text appears in the confirmation sheet. |
| 7 | The list page has an explicit Scan action near the existing add-item surface | VERIFIED | `ItemInput.svelte` renders a scan button (`aria-label="Skann strekkode"`) alongside the text input and Legg til button. `openScanner()` sets `barcodeFlow = 'scanner'`. |
| 8 | Opening Scan requests rear-camera access and starts the scanner in a bottom-sheet flow | VERIFIED | `BarcodeScannerSheet.svelte` calls `startScanner` on open via `bootScanner`. `scanner.ts` uses `facingMode: { ideal: 'environment' }`, sets `playsinline` and `muted` on the video element. |
| 9 | The scanner does not use native BarcodeDetector; it uses html5-qrcode (WASM-backed) | VERIFIED | `package.json` declares `html5-qrcode: ^2.3.8`. `scanner.ts` imports from `html5-qrcode` and restricts to `EAN_13`, `EAN_8`, `UPC_A`, `UPC_E`. No `window.BarcodeDetector` usage found. |
| 10 | Manual EAN entry is always available from the same flow as a first-class recovery path | VERIFIED | `BarcodeScannerSheet.svelte` renders "Skriv EAN manuelt" button in all states. `ManualEanEntrySheet.svelte` validates digit-only EAN (8, 12, or 13 digits) and submits via `onSubmit`. E2E test confirms form validation errors and successful valid submission. |
| 11 | A successful scan or manual submit triggers one product lookup automatically | VERIFIED | `ItemInput.svelte` delegates detected EAN to `onDetected` / `onManualSubmit`. In `+page.svelte` both props map to `handleBarcodeEntry` which immediately calls `barcodeLookupMutation.mutate({ ean })`. No extra tap required. |
| 12 | BARC-01 through BARC-04 are formally traceable in REQUIREMENTS.md | VERIFIED | BARC-01..04 definitions and traceability rows added to `.planning/REQUIREMENTS.md` under v1.0 Barcode Scanning section. See Plan 04-04. |

**Score:** 12/12 truths verified

---

## Required Artifacts

### Plan 04-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260310000006_phase4_barcode_cache.sql` | Cache schema, TTL columns, indexes, RLS | VERIFIED | All 12 columns present. Two expiry indexes. Service-role-only grants. Digits-only EAN constraint. `found`/`not_found` status enum constraint. |
| `supabase/functions/barcode-lookup/index.ts` | Authenticated Edge Function entrypoint | VERIFIED | 381 lines. JWT validation, cache read, Kassal fetch, OFF fallback, Gemini enrichment, cache write, DTO return. No secrets in responses. |
| `supabase/functions/_shared/barcode.ts` | Shared normalization helpers, canonical category enum | VERIFIED | 304 lines. 25-entry canonical category const array. Full type set. `normalizeBarcode`, `buildReducedProviderPayload`, `validateGeminiResponse`, `applyGeminiResult`, `cacheRowToLookupDto`, `resolveCanonicalCategory` all implemented. |
| `tests/barcode.spec.ts` | Wave 0 scaffold + full phase coverage | VERIFIED | 441 lines. 9 real E2E tests covering scanner entry, permission denied, manual EAN validation, close/reopen, happy path, OFF fallback, Gemini normalization, not-found, and manual EAN success. All tests are real (no `test.skip` in final form). |
| `tests/helpers/barcode.ts` | Fixture builders for Kassal hit, OFF fallback, not-found, Gemini | VERIFIED | Exports `buildKassalHit`, `buildOpenFoodFactsFallbackHit`, `buildNotFoundLookup`, `buildGeminiNormalizedResponse`, `buildOffFallbackNormalizedResponse`. |

### Plan 04-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | html5-qrcode dependency | VERIFIED | `"html5-qrcode": "^2.3.8"` present. |
| `src/lib/components/barcode/BarcodeScannerSheet.svelte` | Camera sheet UI, states, manual-entry handoff | VERIFIED | 251 lines. Handles idle, loading, scanning, permission-denied, camera-failure states. Calls `startScanner`/`stopScanner`. Fires `onDetected` and `onOpenManualEntry`. |
| `src/lib/components/barcode/ManualEanEntrySheet.svelte` | Manual EAN input fallback | VERIFIED | 138 lines. Digits-only sanitization, 8/12/13-digit validation with Norwegian error copy, back-to-camera option, `onSubmit` handoff. |
| `src/lib/barcode/scanner.ts` | Scanner lifecycle wrapper, cleanup helpers | VERIFIED | 299 lines. `startScanner`, `stopScanner`, `getSupportedFormats`, `bindVisibilityCleanup`, `createRouteCleanup`. Rear-camera preference, `playsinline`/`muted` set. Mock support for test environments. |
| `src/lib/components/items/ItemInput.svelte` | Scan trigger beside add flow | VERIFIED | Scan button with `aria-label="Skann strekkode"` present at lines 210-230. Opens `BarcodeScannerSheet` and `ManualEanEntrySheet` based on `barcodeFlow` state. |

### Plan 04-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/queries/barcode.ts` | TanStack mutation wrapping Edge Function invoke | VERIFIED | 43 lines. `createBarcodeLookupMutation` calls `supabase.functions.invoke('barcode-lookup', { body: { ean, listId } })`, validates response shape, maps to `BarcodeSheetModel` via `mapBarcodeLookupResult`. |
| `src/lib/components/barcode/BarcodeLookupSheet.svelte` | Loading, found, not-found, confirm-to-add states | VERIFIED | 225 lines. Handles all four view states. Found state shows editable name, quantity, and category select pre-populated from lookup result. Confirm button calls `onConfirm`. Not-found still allows manual name entry and add. |
| `src/routes/(protected)/lister/[id]/+page.svelte` | Full scan-to-add orchestration | VERIFIED | `handleBarcodeEntry` at line 277 immediately fires `barcodeLookupMutation.mutate`. `handleBarcodeConfirm` at line 312 calls `addItemMutation.mutate` and `assignCategoryMutation.mutate`. All sheets wired to page state. |

---

## Key Link Verification

### Plan 04-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/routes/(protected)/lister/[id]/+page.svelte` | `supabase/functions/barcode-lookup/index.ts` | `supabase.functions.invoke('barcode-lookup', { body: { ean, listId } })` | WIRED | `src/lib/queries/barcode.ts` line 28 performs the invoke; page creates the mutation at line 91. |
| `supabase/functions/barcode-lookup/index.ts` | `barcode_product_cache` | Cache read/write with `expires_at` TTL | WIRED | `readCache` queries `.gt('expires_at', nowIso)`. `writeCache` upserts with computed `expires_at`. Both are called in `handleBarcodeLookupRequest`. |
| `supabase/functions/barcode-lookup/index.ts` | `supabase/functions/_shared/barcode.ts` | Canonical category enum + normalization + Gemini validation | WIRED | All exports from `_shared/barcode.ts` are imported at lines 2-17 of `index.ts` and used throughout the handler. |

### Plan 04-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/components/items/ItemInput.svelte` | `src/lib/components/barcode/BarcodeScannerSheet.svelte` | Scan button sets `barcodeFlow = 'scanner'`; sheet rendered with `open={barcodeFlow === 'scanner'}` | WIRED | `openScanner` at line 112; `<BarcodeScannerSheet open={barcodeFlow === 'scanner'} ...>` at line 276. |
| `src/lib/components/barcode/BarcodeScannerSheet.svelte` | `src/lib/barcode/scanner.ts` | `startScanner` called in `bootScanner` | WIRED | Line 108 of scanner sheet calls `startScanner({ elementId, onDetected, onError })`. |
| `src/lib/components/barcode/BarcodeScannerSheet.svelte` | `src/lib/components/barcode/ManualEanEntrySheet.svelte` | "Skriv EAN manuelt" button fires `onOpenManualEntry` | WIRED | Button at line 235 of scanner sheet fires `onOpenManualEntry`. In `ItemInput.svelte` this maps to `openManualEntry` which opens the manual sheet. |

### Plan 04-03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/components/barcode/BarcodeScannerSheet.svelte` | `src/lib/queries/barcode.ts` | Detected EAN handed to `handleBarcodeEntry` → `barcodeLookupMutation.mutate` | WIRED | `onDetected` in `+page.svelte` at line 417 maps to `handleBarcodeEntry`; mutation fires immediately. |
| `src/lib/queries/barcode.ts` | `src/lib/queries/items.ts` | Confirmed lookup result calls `createAddItemMutation` (not a special-case write) | WIRED | `handleBarcodeConfirm` in `+page.svelte` at line 313 calls `addItemMutation.mutate`. `addItemMutation` is `createAddItemMutation(data.supabase, data.listId)` from `src/lib/queries/items.ts`. |
| `src/lib/queries/barcode.ts` | `src/lib/queries/categories.ts` | Canonical category mapped to household category ID via `resolveCanonicalCategoryId` | WIRED | `createBarcodeLookupMutation` accepts `getCategories: () => BarcodeCategoryOption[]`; in page this is `() => categoriesQuery.data ?? []`. `mapBarcodeLookupResult` calls `resolveCanonicalCategoryId` with those categories. |

---

## Requirements Coverage

| Requirement | Source Plan | Description (from ROADMAP) | Status | Evidence |
|-------------|------------|---------------------------|--------|----------|
| BARC-01 | 04-02, 04-03 | User taps "Scan", camera opens, detected barcode triggers lookup without extra tap | SATISFIED — code | `ItemInput.svelte` scan button + `BarcodeScannerSheet` + `handleBarcodeEntry` auto-triggers lookup. E2E happy-path test confirms. |
| BARC-02 | 04-01, 04-03 | Kassal.app primary, Open Food Facts silent fallback, client sees one result state | SATISFIED — code | `index.ts` Kassal-first logic; `buildReducedProviderPayload` merges both into one DTO. E2E `fallback success` test asserts no provider names visible. |
| BARC-03 | 04-01, 04-03 | Gemini normalizes name and canonical category; result pre-fills confirmation sheet | SATISFIED — code | `validateGeminiResponse` + `applyGeminiResult` in `_shared/barcode.ts`. E2E `gemini normalization` test asserts Gemini-derived name and category reach the sheet and inserted item. |
| BARC-04 | 04-01, 04-02, 04-03 | Name and category auto-filled from scan; manual EAN fallback always available | SATISFIED — code | `BarcodeLookupSheet.svelte` pre-fills `draftName` and `draftCategoryId` from `result`. Manual EAN is reachable from scanner sheet in all states. E2E tests confirm both paths. |

**Orphaned requirements:** BARC-01 through BARC-04 do not appear in REQUIREMENTS.md. The ROADMAP defines them and cross-references them across Phase 4 and Phase 8 plans. The Phase 8 reconciliation plan explicitly calls for adding them to REQUIREMENTS.md (Phase 8 success criterion 2), but this was not completed. This is the gap recorded above.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/lib/barcode/scanner.ts` lines 89-91 | `return null` in `normalizeRetailBarcode` | Info | Not a stub — correct early-return for invalid input |
| `BarcodeScannerSheet.svelte` line 34 | `return null` in `getMockMode` | Info | Not a stub — returns null when no mock is configured |
| `supabase/functions/barcode-lookup/index.ts` line 374 | `console.error` on internal error | Info | Intentional server-side logging before returning generic 500 |

No TODO, FIXME, placeholder, empty handler, or stub patterns found in any barcode-related file.

---

## Human Verification Required

### 1. Physical device scan — Android Chrome

**Test:** Open a shopping list on an Android Chrome browser, tap the Scan button, present a real EAN-13 grocery barcode to the rear camera
**Expected:** Rear camera opens, barcode is detected automatically within a few seconds, lookup sheet appears with product name and category pre-filled, confirm inserts the item into the list with quantity 1
**Why human:** Physical camera hardware, real-world autofocus, and lighting conditions cannot be simulated by Playwright browser mocks

### 2. iOS Safari PWA standalone scan and manual EAN fallback

**Test:** Install the PWA on an iPhone via "Add to Home Screen", open a list in standalone mode, tap Scan
**Expected:** Camera opens without a black screen, either a real barcode scan succeeds or the manual EAN fallback completes the lookup, the item is added to the list
**Why human:** iOS Safari standalone PWA camera behavior requires a physical device; the original Phase 4 verification document flagged this as a residual device risk; it cannot be reproduced in Playwright

---

## Gaps Summary

All functional code for Phase 4 is implemented, substantive, and wired. Every artifact across all three plans exists with real implementation. All nine key links are verified. The E2E test suite covers all required scenarios with no test.skip stubs.

The administrative gap — BARC-01 through BARC-04 missing from REQUIREMENTS.md — was closed by Plan 04-04 (gap closure). BARC-01..04 definitions and traceability rows now exist in .planning/REQUIREMENTS.md under the v1.0 Barcode Scanning section.

**Phase 4 verdict: PASSED — 12/12 must-haves verified.**

---

_Verified: 2026-03-14_
_Verifier: Claude (gsd-verifier)_
