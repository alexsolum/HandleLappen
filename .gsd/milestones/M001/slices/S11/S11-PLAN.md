# S11: Household Item Memory And Suggestions

**Goal:** Create the household-scoped remembered-item data source and query layer that Phase 11 needs for typeahead suggestions and category reuse.
**Demo:** Create the household-scoped remembered-item data source and query layer that Phase 11 needs for typeahead suggestions and category reuse.

## Must-Haves


## Tasks

- [x] **T01: 11-household-item-memory-and-suggestions 01** `est:18min`
  - Create the household-scoped remembered-item data source and query layer that Phase 11 needs for typeahead suggestions and category reuse.

Purpose: satisfy the backend/data side of SUGG-01..03 before the UI is added. The data source must remember prior household items by normalized name, preserve the latest known category, and expose a compact ranked search result for the add bar.

Output: Supabase has a remembered-item source plus a search RPC/query contract, and the app has a focused query helper and seed fixtures that downstream plans can build on.
- [x] **T02: 11-household-item-memory-and-suggestions 02** `est:13min`
  - Build the mobile-friendly remembered-suggestion UI into the main add bar and connect it to the list page so recurring items can be added in one tap.

Purpose: satisfy SUGG-01 and SUGG-02 in the real add flow. The feature must feel faster than the existing manual add path while preserving the fixed mobile shell introduced in Phases 9 and 10.

Output: The add field shows a compact household-specific dropdown, the list narrows as the query grows, and tapping a suggestion adds the item immediately.
- [x] **T03: 11-household-item-memory-and-suggestions 03** `est:7min`
  - Finish the remembered-item flow by restoring the most recent category automatically on suggestion selection, handling stale-memory fallback safely, and closing the phase with end-to-end evidence.

Purpose: satisfy SUGG-03 and verify the full recurring-item behavior. The app should feel fast for the common case while still degrading gracefully when remembered category data is missing or no longer valid.

Output: remembered suggestions add directly into the correct category group when possible, fall back to the existing picker when necessary, and have focused evidence across the Phase 11 surface.

## Files Likely Touched

- `supabase/migrations/20260312190000_phase11_household_item_memory.sql`
- `src/lib/queries/remembered-items.ts`
- `src/lib/queries/items.ts`
- `tests/helpers/remembered-items.ts`
- `tests/item-memory.spec.ts`
- `src/lib/components/items/ItemInput.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/remembered-items.ts`
- `tests/item-memory.spec.ts`
- `tests/mobile-layout.spec.ts`
- `src/lib/queries/items.ts`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/components/items/CategoryPickerModal.svelte`
- `tests/item-memory.spec.ts`
- `tests/helpers/remembered-items.ts`
- `tests/mobile-layout.spec.ts`
