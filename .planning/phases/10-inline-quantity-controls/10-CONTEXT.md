# Phase 10: Inline Quantity Controls - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Make quantity editing fast directly from the main shopping list and normalize all new-item creation paths so quantity starts at `1` unless the user explicitly changes it. This phase is about inline quantity interaction and add-flow defaults only; remembered household suggestions remain Phase 11.

</domain>

<decisions>
## Implementation Decisions

### Inline row quantity controls
- Active list items should always show a compact right-side stepper in the row itself
- The stepper should use a `- 1 +` style control rather than hidden or expandable quantity editing
- The row body should keep its current tap-to-check-off behavior; the quantity stepper is a separate interaction area
- This phase should prioritize one-tap quantity adjustment over the cleanest possible row density

### Default quantity in the add bar
- The add bar should visibly show quantity `1` by default instead of leaving quantity blank
- The visible quantity control in the add bar should be a mini stepper, not a plain number field
- Users should be able to adjust quantity before adding, but the common path should feel like "add 1 quickly"
- Default quantity `1` applies to newly added items unless the user changes it first

### Decrement behavior
- Pressing `-` when quantity is `1` should remove the item directly from the main list
- Removal through the inline stepper should be a fast path, not a confirmed multi-step flow
- Users should not need to open the detail sheet or use swipe-to-delete just to go from `1` to removed

### Claude's Discretion
- Exact visual styling and spacing of the stepper controls
- Whether steppers use icons, text glyphs, or a mixed treatment as long as the control reads clearly on mobile
- Animation and pressed-state treatment for quantity changes
- Exact breakpoint behavior for fitting the item name, check-off affordance, and right-side stepper on narrow rows

</decisions>

<specifics>
## Specific Ideas

- The row should keep behaving like a shopping list first: tap the row to check off, use the right-side stepper to change quantity
- The add bar should feel faster than the current text input plus empty quantity field by making `1` the obvious default state
- Inline decrement from `1` to removal should feel like the quickest way to undo over-adding without opening details

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/items/ItemRow.svelte`: current active-row component already owns row tap, swipe delete, and long-press behavior; this is the main integration point for inline steppers
- `src/lib/components/items/CategorySection.svelte`: renders grouped active rows and passes row handlers through; likely place to thread quantity callbacks into rows
- `src/lib/components/items/ItemInput.svelte`: current add bar already has separate name and quantity inputs plus barcode entry hooks; this is where the visible default `1` control needs to replace the empty quantity field
- `src/lib/components/items/ItemDetailSheet.svelte`: existing fallback edit path for full item editing; Phase 10 should complement it, not replace it
- `src/lib/queries/items.ts`: already has add, update, check-off, delete, and add-or-increment mutations; quantity updates should stay aligned with these query invalidation and optimistic-update patterns
- `src/routes/(protected)/lister/[id]/+page.svelte`: central orchestration point for active items, add flow, detail sheet, and grouped list rendering

### Established Patterns
- Active item rows already use the row body as the fast check-off action and long-press for details
- Quantity is currently displayed inline in row text (`name · quantity`) and edited either through the add bar field or the detail sheet
- The add flow currently treats blank quantity as `null`; Phase 10 needs to normalize that behavior to a visible `1`
- Mobile-first fixed-bottom input from Phase 9 is already in place, so any add-bar quantity control must fit the new dock-safe layout without reintroducing overflow

### Integration Points
- `handleAdd` in `src/routes/(protected)/lister/[id]/+page.svelte` currently receives `name` and `quantity`; the planner will need to preserve that contract or intentionally reshape it across the list page and `ItemInput`
- `createUpdateItemMutation` in `src/lib/queries/items.ts` is the natural path for inline quantity changes on existing items
- `createDeleteItemMutation` already supports direct removal, which can back the `-` at `1` behavior if the planner chooses that path
- Barcode-assisted add and future remembered-item add flows also create list items, so default quantity `1` decisions here should become the base pattern those flows follow later

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-inline-quantity-controls*
*Context gathered: 2026-03-12*
