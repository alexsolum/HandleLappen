# T02: 10-inline-quantity-controls 02

**Slice:** S10 — **Milestone:** M001

## Description

Normalize all current new-item entry paths around a visible default quantity of `1`, then add the focused verification coverage required to prove the Phase 10 behavior on desktop and mobile-sized screens.

Purpose: Satisfy LIST-08 and close the phase with evidence. Typed add and barcode-assisted add must behave the same way today, while future suggestion entry in Phase 11 should inherit the same quantity default automatically.

Output: The add bar uses a visible mini stepper starting at `1`, barcode confirmation persists the same default unless changed, and the targeted E2E suite covers the new quantity behavior.

## Must-Haves

- [ ] "Typed add starts from a visible default quantity of 1 instead of a blank/null quantity state"
- [ ] "Barcode-assisted add also persists quantity 1 unless the user changes it before confirming"
- [ ] "New-item creation paths share one default-quantity rule so future remembered-item entry can inherit it cleanly"
- [ ] "Phase 10 includes focused evidence for both inline quantity interactions and default quantity behavior"

## Files

- `src/lib/components/items/ItemInput.svelte`
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/items.ts`
- `tests/items.spec.ts`
- `tests/barcode.spec.ts`
- `tests/mobile-layout.spec.ts`
