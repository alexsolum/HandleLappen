---
phase: 04-barcode-scanning
plan: 03
subsystem: ui
tags: [barcode, svelte, tanstack-query, playwright, supabase-functions, category-mapping]
requires:
  - phase: 04-01
    provides: barcode-lookup Edge Function, normalized BarcodeLookupDto, barcode test fixtures
  - phase: 04-02
    provides: BarcodeScannerSheet, ManualEanEntrySheet, ItemInput with onDetected/onManualSubmit hooks
provides:
  - createBarcodeLookupMutation with one UI state machine (loading/found/not_found/error)
  - BarcodeLookupSheet with loading, found, not-found, and error states plus confirm-to-add action
  - Full scan-to-add orchestration in the list page wiring scanner EAN hand-off to lookup to add-item mutation
  - Playwright suite covering happy path, fallback, Gemini normalization, not-found, and manual EAN scenarios
affects: [v2.0-phase-18, v2.0-phase-19, v2.0-phase-20, barcode-scanner-ui, list-entry-flow]
tech-stack:
  added: []
  patterns:
    - One lookup mutation surfaces a single UI state (loading/found/not_found/error) regardless of provider fallback
    - Confirmed add uses the normal add-item + assign-category mutation path — no special-case item writes
    - Canonical category label resolved to household category_id via normalizeLabel comparison before confirmation
    - Category re-resolve $effect handles delayed category data load after lookup resolves
key-files:
  created:
    - src/lib/barcode/lookup.ts
    - src/lib/queries/barcode.ts
    - src/lib/components/barcode/BarcodeLookupSheet.svelte
  modified:
    - src/routes/(protected)/lister/[id]/+page.svelte
    - tests/barcode.spec.ts
    - tests/helpers/barcode.ts
key-decisions:
  - "BarcodeLookupSheet receives viewState/result as props so the list page owns the full state machine and the sheet remains a pure display component"
  - "Category ID resolution runs twice: once in the mutation (if categories loaded) and once via $effect on the list page (if categories arrive after the mutation settles)"
  - "Confirmed add goes through the standard addItemMutation + assignCategoryMutation path to stay consistent with typed items and trigger the remembered-item memory pipeline"
  - "Not-found state reuses the same found-state form fields so the user can add a manually-named item without leaving the sheet"
patterns-established:
  - "Barcode lookup result sheet is a dumb props-driven component; orchestration lives in the page"
  - "EAN detected event from scanner closes the scanner sheet before opening the lookup sheet"
  - "Retry actions reopen the scanner or manual-EAN sheet via the barcodeResumeFlow state mechanism in ItemInput"
requirements-completed: [BARC-01, BARC-02, BARC-03, BARC-04]
duration: 15min
completed: 2026-03-14
---

# Phase 4 Plan 3: Scan-to-Add Workflow Summary

**Lookup mutation with one UI state machine, BarcodeLookupSheet with prefilled name and category, and full scan-to-add orchestration wired into the list page**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-14T19:55:43Z
- **Completed:** 2026-03-14T20:10:00Z
- **Tasks:** 2 completed (Task 3 is manual device validation — paused at checkpoint)
- **Files modified:** 6

## Accomplishments

- Created `src/lib/barcode/lookup.ts` with `BarcodeLookupDto`, `BarcodeSheetModel`, `mapBarcodeLookupResult`, and `resolveCanonicalCategoryId` — canonical category resolution uses normalized string comparison across all household category aliases.
- Created `src/lib/queries/barcode.ts` with `createBarcodeLookupMutation` that calls the `barcode-lookup` Edge Function and maps the DTO into a typed sheet model.
- Created `BarcodeLookupSheet.svelte` with all four view states (loading, found, not_found, error), editable name/quantity/category fields, and a confirm action that fires `onConfirm`.
- Wired the full scan-to-add orchestration in the list page: scanner EAN and manual EAN both call `handleBarcodeEntry`, which sets `barcodeLookupState = 'loading'` and fires the mutation; found/not_found settle the state and open the sheet; confirmed add goes through the normal `addItemMutation` + `assignCategoryMutation` path.
- Extended `tests/barcode.spec.ts` with the full lookup flow suite: happy path (Gemini normalized), fallback path (OFF success), Gemini name/category normalization, unknown barcode not-found, and manual EAN validation with successful lookup.

## Task Commits

Tasks 1 and 2 were implemented as part of the prior codebase sync. The code ships in commits:

1. **Task 1: Barcode lookup layer and BarcodeLookupSheet** — included in `d700995` (feat: sync HandleLappen project state)
2. **Task 2: List-page wiring and Playwright suite** — included in `d700995` (feat: sync HandleLappen project state)
3. **Task 3: Manual device validation** — paused at human checkpoint

**Plan metadata:** pending final commit after Task 3 approval

## Files Created/Modified

- `src/lib/barcode/lookup.ts` — Defines `BarcodeLookupDto`, `BarcodeSheetModel`, canonical category enum, `isBarcodeLookupDto` guard, `resolveCanonicalCategoryId`, and `mapBarcodeLookupResult`.
- `src/lib/queries/barcode.ts` — `createBarcodeLookupMutation` wraps the Edge Function call and exports types for downstream consumers.
- `src/lib/components/barcode/BarcodeLookupSheet.svelte` — Confirmation sheet with four view states, draft-editable fields, and a confirm-to-add button.
- `src/routes/(protected)/lister/[id]/+page.svelte` — Orchestrates `barcodeLookupState`, fires the lookup mutation on EAN detection, passes all props to `BarcodeLookupSheet`, and confirms via the standard add-item + assign-category mutations.
- `tests/barcode.spec.ts` — Five E2E scenarios covering the full BARC requirement surface.
- `tests/helpers/barcode.ts` — `buildGeminiNormalizedResponse`, `buildOffFallbackNormalizedResponse`, `buildNotFoundLookup` fixture helpers.

## Decisions Made

- The lookup sheet is a dumb props-driven component; all state (loading, found, not_found, error) is owned by the page so it composes cleanly with the scanner and manual-EAN resume flow already in `ItemInput`.
- Category ID resolution has two opportunities: at mutation settle time (if categories are already loaded) and via a reactive `$effect` on the page (to catch the case where categories load after the mutation). This avoids a flicker where the category field shows "Andre varer" briefly.
- The confirmed-add path intentionally goes through `addItemMutation` + `assignCategoryMutation` (not a single barcode-specific write) so the inserted item is indistinguishable from a typed item and triggers the household item-memory pipeline.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` completes cleanly with one pre-existing warning about a PWA glob pattern for prerendered HTML. This warning is unrelated to barcode work and was present before this plan.

## User Setup Required

None — the `barcode-lookup` Edge Function was deployed in Plan 04-01. No additional secrets or configuration are needed for this plan.

## Next Phase Readiness

- Task 3 (manual device validation) is the only remaining gate before BARC-01 through BARC-04 are fully closed.
- Once device validation passes, Phase 4 is complete and v2.0 Phase 18 (iOS black screen fix) can proceed independently.
- The lookup mutation and BarcodeLookupSheet are ready to receive product image and brand fields when Phase 20 (product thumbnails) ships.

## Self-Check: PASSED

- Found `src/lib/queries/barcode.ts`
- Found `src/lib/components/barcode/BarcodeLookupSheet.svelte`
- Found `src/lib/barcode/lookup.ts`
- Found `src/routes/(protected)/lister/[id]/+page.svelte`
- Found `tests/barcode.spec.ts`
- Found `tests/helpers/barcode.ts`
- `npm run build` exits cleanly (verified 2026-03-14T19:55Z)

---
*Phase: 04-barcode-scanning*
*Completed: 2026-03-14*
