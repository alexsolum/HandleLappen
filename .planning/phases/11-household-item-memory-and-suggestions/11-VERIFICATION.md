# Phase 11: Household Item Memory and Suggestions - Verification

**Verified:** 2026-03-12  
**Verdict:** PASS

## Goal Check

Phase 11 promised that recurring household items would become faster to re-add through remembered suggestions, and that remembered category choices would be reused safely.

That is now true in the shipped code:
1. The add bar shows household-scoped remembered suggestions from the first typed letter onward.
2. Suggestions narrow deterministically and stay contained inside the fixed mobile add bar.
3. Selecting a remembered suggestion adds immediately with quantity `1`, reuses the latest valid category, and falls back to the picker when remembered category data is stale.

## Requirement Coverage

### SUGG-01
- The remembered-item source is implemented in `supabase/migrations/20260312190000_phase11_household_item_memory.sql` as `household_item_memory` plus `search_household_item_memory`.
- The app query surface is implemented in `src/lib/queries/remembered-items-core.ts` and `src/lib/queries/remembered-items.ts`.
- The list page owns live remembered lookup state in `src/routes/(protected)/lister/[id]/+page.svelte`.
- Evidence:
  - `tests/item-memory.spec.ts` verifies household isolation, first-letter search, and inline suggestion visibility.

### SUGG-02
- Search ranking and narrowing are handled by the SQL RPC ordering rules and the page-driven live query flow.
- The dropdown caps visible results, scrolls internally, and stays inside the add-bar shell in `src/lib/components/items/ItemInput.svelte`.
- Evidence:
  - `tests/item-memory.spec.ts` verifies narrowing as the query becomes more specific.
  - `tests/mobile-layout.spec.ts` verifies the dropdown remains contained on a phone viewport without horizontal overflow.

### SUGG-03
- Remembered adds validate category ids against the current household category set before reuse in `src/routes/(protected)/lister/[id]/+page.svelte`.
- Trigger-backed memory refresh in `supabase/migrations/20260312190000_phase11_household_item_memory.sql` keeps remembered category memory aligned with list-item category changes.
- Evidence:
  - `tests/item-memory.spec.ts` verifies immediate add, latest-category wins, default quantity `1`, picker bypass on the normal path, and stale-category fallback to the existing picker.

## Verification Runs

- `npx playwright test tests/item-memory.spec.ts --workers=1`
- `npx playwright test tests/item-memory.spec.ts tests/mobile-layout.spec.ts --workers=1`

Result: `10 passed`

## Residual Risk

- A real-device phone pass is still worthwhile for keyboard ergonomics and tap comfort inside the fixed add bar, but the core layout and behavior regressions are now covered in Playwright.
- The full project `npm run check` command still reports unrelated pre-existing TypeScript issues outside Phase 11, mainly in barcode and store-layout files; those did not block the Phase 11 verification set.

## Conclusion

Phase 11 achieves its goal and is ready for roadmap completion and milestone closeout.
