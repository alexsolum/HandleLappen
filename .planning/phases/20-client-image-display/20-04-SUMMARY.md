---
phase: 20
plan: "04"
subsystem: admin-ui
tags: [admin, varekatalog, product-images, brand, thumbnails]
dependency_graph:
  requires: [20-01]
  provides: [admin-varekatalog-image-brand-edit]
  affects: [src/routes/(protected)/admin/items/+page.svelte]
tech_stack:
  added: []
  patterns: [smart-dedup, onerror-fallback, live-preview]
key_files:
  created: []
  modified:
    - src/routes/(protected)/admin/items/+page.svelte
decisions:
  - "Smart Dedup: brand subtitle hidden when brand text is a case-insensitive substring of the product name — avoids redundant text like 'Pepsi / Pepsi Max'"
  - "onerror fallback for thumbnails uses inline HTML attribute (not Svelte event binding) to ensure cross-origin image errors are caught before hydration"
  - "Live preview uses the same onerror=parentElement.style.display=none pattern as thumbnail to handle invalid/broken URLs gracefully"
  - "Clear image button only renders when editingImageUrl is non-empty — avoids dead UI real estate"
metrics:
  duration: "2 minutes"
  completed: "2026-03-16"
  tasks_completed: 1
  files_modified: 1
---

# Phase 20 Plan 04: Admin Varekatalog Enhancement Summary

Enhanced the Admin Varekatalog view to show circular product thumbnails and brand subtitles per row, with full brand/image URL editing and a live preview in the edit form.

## What Was Built

**Varekatalog list view:**
- Each item row now shows a 40x40 circular product thumbnail before the item name
- Package icon placeholder shown when `product_image_url` is null or the image errors
- Brand subtitle displayed below the item name (Smart Dedup: hidden when brand is a substring of the product name)
- Existing category + use count row preserved

**Varekatalog edit form:**
- Added "Merke" (brand) text input field
- Added "Bilde-URL" (image URL) input field with live 48x48 circular preview as the user types
- "Tøm bilde" (Clear image) button appears only when URL is non-empty; sets URL to `''` which saves as `null`
- Live preview auto-hides parent container via `onerror` when the URL is broken/invalid
- Category picker order unchanged (name → brand → image URL → category)

## Decisions Made

- Smart Dedup uses `productName.toLowerCase().includes(brandText.toLowerCase())` — substring match so "Pepsi Max" hides "Pepsi" brand, matching the CONTEXT.md spec
- `onerror` uses inline HTML attribute (`onerror="this.style.display='none';..."`) consistent with the STATE.md pending todo about Svelte 5 `onerror` event timing with SSR hydration
- Clear image sets `editingImageUrl = ''` which the save handler converts to `null` for the DB — three-value semantics preserved

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx svelte-check` passes with zero new errors in `admin/items/+page.svelte`
- All 18 pre-existing errors are in unrelated files (lister, item-memory.spec.ts)
- Mutation layer already supports `brand` and `imageUrl` fields (implemented in plan 20-01)

## Self-Check: PASSED

- [x] `src/routes/(protected)/admin/items/+page.svelte` — FOUND
- [x] Commit `624421e` — FOUND
- [x] Zero new type errors in admin/items page
