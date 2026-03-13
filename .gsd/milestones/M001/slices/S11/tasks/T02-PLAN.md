# T02: 11-household-item-memory-and-suggestions 02

**Slice:** S11 — **Milestone:** M001

## Description

Build the mobile-friendly remembered-suggestion UI into the main add bar and connect it to the list page so recurring items can be added in one tap.

Purpose: satisfy SUGG-01 and SUGG-02 in the real add flow. The feature must feel faster than the existing manual add path while preserving the fixed mobile shell introduced in Phases 9 and 10.

Output: The add field shows a compact household-specific dropdown, the list narrows as the query grows, and tapping a suggestion adds the item immediately.

## Must-Haves

- [ ] "Typing into the main add field shows household-specific suggestions directly under the field from the first typed letter onward"
- [ ] "The suggestion list narrows as the query becomes more specific and never exceeds five visible rows"
- [ ] "The inline dropdown fits inside the fixed mobile add-bar shell without reintroducing horizontal overflow or layout drift"
- [ ] "Selecting a suggestion behaves like a fast-add action, not a two-step form fill"

## Files

- `src/lib/components/items/ItemInput.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `src/lib/queries/remembered-items.ts`
- `tests/item-memory.spec.ts`
- `tests/mobile-layout.spec.ts`
