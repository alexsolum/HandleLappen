# Phase 4: Barcode Scanning - Research

**Date:** 2026-03-10
**Phase:** 04-barcode-scanning
**Requirements:** BARC-01, BARC-02, BARC-03, BARC-04

## Executive Summary

Phase 4 should split cleanly into three planning areas:

1. A server-only lookup layer that protects the Kassal token, falls back to Open Food Facts, caches responses, and normalizes one product result.
2. A mobile-first scanner UI that works in iOS Safari/PWA mode by using a WASM-backed barcode detector path rather than relying on native `BarcodeDetector`.
3. A scan-to-add confirmation flow that reuses the Phase 3 list/detail bottom-sheet patterns and ends by inserting an ordinary `list_item`.

The biggest planning risk is not UI complexity. It is the contract between the scanner, the lookup edge function, and the normalization/category-classification path. Plans should isolate that first.

---

## Key Findings

### 1. Server-side lookup is mandatory

- The roadmap requirement that the Kassal Bearer token never appear in browser DevTools means all Kassal requests must be routed through a Supabase Edge Function.
- The edge function should be the single public lookup boundary for the client: one EAN in, one normalized product result out.
- Open Food Facts fallback should stay inside the same edge function, not become a second client-visible code path.

### 2. Product normalization needs its own contract

- Kassal and Open Food Facts will return different product shapes and quality levels.
- Planner should define a normalized output shape early, likely something close to:
  - `ean`
  - `name`
  - `brand`
  - `image_url`
  - `source`
  - `category_suggestion`
  - `confidence`
  - `not_found`
- Gemini should not be asked to do open-ended generation. It should classify/clean into a tightly structured JSON response from normalized provider input.
- Classification should reuse the existing household category model from Phase 3, but Phase 4 only needs the default/category suggestion path, not new category management features.

### 3. Cache before AI/classification where possible

- The roadmap already places `product_cache` in Phase 4 plan 04-01. That should store the normalized provider response plus category suggestion metadata, not raw provider payload only.
- Cache key should be the EAN code.
- A 30-day TTL is appropriate for grocery products because names and categories are mostly stable, while pricing is irrelevant here.
- Caching normalized results reduces repeated Kassal/Open Food Facts calls and repeated Gemini usage for popular household staples.

### 4. Scanner UX should not depend on native BarcodeDetector

- iOS Safari/PWA support is the hard requirement, so the scanner plan should assume the polyfill/WASM path is the primary reliable implementation.
- Scanner should be explicitly user-triggered from the list screen.
- Detection loop should stop on first confident result and hand off to the lookup flow immediately.
- The scanner must degrade to manual EAN entry within the same recovery surface when camera access fails or the environment cannot scan well.

### 5. Phase 3 assets reduce UI risk substantially

- Existing bottom-sheet dialog patterns already exist in:
  - `src/lib/components/items/CategoryPickerModal.svelte`
  - `src/lib/components/items/ItemDetailSheet.svelte`
- Existing list integration point already exists in:
  - `src/routes/(protected)/lister/[id]/+page.svelte`
- Existing item insert mutation path already exists in:
  - `src/lib/queries/items.ts`
- That means Phase 4 should not invent a new add-item architecture. It should feed the scanner result into the same list item mutation layer.

---

## Recommended Plan Shape

### Plan 04-01: Lookup backend and normalization

Focus:
- Supabase Edge Function `/barcode/{ean}`
- Kassal primary lookup
- Open Food Facts fallback
- `product_cache` table and TTL handling
- Gemini structured category/name extraction
- response normalization and error contract

Why first:
- It resolves the biggest uncertainty and creates the API contract for the UI plans.

### Plan 04-02: Scanner UI and camera detection

Focus:
- dedicated scan action in list UI
- camera permission handling
- WASM/polyfill-backed detector
- rear-camera preference
- detection loop and stop-on-hit behavior

Why second:
- Scanner can be built against a mocked or real edge function contract once 04-01 is defined.

### Plan 04-03: Scan-to-add flow

Focus:
- bottom-sheet result presentation
- editable name/category/quantity
- confirm-to-add behavior
- manual EAN fallback
- not-found state
- list insertion and targeted e2e coverage

Why third:
- It depends on both the lookup contract and scanner entry flow.

---

## Product and UX Constraints

### Locked by context

- Dedicated scan action, not replacement of typed input
- One-shot auto-fetch after first strong detection
- Result shown in bottom sheet
- Explicit confirm before insert
- Camera failure and manual EAN use the same recovery flow
- Name, category, and quantity all editable
- Quantity defaults to `1`
- Confirm returns user to the list

### Implications for planning

- Plans should treat the scanner as an alternate item-entry method, not a separate mode of the app.
- The result UI should look and behave like Phase 3 bottom sheets.
- Not-found and manual entry should be folded into the same flow, not split into separate route states.

---

## Data and API Research Notes

### Edge Function contract

Recommended success payload:

```json
{
  "ean": "7040512631516",
  "name": "Tine Lettmelk 1L",
  "brand": "Tine",
  "imageUrl": "https://...",
  "source": "kassal",
  "categorySuggestion": {
    "name": "Meieri og egg",
    "categoryId": "uuid-or-null",
    "confidence": 0.92
  },
  "notFound": false
}
```

Recommended miss payload:

```json
{
  "ean": "7040512631516",
  "notFound": true
}
```

### Normalization rules

- Prefer provider product name if it is clean and localized.
- Use Gemini only to:
  - clean noisy titles when needed
  - map product text to an existing app category
- Do not make Gemini responsible for the full lookup pipeline.
- Store both normalized result and source metadata so future debugging does not require replaying provider calls.

### Security rules

- Kassal token must live only in server env / Edge Function secrets.
- Client calls only the app-controlled edge function.
- Rate limiting or abuse protection should be considered in the edge function plan, even if lightweight.

---

## Test Strategy

### Automated

- Unit/integration coverage for the edge function normalization path:
  - Kassal hit
  - Kassal miss -> Open Food Facts hit
  - provider miss -> `notFound`
  - cache hit bypassing providers
  - Gemini classification returning structured category suggestion
- Browser/e2e coverage for:
  - scanner entry action visible
  - manual EAN fallback flow
  - result sheet prefill + confirm
  - not-found state
  - token never exposed client-side is best verified via architecture review and edge function boundary, not DOM assertions

### Manual-only or higher-risk checks

- Physical-device scan reliability under varying lighting
- iOS Safari standalone/PWA camera permission behavior
- rear-camera selection behavior on real phones

---

## Validation Architecture

### Proposed quick feedback loop

- Backend quick check:
  - targeted function/unit tests for lookup normalization
- Frontend quick check:
  - targeted Playwright file for barcode/manual-entry result flow
- Full wave check:
  - `npx playwright test`

### Required Wave 0 additions

- `tests/barcode.spec.ts` for the dedicated Phase 4 scan/manual-entry flows
- Edge function test harness or a lightweight direct invocation path for the barcode lookup handler
- Mock fixtures for Kassal, Open Food Facts, and Gemini responses

---

## Planning Risks to Address

1. **API ambiguity**
   - Kassal auth and product endpoint details are a known project concern in `STATE.md`.
   - Planner should isolate endpoint verification and normalization in the first plan.

2. **Polyfill/device behavior**
   - iOS Safari standalone support is the requirement that should drive scanner architecture, not desktop convenience.

3. **Cross-plan contract drift**
   - If plan 04-01 does not define a stable normalized response, plans 04-02 and 04-03 will be brittle.

4. **False confidence from desktop testing**
   - Planner should keep manual verification tasks for physical-device scanning behavior even if automated tests are strong.

---

## Reusable Code Context

### Reusable assets

- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/items.ts`
- `src/lib/components/items/CategoryPickerModal.svelte`
- `src/lib/components/items/ItemDetailSheet.svelte`
- `src/lib/components/items/ItemInput.svelte`

### Established patterns

- Bottom-sheet dialogs for focused task flows
- TanStack Query mutations for optimistic list updates
- Norwegian-first labels and error states
- Mobile-first interactions

### Integration points

- Add scan trigger near or inside the existing list-entry area
- Feed confirmed scan result into existing add-item mutation path
- Reuse category suggestion/editing patterns from Phase 3

---

## Recommendation To Planner

Write 3 plans that mirror the roadmap split:
- backend lookup and cache
- scanner camera/polyfill UI
- scan-to-add confirmation flow

Ensure plan 04-01 defines the exact response contract consumed by 04-02 and 04-03. That contract is the backbone of the phase.
