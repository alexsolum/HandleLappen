# S09: Mobile Layout Hardening

**Goal:** Create the shared mobile layout contract for Phase 9 by hardening the protected shell and normalizing all existing bottom-sheet dialogs.
**Demo:** Create the shared mobile layout contract for Phase 9 by hardening the protected shell and normalizing all existing bottom-sheet dialogs.

## Must-Haves


## Tasks

- [x] **T01: 09-mobile-layout-hardening 01** `est:55min`
  - Create the shared mobile layout contract for Phase 9 by hardening the protected shell and normalizing all existing bottom-sheet dialogs. This plan handles the viewport-width and horizontal-overflow side of the phase before the bottom dock itself is redesigned.

Purpose: Satisfy MOBL-01 and the shell-level part of MOBL-02. Without a common sheet/layout contract, later dock work would still sit on top of unstable mobile UI.

Output: The protected shell clips horizontal overflow safely, and every existing sheet component uses the same inset, capped, internal-scroll mobile pattern with visible actions.
- [x] **T02: 09-mobile-layout-hardening 02** `est:35min`
  - Turn the current fixed bottom nav into a true mobile dock with icons, larger touch targets, and safe-area-aware spacing, then restack the add-item bar and shell spacing around the final dock height.

Purpose: This plan finishes MOBL-03 and the bottom-stack part of MOBL-02. It should only run after the shell/sheet contract from 09-01 is stable.

Output: A pinned icon dock, updated bottom input positioning, and a protected shell whose fixed layers no longer collide or create layout drift on mobile.
- [x] **T03: 09-mobile-layout-hardening 03** `est:40min`
  - Add Phase 9 verification coverage after the sheet and dock changes land. This plan creates the mobile-focused automated test file, adjusts existing tests if selectors changed, and makes the manual-only checks explicit for real devices.

Purpose: Close the phase with evidence, not only UI changes. This plan is the automated and manual verification layer for MOBL-01..03.

Output: Dedicated mobile layout Playwright coverage and updated existing tests where the dock/sheet refactor changed selectors or structure.

## Files Likely Touched

- `src/routes/(protected)/+layout.svelte`
- `src/lib/components/items/ItemDetailSheet.svelte`
- `src/lib/components/items/CategoryPickerModal.svelte`
- `src/lib/components/barcode/BarcodeScannerSheet.svelte`
- `src/lib/components/barcode/ManualEanEntrySheet.svelte`
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`
- `src/lib/components/lists/BottomNav.svelte`
- `src/lib/components/items/ItemInput.svelte`
- `src/routes/(protected)/+layout.svelte`
- `tests/mobile-layout.spec.ts`
- `tests/barcode.spec.ts`
- `tests/categories.spec.ts`
