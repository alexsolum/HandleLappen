# T01: 09-mobile-layout-hardening 01

**Slice:** S09 — **Milestone:** M001

## Description

Create the shared mobile layout contract for Phase 9 by hardening the protected shell and normalizing all existing bottom-sheet dialogs. This plan handles the viewport-width and horizontal-overflow side of the phase before the bottom dock itself is redesigned.

Purpose: Satisfy MOBL-01 and the shell-level part of MOBL-02. Without a common sheet/layout contract, later dock work would still sit on top of unstable mobile UI.

Output: The protected shell clips horizontal overflow safely, and every existing sheet component uses the same inset, capped, internal-scroll mobile pattern with visible actions.

## Must-Haves

- [ ] "All Phase 9 bottom sheets use one mobile-safe shell pattern instead of drifting class-by-class"
- [ ] "Sheets are inset from the screen edges, capped in height, and do not render content past the viewport width"
- [ ] "Long sheet content scrolls internally while the action area remains visible"
- [ ] "The signed-in shell prevents accidental horizontal scrolling on mobile viewports"

## Files

- `src/routes/(protected)/+layout.svelte`
- `src/lib/components/items/ItemDetailSheet.svelte`
- `src/lib/components/items/CategoryPickerModal.svelte`
- `src/lib/components/barcode/BarcodeScannerSheet.svelte`
- `src/lib/components/barcode/ManualEanEntrySheet.svelte`
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`
