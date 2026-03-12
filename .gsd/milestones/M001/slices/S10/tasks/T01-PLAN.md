# T01: 10-inline-quantity-controls 01

**Slice:** S10 — **Milestone:** M001

## Description

Add inline quantity editing to active shopping-list rows without breaking the current list interaction model. This plan covers the row-level `- quantity +` UI, optimistic quantity updates, and direct remove-at-one behavior.

Purpose: Satisfy LIST-07. The user wants fast quantity changes from the main list, but the list must remain a shopping list first: row tap still checks off, swipe still deletes, and long-press still opens details.

Output: Active rows expose a visible right-side stepper, quantity changes feel immediate, and decrementing from `1` removes the item directly without opening the detail sheet.

## Must-Haves

- [ ] "Active list rows expose a visible right-side stepper for quantity changes without opening the detail sheet"
- [ ] "Tapping the row body still checks an item off; tapping the stepper does not accidentally toggle completion"
- [ ] "Pressing minus at quantity 1 removes the item directly from the active list"
- [ ] "Inline quantity changes feel immediate and stay aligned with the existing optimistic sync pattern"

## Files

- `src/lib/components/items/ItemRow.svelte`
- `src/lib/components/items/CategorySection.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/items.ts`
- `tests/items.spec.ts`
- `tests/mobile-layout.spec.ts`
