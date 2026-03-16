---
phase: 20
plan: "03"
subsystem: shopping-list-ui
tags: [shopping-list, thumbnails, product-images, brand, item-detail, smart-dedup]
dependency_graph:
  requires: [20-01]
  provides: [item-row-thumbnails, item-detail-image-brand]
  affects:
    - src/lib/components/items/ItemRow.svelte
    - src/lib/components/items/ItemDetailSheet.svelte
    - src/lib/components/items/CategorySection.svelte
    - src/lib/queries/items.ts
    - src/routes/(protected)/lister/[id]/+page.svelte
tech_stack:
  added: []
  patterns: [shimmer-skeleton, onerror-fallback, smart-dedup, circular-thumbnail]
key_files:
  created: []
  modified:
    - src/lib/components/items/ItemRow.svelte
    - src/lib/components/items/ItemDetailSheet.svelte
    - src/lib/components/items/CategorySection.svelte
    - src/lib/queries/items.ts
    - src/routes/(protected)/lister/[id]/+page.svelte
decisions:
  - "ItemRow uses Svelte $state(imgLoaded/imgError) + $effect to reset on item change — avoids stale shimmer from previous item"
  - "onerror uses Svelte event binding (not inline HTML attribute) since ItemRow is fully client-rendered with no SSR cross-origin concern"
  - "Smart Dedup in ItemDetailSheet: brand subtitle hidden when brand.toLowerCase() is a substring of name.toLowerCase() — consistent with Phase 20-04 admin pattern"
  - "UpdateItemMutation extended with optional brand field using patch object — avoids sending undefined to Supabase update; brand=undefined means keep existing value"
  - "CategorySection.Item type extended with category_id (required) and product_image_url (optional) to satisfy lister page type compatibility"
metrics:
  duration: "4 minutes"
  completed: "2026-03-16"
  tasks_completed: 2
  files_modified: 5
---

# Phase 20 Plan 03: Shopping List Item Row Enhancement Summary

Circular 40x40 product thumbnails with shimmer loading and package-icon fallback added to shopping list item rows; ItemDetailSheet enhanced with 48x48 product image, brand subtitle with Smart Dedup, and editable brand field.

## What Was Built

**ItemRow.svelte (shopping list):**
- `product_image_url` added to item prop interface
- 40x40 circular thumbnail inserted between checkbox and item name
- Shimmer skeleton (`animate-pulse rounded-full bg-gray-200`) shown while image loads
- Package SVG icon fallback shown when `product_image_url` is null or image errors
- `imgLoaded`/`imgError` state pair with `$effect` reset when item URL changes
- Brand is hidden in the main list (not displayed) to save space per spec

**CategorySection.svelte:**
- `Item` type extended with `category_id: string | null` (required) and `product_image_url?: string | null`
- Type passes through to `ItemRow` without structural incompatibility

**ItemDetailSheet.svelte (item edit dialog):**
- Item prop type extended with `brand` and `product_image_url`
- 48x48 circular product image displayed in sheet header alongside "Rediger vare" title
- Brand subtitle shown below title with Smart Dedup (hidden when brand is substring of name)
- "Merke" (brand) editable text field added to the form
- `onSave` callback signature extended with `brand: string | null` parameter
- `draftBrand` initialized from `item.brand` on open, saved as `null` if empty string

**items.ts query layer:**
- `UpdateItemVariables` extended with `brand?: string | null`
- `createUpdateItemMutation` builds a patch object that only includes `brand` when it is not `undefined` — preserves existing brand when not editing via other paths

**lister/[id]/+page.svelte:**
- Local `Item` type extended with `brand` and `product_image_url`
- `handleDetailSave` signature updated to accept and forward `brand` to `updateItemMutation`

## Decisions Made

- Svelte `$state` + `$effect` approach for image load tracking (vs inline onerror HTML) — component is client-rendered so Svelte reactivity works without SSR hydration concerns
- Smart Dedup uses case-insensitive substring check matching the Phase 20-04 admin pattern for consistency
- `brand=undefined` in `UpdateItemVariables` means "leave unchanged" — mutation only writes brand to DB when explicitly passed
- Shimmer and fallback both use `rounded-full` to maintain circular containment at all loading states

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] CategorySection.Item type missing category_id**
- **Found during:** Task 1 — after updating CategorySection Item type to add product_image_url
- **Issue:** CategorySection.Item type was missing `category_id` field, causing type mismatch with lister page's local Item type in onIncrement/onDecrement/onLongPress callbacks
- **Fix:** Added `category_id: string | null` to CategorySection.Item type
- **Files modified:** `src/lib/components/items/CategorySection.svelte`
- **Commit:** ab56aaa

## Verification

- `npx svelte-check` passes with 15 errors, all pre-existing in unrelated files (BarcodeScannerSheet, admin/butikker, admin/items, item-memory.spec.ts)
- Zero new errors introduced by this plan's changes
- Error count reduced from 18 (pre-plan) to 15 (CategorySection type fix resolved the lister type mismatch)

## Self-Check: PASSED

- [x] `src/lib/components/items/ItemRow.svelte` — FOUND
- [x] `src/lib/components/items/ItemDetailSheet.svelte` — FOUND
- [x] `src/lib/components/items/CategorySection.svelte` — FOUND
- [x] `src/lib/queries/items.ts` — FOUND
- [x] `src/routes/(protected)/lister/[id]/+page.svelte` — FOUND
- [x] Commit `ab56aaa` (Task 1) — FOUND
- [x] Commit `f9f6981` (Task 2) — FOUND
