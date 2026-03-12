# T03: 11-household-item-memory-and-suggestions 03

**Slice:** S11 — **Milestone:** M001

## Description

Finish the remembered-item flow by restoring the most recent category automatically on suggestion selection, handling stale-memory fallback safely, and closing the phase with end-to-end evidence.

Purpose: satisfy SUGG-03 and verify the full recurring-item behavior. The app should feel fast for the common case while still degrading gracefully when remembered category data is missing or no longer valid.

Output: remembered suggestions add directly into the correct category group when possible, fall back to the existing picker when necessary, and have focused evidence across the Phase 11 surface.

## Must-Haves

- [ ] "Picking a remembered suggestion reuses the most recent valid category for that item name automatically"
- [ ] "Remembered adds bypass the category picker in the normal recurring-item case"
- [ ] "If remembered category data is missing or stale, the app falls back to the existing category-picker flow instead of failing"
- [ ] "Phase 11 closes with end-to-end evidence for suggestion visibility, narrowing, immediate add, and category reuse"

## Files

- `src/lib/queries/items.ts`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/components/items/CategoryPickerModal.svelte`
- `tests/item-memory.spec.ts`
- `tests/helpers/remembered-items.ts`
- `tests/mobile-layout.spec.ts`
