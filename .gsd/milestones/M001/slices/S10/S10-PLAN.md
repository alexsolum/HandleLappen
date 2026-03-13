# S10: Inline Quantity Controls

**Goal:** Add inline quantity editing to active shopping-list rows without breaking the current list interaction model.
**Demo:** Add inline quantity editing to active shopping-list rows without breaking the current list interaction model.

## Must-Haves


## Tasks

- [x] **T01: 10-inline-quantity-controls 01** `est:65min`
  - Add inline quantity editing to active shopping-list rows without breaking the current list interaction model. This plan covers the row-level `- quantity +` UI, optimistic quantity updates, and direct remove-at-one behavior.

Purpose: Satisfy LIST-07. The user wants fast quantity changes from the main list, but the list must remain a shopping list first: row tap still checks off, swipe still deletes, and long-press still opens details.

Output: Active rows expose a visible right-side stepper, quantity changes feel immediate, and decrementing from `1` removes the item directly without opening the detail sheet.
- [x] **T02: 10-inline-quantity-controls 02** `est:55min`
  - Normalize all current new-item entry paths around a visible default quantity of `1`, then add the focused verification coverage required to prove the Phase 10 behavior on desktop and mobile-sized screens.

Purpose: Satisfy LIST-08 and close the phase with evidence. Typed add and barcode-assisted add must behave the same way today, while future suggestion entry in Phase 11 should inherit the same quantity default automatically.

Output: The add bar uses a visible mini stepper starting at `1`, barcode confirmation persists the same default unless changed, and the targeted E2E suite covers the new quantity behavior.

## Files Likely Touched

- `src/lib/components/items/ItemRow.svelte`
- `src/lib/components/items/CategorySection.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/items.ts`
- `tests/items.spec.ts`
- `tests/mobile-layout.spec.ts`
- `src/lib/components/items/ItemInput.svelte`
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/items.ts`
- `tests/items.spec.ts`
- `tests/barcode.spec.ts`
- `tests/mobile-layout.spec.ts`
