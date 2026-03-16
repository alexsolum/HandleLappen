# Phase 20: Client Image Display — Context

Product images and brand names are visible to the user at every point in the shopping flow where scanned items appear.

## 🎯 Goals
- Show product images and brand names in the scan result sheet, shopping list, Admin Items, and Varekatalog.
- Ensure consistent data persistence between `list_items` and `household_item_memory`.
- Provide a "Clear Image" action in Admin to revert to placeholders.

## 🏗️ Architectural Decisions

### 🖼️ Thumbnail & Placeholder Strategy
- **Dimensions**: 40x40 px (standard) or 48x48 px (large header) fixed-size containers.
- **Rounding**: Circular (`rounded-full`) for all product thumbnails.
- **Scale**: `object-cover` to fill the circular container.
- **Loading State**: Shimmer skeleton while the image is fetching.
- **Fallback**: Lucide-style 'Package' icon (`bg-gray-50`, `text-gray-400`) on `onerror` or if URL is null.
- **Deduplication**: In scan/admin views, hide the brand if it is already a prefix/substring of the product name (Smart Dedup).

### 📍 UI Placement
- **Shopping List**: Thumbnail appears **After Checkbox** (between checkbox and item name). Brand name is **hidden** in the main list to save vertical space.
- **Scan Result Sheet**: Large circular header image at the top. Brand is a small gray subtitle **below** the product name.
- **Admin / Varekatalog**: Circular thumbnail and brand subtitle per row.

### 💾 Data & Admin Logic
- **Persistence**: Write `brand` and `product_image_url` to *both* `list_items` and `household_item_memory` at confirm/insert time.
- **Admin Override**: In `admin/items`, provide a manual override for `brand` and `product_image_url` (paste link).
- **Clear Action**: "Clear image" button in Admin sets `product_image_url` to `NULL` in the database.

## 🛠️ Code Context

### Key Files
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`: Large circular header image + brand subtitle.
- `src/lib/components/items/ItemRow.svelte`: Circular thumbnail after checkbox.
- `src/routes/(protected)/admin/items/+page.svelte`: Display and edit brand/image URL.
- `src/lib/queries/item-memory-admin.ts`: Update types and mutations for brand/image URL.
- `src/lib/barcode/lookup.ts`: `BarcodeSheetModel` already contains these fields.

### Integration Points
- `addItemMutation` / `confirmBarcodeAdd`: Must pass `brand` and `product_image_url` to the database.
- `household_item_memory`: The `ItemMemoryEntry` type must be updated to include `brand` and `product_image_url`.

## 🧪 Verification Plan
- **Visual Check**: Scan a product from Kassal (e.g., Pepsi Max) and verify image/brand in confirmation sheet.
- **Persistence Check**: Add scanned product to list and verify columns in `list_items` and `household_item_memory` via Supabase SQL.
- **List Display**: Verify circular thumbnail appears in the shopping list.
- **Admin Test**: Manually clear/update an image URL in the Varekatalog and verify the UI updates.
- **Error Fallback**: Test with a broken image URL to ensure shimmer -> package icon transition works.
