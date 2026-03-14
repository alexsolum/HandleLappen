# Quick Task 3: Add item administration in the Admin→Items section. Rename items to "Varekatalog" - Summary

## Outcome

- Delivered the Varekatalog link in the Admin hub and built the `/admin/items` experience so households can rename and recategorize remembered items.

## What changed

- Turned the Admin hub stub into a real “Varekatalog” link and updated the admin spec to expect the new text/href.
- Added `src/lib/queries/item-memory-admin.ts` with `createItemMemoryQuery` and `createUpdateItemMemoryMutation` to read and rename `household_item_memory`.
- Implemented `src/routes/(protected)/admin/items/+page.svelte` with inline edit controls, category dropdown, last-used metadata, and feedback for loading/errors.

## Verification

- `npm run check` (fails: existing type complaints in `src/lib/barcode/scanner.ts`, `BarcodeScannerSheet.svelte`, and other pre-existing files unrelated to this quick task).

## Implementation commit

- `HEAD` — `docs(quick-3): Add Varekatalog administration`
