---
phase: 20
plan: "02"
subsystem: barcode-ui
tags: [barcode, product-image, brand, smart-dedup, shimmer, onerror-fallback]
dependency_graph:
  requires: [19-01, 20-01]
  provides: [barcode-scan-confirmation-with-image]
  affects:
    - src/lib/components/barcode/BarcodeLookupSheet.svelte
    - src/routes/(protected)/lister/[id]/+page.svelte
tech_stack:
  added: []
  patterns: [smart-dedup, shimmer-skeleton, onerror-fallback, circular-product-image]
key_files:
  created: []
  modified:
    - src/lib/components/barcode/BarcodeLookupSheet.svelte
    - src/routes/(protected)/lister/[id]/+page.svelte
decisions:
  - "Smart Dedup: brand subtitle hidden when brand.toLowerCase() is a substring of draftName.toLowerCase() — consistent with 20-03 and 20-04 pattern"
  - "onerror fallback uses inline HTML attribute (not Svelte event binding) to catch cross-origin errors before hydration — consistent with 20-04 decision"
  - "imgLoaded/imgError use $state() with reset in $effect on viewState change — avoids stale shimmer from previous scan"
  - "onConfirm extended with brand and imageUrl so scanned products are stored enriched at insert time — consistent with write-at-insert-time v2.0-roadmap decision"
metrics:
  duration: "2 minutes"
  completed: "2026-03-16"
  tasks_completed: 2
  files_modified: 2
---

# Phase 20 Plan 02: Barcode Scan Confirmation Sheet UI Summary

Enhanced BarcodeLookupSheet with circular product image + shimmer, brand subtitle with Smart Dedup, editable brand field, and brand/imageUrl passthrough to addItemMutation on confirm.

## What Was Built

**BarcodeLookupSheet.svelte:**
- Circular 56x56 product image in the sheet header when `viewState === 'found'` and `result.imageUrl` is set
- Shimmer skeleton (animate-pulse gray circle) shown while image loads
- `onerror` inline HTML attribute hides the `<img>` and shows a `[data-fallback]` SVG package icon
- `onload` handler sets `imgLoaded = true` to fade the image in with `transition-opacity`
- `$state` variables `imgLoaded` and `imgError` reset via `$effect` on viewState change
- Brand subtitle displayed below the heading using Smart Dedup (hidden when brand is substring of product name)
- Added editable "Merke" (brand) text input in the confirmation form, pre-filled from `result.brand`
- `onConfirm` callback extended with `brand: string | null` and `imageUrl: string | null`

**lister/[id]/+page.svelte:**
- `handleBarcodeConfirm` signature updated to accept `brand` and `imageUrl`
- `addItemMutation.mutate` now receives `brand` and `imageUrl` so scanned items are stored enriched in `list_items`

## Decisions Made

- Smart Dedup logic: `!name.toLowerCase().includes(brand.toLowerCase())` — substring check consistent with ItemDetailSheet (20-03) and admin items (20-04)
- Inline `onerror` HTML attribute used rather than Svelte event binding — avoids SSR hydration timing issue documented in STATE.md pending todos
- Image state (`imgLoaded`, `imgError`) uses `$state()` and resets in `$effect` watching `viewState` — prevents stale shimmer when scanning multiple items in one session
- `onConfirm` passes `imageUrl` directly from `result.imageUrl` (not from a draft field) — URL is not editable in this sheet, consistent with plan spec

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx svelte-check` passes with zero new errors in the modified files
- All pre-existing errors are in unrelated files (admin/items `isLoading`, item-memory.spec.ts `any` types)
- BarcodeLookupSheet type signature change is backward-compatible — `onConfirm` now includes `brand` and `imageUrl`, caller (lister page) updated simultaneously

## Self-Check: PASSED

- [x] `src/lib/components/barcode/BarcodeLookupSheet.svelte` — FOUND
- [x] `src/routes/(protected)/lister/[id]/+page.svelte` — FOUND
- [x] Commit `d5e3b15` — FOUND (BarcodeLookupSheet)
- [x] Commit `cdea805` — FOUND (lister page)
