# Phase 20: Client Image Display — Research

## 🔎 Overview
Phase 20 focuses on displaying product images and brand names fetched in Phase 19. This requires UI updates across the shopping list, scan confirmation sheet, and Admin Varekatalog, as well as database function updates to ensure brand and image data persists correctly to `household_item_memory`.

## 🏗️ Findings

### 1. Database Persistence
- `household_item_memory` is synchronized from `list_items` via the `sync_household_item_memory()` trigger function.
- `sync_household_item_memory()` calls `upsert_household_item_memory()`.
- Both functions need to be updated to handle `brand` and `product_image_url` columns added in Phase 17.
- **Decision**: Use `COALESCE(excluded.brand, memory.brand)` in the UPSERT to avoid wiping existing data if a new insert is missing the brand (though Phase 19 ensures it's usually present for barcodes).

### 2. Shopping List UI (`ItemRow.svelte`)
- Thumbnails should be 40x40 px, circular (`rounded-full`), and use `object-cover`.
- Placement: After the checkbox, before the name.
- No brand display in the main list (to save space).

### 3. Scan Confirmation (`BarcodeLookupSheet.svelte`)
- Display a large circular header image (48x48 or larger).
- Show brand as a gray subtitle below the product name.
- **Logic**: Hide brand if it is already a prefix/substring of the name to avoid redundancy (e.g., "Tine" in "Tine Melk").

### 4. Admin Varekatalog (`admin/items/+page.svelte`)
- Show thumbnail and brand subtitle for each item.
- Allow manual editing of brand and image URL.
- Implement "Clear image" button that sets `product_image_url` to NULL.

### 5. Technical Details
- **Icons**: No Lucide/Heroicons package installed; using inline SVGs. A 'Package' icon is needed for the placeholder.
- **Loading**: Use Svelte 5 `$state` to track image loading and show a shimmer skeleton.
- **Error Fallback**: Use `onerror` to swap a broken image with the 'Package' icon.

## 🚧 Integration Points
- `src/lib/queries/items.ts`: Update `AddItemVariables` and `Item` types; update `createAddItemMutation` and `createAddOrIncrementItemMutation`.
- `src/lib/queries/item-memory-admin.ts`: Update `ItemMemoryEntry` and `UpdateItemMemoryVariables`.
- `src/routes/(protected)/lister/[id]/+page.svelte`: Update `handleBarcodeConfirm` and `Item` type.
- `src/lib/components/items/ItemRow.svelte`: Add `product_image_url` to props.
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`: Add image/brand display logic.
- `src/routes/(protected)/admin/items/+page.svelte`: Update edit form and display rows.

## 🛠️ Proposed Migration
A new migration `20260316000000_phase20_sync_enrichment.sql` is needed to update:
- `public.upsert_household_item_memory`
- `public.sync_household_item_memory`
- `public.search_household_item_memory` (to include brand/image in results)
