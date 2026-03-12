# Phase 11: Household Item Memory and Suggestions - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add household-specific remembered-item suggestions to the main add flow so recurring grocery items are faster to re-add, and reuse a remembered category automatically when a suggestion is chosen. This phase covers memory-backed typeahead and category reuse only; it does not add broader recommendation surfaces, ML ranking, or new shopping-history features.

</domain>

<decisions>
## Implementation Decisions

### Suggestion surface
- Suggestions should appear as an inline dropdown directly under the add field
- The dropdown should be part of the existing add flow, not a bottom sheet or separate picker
- Suggestions should appear after the first typed letter
- Show up to 5 suggestions at once in the dropdown so it remains mobile-friendly

### Selection behavior
- Tapping a remembered suggestion should add the item immediately
- Suggestion selection should not require an extra confirm or review step
- The suggestion interaction should feel like a fast-add shortcut for recurring items, not a form-fill helper first

### Ranking and narrowing
- Suggestions should narrow as more letters are typed
- When multiple matches exist, ranking should prioritize the most frequently used household items
- Text match still matters to filtering, but the household’s frequent items should win among matching results

### Remembered category behavior
- Picking a remembered suggestion should automatically reuse the last known category for that item name
- If the same item name has been used with different categories over time, reuse the most recent category
- Category reuse should happen silently on immediate add; the user should not be re-prompted in the normal recurring-item case

### Claude's Discretion
- Exact matching strategy beyond the user-visible rules, such as prefix vs substring balancing
- Empty-state copy for the dropdown when nothing matches
- Keyboard highlight treatment and exact focus behavior for the dropdown
- Exact visual styling, spacing, and iconography for the suggestion rows

</decisions>

<specifics>
## Specific Ideas

- The add flow should feel faster for the common weekly grocery loop where the same items are added repeatedly
- The inline dropdown should stay compact enough that it does not overwhelm the fixed mobile add area introduced in earlier phases
- This phase should behave like “start typing, tap a known item, it’s added with the right category” rather than a slower autocomplete form

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/items/ItemInput.svelte`: this is the primary integration point for the inline dropdown because it already owns the add-field UI and the fixed mobile add bar
- `src/routes/(protected)/lister/[id]/+page.svelte`: orchestrates the typed add flow, barcode add flow, category assignment fallback, and can become the connection point between suggestion selection and list insertion
- `src/lib/queries/items.ts`: already owns add-item behavior and now has the default-quantity contract established in Phase 10; Phase 11 should build on that instead of creating a parallel add path
- `src/lib/components/items/CategoryPickerModal.svelte`: existing fallback category picker for uncategorized items; suggestion-based remembered category should bypass this in the normal recurring-item case
- `src/lib/queries/history.ts` and recommendation queries: prior history/recommendation work may provide useful patterns for household-scoped historical lookup, even though this phase is not adding another recommendation surface

### Established Patterns
- Phase 10 established that typed and barcode-assisted adds share a visible default quantity of `1`; remembered suggestions should inherit that same default automatically
- The add flow is mobile-first and fixed to the bottom of the screen, so the suggestion dropdown must fit comfortably within the existing Phase 9/10 shell without introducing overflow
- Household scoping and historical data already exist in the product; suggestion memory should stay household-specific and not introduce cross-household leakage
- The app already treats the main add bar as the primary entry point, so suggestions should strengthen that flow rather than create a competing entry pattern

### Integration Points
- `ItemInput.svelte` will need a suggestion data source and a way to notify the list page when a remembered item is chosen for immediate add
- `lister/[id]/+page.svelte` currently handles category assignment after normal typed add; suggestion-based remembered adds should attach the remembered category before that fallback path runs
- Historical source data can come from prior list additions or check-off history, but the planner should keep the source aligned with household-scoped data that already exists in Supabase
- Phase 11 should leave the Phase 10 row steppers and add-bar quantity semantics intact while inserting a faster recurring-item path above them

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-household-item-memory-and-suggestions*
*Context gathered: 2026-03-12*
