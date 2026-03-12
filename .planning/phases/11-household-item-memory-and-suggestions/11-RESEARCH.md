# Phase 11: Household Item Memory and Suggestions - Research

**Date:** 2026-03-12
**Status:** Ready for planning

## What Already Exists

- `src/lib/components/items/ItemInput.svelte` already owns the fixed mobile add bar, the text field, and the visible default quantity `1`.
- `src/routes/(protected)/lister/[id]/+page.svelte` is the orchestration point for typed adds, barcode-assisted adds, category fallback, and list-level realtime invalidation.
- `src/lib/queries/items.ts` already has the shared mutation surface the phase should reuse:
  - `createAddItemMutation` inserts new rows with default quantity `1`
  - `createAssignCategoryMutation` attaches a category after insert
  - `createAddOrIncrementItemMutation` is prior art for normalized-name matching and household-adjacent recurring behavior
- `src/lib/components/items/CategoryPickerModal.svelte` is the current fallback path for uncategorized typed adds.
- `src/lib/queries/history.ts` and `supabase/migrations/20260311000002_phase6_recommendations.sql` already show household-scoped history access patterns and normalized-name aggregation patterns.

## Key Implementation Findings

### 1. `item_history` alone is not enough for remembered-category reuse

Phase 6 recommendations are household-scoped and already aggregate normalized item names from `item_history`, so they prove the query style is viable. But `item_history` stores only `item_name`, not `category_id`, which means it cannot satisfy `SUGG-03` by itself.

Planning implication:
- Reusing the existing history query directly would give frequency and recency, but not the "last known category" the user asked for
- The phase needs a remembered-item source that stores both normalized name and the latest category choice

Recommended direction:
- Add a dedicated household-scoped memory source instead of overloading `item_history`
- Shape it around:
  - `household_id`
  - normalized item name
  - display name
  - last used category id
  - last used timestamp
  - use count

This keeps search cheap, preserves category reuse, and avoids coupling autocomplete to the history view model.

### 2. Memory should be updated on item add, not only on check-off

The product requirement is "items previously added in that household", not only items that made it into completed shopping history. Today history is written on check-off, which is too late and too lossy for this feature.

Planning implication:
- If the phase only watches `item_history`, suggestions will miss items that were added and removed before checkout, items still active on a list, and items never checked off yet
- The remembered-item store should update at the same time the item is added or categorized

Recommended direction:
- Write remembered-item records from the shared add flow in Phase 11
- Treat category changes as a memory refresh when the user later categorizes or re-categorizes an item
- Keep the write path inside the existing list-item mutation layer so typed, future suggested, and future add variants converge on one rule

### 3. The current typed-add flow has a clean interception point for remembered suggestions

`lister/[id]/+page.svelte` currently does this for manual typed adds:
1. `ItemInput` emits `(name, quantity)`
2. `handleAdd` calls `addItemMutation`
3. successful insert opens `CategoryPickerModal`

That means the phase does not need to replace the add flow. It only needs a second path for "remembered add" that carries a category with it and suppresses the uncategorized fallback.

Planning implication:
- The remembered suggestion selection path should not emit the same "plain add" event as free text
- It needs a separate callback or richer payload so the list page can distinguish:
  - typed free text without a remembered category
  - remembered suggestion with a category to attach immediately

Recommended direction:
- Expand `ItemInput` to accept:
  - the current text value
  - suggestion rows to render
  - a selection callback for immediate-add suggestion picks
- Keep mutation ownership in the list page, not inside `ItemInput`
- On remembered selection:
  - insert item with quantity `1`
  - assign remembered category immediately
  - skip `CategoryPickerModal` unless the remembered category is missing or invalid

### 4. A small RPC or focused query layer is safer than client-side scanning of household history

The app already uses household-scoped SQL functions for Phase 6 recommendations. That is a better fit here than downloading many historical rows into the browser on every list page load.

Planning implication:
- Client-side scanning of `list_items` or `item_history` would be wasteful and would make ranking logic drift between app and database
- Prefix filtering, recency, and frequency ordering belong close to the data

Recommended direction:
- Add a Supabase RPC for remembered-item search, for example `search_household_item_memory(p_query text, p_limit integer default 5)`
- Ranking order should be:
  1. prefix matches before broader contains matches if both are allowed
  2. higher use count
  3. more recent use
- Normalize by `lower(trim(name))` and keep one canonical display name per normalized item, refreshed to the most recent user-facing spelling

This keeps `SUGG-01` and `SUGG-02` deterministic and easy to test.

### 5. The inline dropdown must behave like an extension of the fixed add bar, not a floating desktop autocomplete

Phase 9 already hardened the mobile shell against overflow. `ItemInput` sits inside a fixed bottom container, so the suggestion UI must stay within that contract.

Planning implication:
- The dropdown should be anchored inside the same max-width container as the add bar
- It must cap its height, scroll vertically, and never increase viewport width
- It must remain usable when the mobile keyboard is open

Recommended direction:
- Render the suggestion list directly below the text input inside the fixed add-bar card
- Keep it compact:
  - max 5 rows
  - max-height cap with internal scroll
  - truncation on long names
- Preserve the visible mini quantity stepper and action buttons from Phase 10
- Hide the dropdown when:
  - query length is 0
  - the user selects a suggestion
  - the typed text exactly matches the selected suggestion and the item is already added

### 6. Category reuse should be driven by the most recent categorized occurrence of a name

The user decision is explicit: if an item name has been used with multiple categories, reuse the most recent category. That means ranking frequency and category selection are related but not identical.

Planning implication:
- The data model must distinguish:
  - use count for ranking
  - last categorized category for reuse
- Updating frequency alone is not sufficient if the latest category differs from the most common one

Recommended direction:
- Store both `use_count` and `last_category_id`
- Refresh `last_category_id` only when the add/categorize path has a concrete category available
- When the remembered category no longer exists in the household, degrade gracefully:
  - still allow the suggestion
  - reopen the normal category picker after add

## Risks and Constraints

### Memory drift risk

If remembered-item writes happen only on one add path, typed and future suggestion-assisted adds will drift. The phase should centralize memory writes in the shared mutation surface or an adjacent helper used by all add flows.

### Query-chattiness risk

Suggestions begin after one typed letter, which can create frequent network requests. The plan should include a small debounce or query gating so one-character searches remain responsive without flooding Supabase.

### Name-normalization risk

Items like `Melk`, ` melk `, and `MELK` should collapse into one remembered record. The phase needs a single normalization rule and consistent test fixtures around it.

### Deleted-category risk

Remembered records may point at a category that was removed or renamed later. The add flow must treat missing category ids as fallback-to-picker, not as a hard error.

## Testing and Wave 0 Guidance

Existing Playwright coverage around item entry and recommendations is enough to extend. Phase 11 does not need a new framework, but it does need dedicated suggestion-path coverage.

Recommended coverage:

1. Suggestions appear after one typed letter
- Start typing into the add field
- Assert up to five household-specific suggestions render beneath the input

2. Suggestions narrow as query grows
- Seed multiple remembered items with a shared prefix
- Type additional letters
- Assert the list shrinks to the tighter match set

3. Suggestion selection adds immediately with quantity `1`
- Tap a suggestion
- Assert the row appears in the active list without needing the `Legg til` button
- Assert quantity renders as `1`

4. Remembered category bypasses the picker
- Select a remembered item with a valid stored category
- Assert `CategoryPickerModal` does not appear
- Assert the item lands in the correct category group

5. Most recent category wins
- Seed the same normalized item with two different categories at different timestamps
- Assert selection uses the latest category, not the most frequent one

6. Missing remembered category falls back cleanly
- Seed a remembered record whose category has been deleted or is absent
- Assert the item still adds
- Assert the normal category picker opens

7. Mobile layout remains contained
- Reuse the narrow-phone viewport from Phase 9
- Assert the suggestion dropdown stays within the fixed add bar width and does not reintroduce horizontal overflow

## Validation Architecture

### Test framework and commands

- Framework: Playwright E2E + existing `svelte-check` baseline
- Quick targeted runs:
  - `npx playwright test tests/items.spec.ts --workers=1`
  - `npx playwright test tests/mobile-layout.spec.ts --workers=1`
  - `npx playwright test tests/recommendations.spec.ts --workers=1`
- Full focused suite:
  - `npx playwright test tests/items.spec.ts tests/mobile-layout.spec.ts tests/recommendations.spec.ts --workers=1`

### Sampling plan

- After remembered-search query work: run targeted recurring-item/spec coverage
- After add-flow integration work: run `items` plus mobile layout coverage
- After category-reuse fallback work: run the full focused Phase 11 suite
- Before phase verification: rerun the focused suite and note any unrelated pre-existing type-check failures separately

### Wave 0 needs

- Extend existing Playwright helpers to seed remembered-item records and category variants quickly
- Add focused assertions in:
  - `tests/items.spec.ts`
  - `tests/mobile-layout.spec.ts`
- Either extend `tests/recommendations.spec.ts` for shared normalized-name fixtures or add a dedicated remembered-items helper if that keeps test setup cleaner

### Manual-only checks

- Real-phone keyboard check:
  - confirm the dropdown remains tappable above the keyboard and does not push actions out of reach
- Real-device recurrence check:
  - add an item manually once, then start typing it again and confirm the suggestion appears with the expected category reuse

## Recommended Plan Split

Phase 11 still matches the roadmap’s three-plan shape:

- `11-01`: database and query layer for household item memory, normalized search, and ranking
- `11-02`: inline mobile suggestion UI in `ItemInput` and list-page orchestration for immediate-add selection
- `11-03`: remembered-category persistence, fallback behavior, and end-to-end verification

## Planning Takeaways

- Do not build suggestions on raw `item_history` reads; it lacks category memory
- Add a dedicated household-scoped remembered-item source with normalized-name search
- Keep `ItemInput` as the visual host, but keep mutation ownership in `lister/[id]/+page.svelte`
- Treat remembered selection as a separate add path that skips the category picker when category memory is valid
- Preserve the Phase 9/10 mobile-shell contract while adding the dropdown
