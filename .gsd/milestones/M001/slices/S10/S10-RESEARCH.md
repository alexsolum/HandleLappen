# Phase 10: Inline Quantity Controls - Research

**Date:** 2026-03-12
**Status:** Ready for planning

## What Already Exists

- `src/lib/components/items/ItemRow.svelte` already owns the active-row interaction stack:
  - row tap checks the item off
  - swipe-left reveals delete
  - long-press opens details
  - quantity is currently display-only text appended to the item name
- `src/lib/components/items/CategorySection.svelte` is the narrow pass-through layer that renders grouped active rows and can thread quantity callbacks into each `ItemRow`.
- `src/lib/components/items/ItemInput.svelte` is already the fixed bottom add bar and currently accepts free-text quantity, with blank mapping to `null`.
- `src/lib/components/barcode/BarcodeLookupSheet.svelte` already defaults its draft quantity to `1`, but still passes `number | null` through to the shared add flow.
- `src/lib/queries/items.ts` already has the necessary mutation primitives:
  - `createUpdateItemMutation` for optimistic quantity changes
  - `createDeleteItemMutation` for fast remove-at-one behavior
  - `createAddItemMutation` for typed adds
  - `createAddOrIncrementItemMutation` used elsewhere as prior art for quantity increment semantics
- `src/routes/(protected)/lister/[id]/+page.svelte` centralizes all list actions, so Phase 10 can stay mostly within the list UI and item query layer.

## Key Implementation Findings

### 1. Inline steppers can be added without replacing the row interaction model

The row body already has the desired core behavior: tap to check off, swipe to delete, long-press for details. The safest path is to keep those behaviors intact and add a separate right-side quantity control inside `ItemRow`.

Planning implication:
- The stepper controls need their own event boundary so presses do not bubble into row check-off
- Pointer movement used for swipe and long-press must not be triggered by the stepper buttons
- The stepper should live outside the text span and remain visible on narrow mobile rows

Recommended direction:
- Keep row body as the check-off target
- Put a compact right-aligned stepper group inside `ItemRow`
- Stop propagation on stepper pointer/click handlers so the row body does not toggle

### 2. Quantity updates should stay optimistic and reuse the existing item update mutation

`createUpdateItemMutation` already performs optimistic list cache updates and invalidates the item query on settle. Phase 10 does not need a new quantity-specific server primitive unless the planner wants cleaner ergonomics around `id + quantity`.

Planning implication:
- Inline plus/minus should likely delegate to a focused quantity mutation wrapper built on top of `createUpdateItemMutation`
- The wrapper should derive the next quantity from current row state and preserve existing optimistic behavior
- Remove-at-one can either:
  - call delete directly when quantity is `1`, or
  - share a quantity mutation that branches to delete

Recommended direction:
- Create a dedicated inline quantity action path in the list page or queries layer, but keep it backed by the existing optimistic mutation pattern

### 3. Done items should stay out of scope for inline steppers

Only active rows currently render through `CategorySection` and `ItemRow`; checked items are shown through `DoneSection.svelte` as simpler summary rows. The user decisions also focus on shopping-time quantity control, not editing completed items.

Planning implication:
- Keep inline steppers on active items only
- Done rows can continue as read-only summaries in this phase

### 4. Default quantity `1` should be normalized at the shared add boundaries, not only in the add-bar UI

Today the typed add path uses `ItemInput.svelte`, where blank quantity becomes `null`. Barcode already visually defaults to `1`, but still sends through a nullable quantity contract. If Phase 10 only changes the visible add bar, the behavior will drift again when other add paths are touched.

Planning implication:
- Normalize new-item creation around an explicit default quantity of `1`
- Typed add flow and barcode confirm flow should both converge on the same rule
- Future suggestion flow in Phase 11 should inherit the same shared default by using the same creation helper or wrapper

Recommended direction:
- Phase 10 should update `ItemInput`, barcode confirm handling, and the shared item creation path together
- The planner should avoid a UI-only fix that leaves `null` quantity semantics alive underneath

### 5. Barcode flow is the only current non-typed add path that must be covered now

The roadmap success criteria mention typed, suggested, and barcode-assisted adds defaulting to `1`, but suggestion UI is still Phase 11. That means Phase 10 should not implement suggestion behavior yet; it should instead establish the shared quantity-default contract that future suggestion entry will use automatically.

Planning implication:
- Typed add and barcode-assisted add are mandatory in this phase
- Suggested add should be treated as future-proofing, not new scope

## Risks and Constraints

### Interaction collision risk

The biggest product risk is accidental check-off while tapping the stepper. This is more important than the database work because the row currently treats most of its surface as one action target.

Mitigation:
- Use explicit event isolation on the stepper container/buttons
- Add E2E coverage that proves increment/decrement do not move the item into `Handlet`

### Mobile density risk

Phase 9 already tightened the mobile list shell. Phase 10 must fit a visible stepper into each row without reintroducing overflow or pushing labels off-screen in a brittle way.

Mitigation:
- Keep the stepper compact and right-aligned
- Let the row text remain truncatable/wrappable as needed, but do not hide the stepper behind interaction
- Reuse Phase 9 mobile layout tests or add adjacent assertions for narrow viewports

### Behavior drift risk

If typed add, barcode add, and future remembered-item add each decide quantity defaults separately, the app will regress quickly.

Mitigation:
- Centralize the "new item defaults to 1" rule in a shared mutation contract or shared call site behavior

## Testing and Wave 0 Guidance

Existing Playwright infrastructure is already present. Phase 10 does not need a new test framework, but it does need focused coverage added before or alongside implementation.

Recommended coverage:

1. Inline quantity increase on an active row
- Assert `+` updates the rendered quantity immediately
- Assert item stays active and is not checked off

2. Inline quantity decrease above `1`
- Start with quantity `3`
- Press `-`
- Assert quantity becomes `2`

3. Inline `-` at quantity `1` removes the item
- Add item with quantity `1`
- Press `-`
- Assert row disappears from active list

4. Row tap still checks off independently of the stepper
- Tap row body, not the stepper
- Assert item moves to `Handlet`

5. Typed add defaults to `1`
- Add by pressing Enter and by clicking `Legg til`
- Assert the new row renders with quantity `1`

6. Barcode-assisted add preserves visible default `1`
- Open barcode lookup confirmation
- Assert quantity field/control starts at `1`
- Confirm add and assert resulting list row shows quantity `1`

7. Mobile regression coverage
- Either extend `tests/mobile-layout.spec.ts` or add a Phase 10 spec to confirm the new row stepper does not create horizontal overflow on phone-sized viewports

## Recommended Plan Split

Phase 10 still fits naturally into the two roadmap plans:

- `10-01`: Row-level inline steppers plus optimistic quantity/remove behavior on active items
- `10-02`: Normalize default quantity `1` across typed add and barcode-assisted add, then add verification coverage

That split keeps interaction risk and add-flow normalization separate while preserving the roadmap shape.

## Validation Architecture

### Test framework and commands

- Framework: Playwright end-to-end tests, plus existing `npm run check` baseline
- Quick targeted runs:
  - `npx playwright test tests/items.spec.ts --workers=1`
  - `npx playwright test tests/barcode.spec.ts --workers=1`
  - `npx playwright test tests/mobile-layout.spec.ts --workers=1`
- Full suite:
  - `npm run test:e2e`

### Sampling plan

- After row-stepper task commits: run targeted `items` coverage
- After add-flow normalization commits: run targeted `items` + `barcode` coverage
- After mobile fit adjustments: run targeted mobile layout coverage
- Before phase verification: run the full E2E suite, noting the existing local category-seed drift if still unresolved

### Wave 0 needs

- No new framework install is needed
- Wave 0 should add or update focused specs for:
  - inline increment/decrement behavior
  - remove-at-one behavior
  - typed add default quantity `1`
  - barcode add default quantity `1`
  - mobile no-overflow behavior with visible steppers

### Manual-only checks

- One narrow-phone manual pass is still useful to confirm the stepper remains easy to tap without hitting the row check-off target by mistake
- Real-device Safari/PWA validation should confirm the fixed add bar and row steppers still feel reliable with thumb use

## Planning Takeaways

- Treat inline quantity as an interaction-layer addition to `ItemRow`, not a replacement for the existing row action model
- Keep quantity updates optimistic by reusing current mutation patterns
- Normalize default `1` at shared add boundaries, not only in UI copy
- Limit Phase 10 scope to active rows, typed add, barcode add, and verification; suggestion-specific behavior stays for Phase 11