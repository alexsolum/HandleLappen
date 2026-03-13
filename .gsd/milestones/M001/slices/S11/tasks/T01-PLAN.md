# T01: 11-household-item-memory-and-suggestions 01

**Slice:** S11 — **Milestone:** M001

## Description

Create the household-scoped remembered-item data source and query layer that Phase 11 needs for typeahead suggestions and category reuse.

Purpose: satisfy the backend/data side of SUGG-01..03 before the UI is added. The data source must remember prior household items by normalized name, preserve the latest known category, and expose a compact ranked search result for the add bar.

Output: Supabase has a remembered-item source plus a search RPC/query contract, and the app has a focused query helper and seed fixtures that downstream plans can build on.

## Must-Haves

- [ ] "The app has a household-scoped remembered-item source that survives beyond active list rows and stores the latest known category for each normalized item name"
- [ ] "Remembered-item search returns at most five results, narrows from one typed letter onward, and ranks matching household items deterministically"
- [ ] "Phase 11 does not rely on raw client-side scans of household history to drive suggestions"
- [ ] "The remembered-item data contract is reusable by the list page without duplicating search logic in the UI"

## Files

- `supabase/migrations/20260312190000_phase11_household_item_memory.sql`
- `src/lib/queries/remembered-items.ts`
- `src/lib/queries/items.ts`
- `tests/helpers/remembered-items.ts`
- `tests/item-memory.spec.ts`
