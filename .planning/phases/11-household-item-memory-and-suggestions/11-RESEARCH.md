# Phase 11: Household Item Memory and Suggestions - Research

**Researched:** 2026-03-12
**Domain:** Household-scoped remembered-item suggestions for the fixed mobile add flow, with category reuse and compact inline dropdown behavior
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Suggestion surface:** Suggestions appear as an inline dropdown directly under the add field.
- **Suggestion timing:** Suggestions appear after the first typed letter.
- **Dropdown size:** Show up to 5 suggestions so the dropdown stays mobile-friendly.
- **Selection behavior:** Tapping a remembered suggestion adds the item immediately.
- **Selection friction:** Suggestion selection should not require an extra confirm or review step.
- **Narrowing:** Suggestions should narrow as more letters are typed.
- **Ranking:** Among matching items, household frequency should be the primary ranking signal.
- **Category reuse:** Picking a remembered suggestion should silently reuse the last known category for that item name.
- **Category conflict rule:** If the same item name has been used with different categories, reuse the most recent category.

### Claude's Discretion

- Exact matching strategy beyond the visible rules, such as prefix vs substring balancing
- Empty-state copy when no suggestions match
- Keyboard highlight treatment and focus behavior for the dropdown
- Exact row styling, spacing, and iconography in the dropdown

### Deferred Ideas (OUT OF SCOPE)

- Broader recommendation surfaces or a second recommendation tab treatment
- ML ranking or semantic similarity search
- Cross-household memory or shared global product suggestions

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUGG-01 | As user types an item name, the app shows suggestions from items previously added in that household | Add a household-scoped remembered-item source and a lightweight query path suitable for inline typeahead |
| SUGG-02 | Suggestions narrow as the typed query becomes more specific | Use normalized-name filtering with prefix-first matching and deterministic ordering rules |
| SUGG-03 | When user picks a remembered item suggestion, the app reuses its last known category automatically | Extend the add path to insert `category_id` in the same write or attach it before fallback category prompting runs |
</phase_requirements>

---

## Summary

Phase 11 should not be built as a direct read over `item_history` alone. `item_history` is already household-scoped and excellent for ranking by recency/frequency, but it currently stores only `item_name`, `list_id`, `checked_by`, `checked_at`, and store/list labels. It does **not** retain `category_id` or `category_name`, which means it cannot satisfy the category reuse requirement on its own. The current add flow also inserts a new item first and only assigns category afterward through a second mutation, which would make suggestion-based immediate add feel laggy or briefly uncategorized.

The strongest planning direction is:
- introduce a dedicated household-scoped remembered-item source optimized for autocomplete
- use it as the single data source for inline suggestion queries
- extend the add-item mutation so a suggestion can insert `name + quantity + category_id` in one operation

That gives the phase three clean layers:
1. Data model and query path for remembered items.
2. Inline mobile dropdown in `ItemInput.svelte`.
3. Immediate-add flow that bypasses `CategoryPickerModal` when a remembered category exists.

This keeps the user interaction exactly as requested: type one letter, see compact suggestions, tap one, and get the item inserted with the right category and default quantity `1`.

**Primary recommendation:** Use a dedicated `remembered_items` table (or similarly named household memory table) rather than trying to infer everything live from `item_history` + `list_items` on every keystroke.

---

## Existing Code Reality

### Current add flow

- `src/lib/components/items/ItemInput.svelte`
  - Owns the fixed add bar and currently submits only `name` and `quantity`.
  - Resets `name` to `''` and `quantity` to `1` after submit.
  - Is already mobile-constrained and now sits above the Phase 9 dock stack, so any dropdown must fit inside this fixed interaction zone.

- `src/routes/(protected)/lister/[id]/+page.svelte`
  - Wires `ItemInput` into `handleAdd`.
  - After a normal typed add, it opens `CategoryPickerModal` by setting `pendingCategoryItem`.
  - Barcode adds can already carry a category, but they still do so via a follow-up `assignCategoryMutation` after the insert succeeds.

- `src/lib/queries/items.ts`
  - `createAddItemMutation` inserts `list_items` with `name` and `quantity`, but not `category_id`.
  - `createAssignCategoryMutation` applies category later.
  - `createAddOrIncrementItemMutation` already shows there is a precedent for normalized-name logic and “fast add” behavior, but it currently does not know about remembered categories.

### Household-scoped history and recommendation data

- `src/lib/queries/history.ts`
  - Reads from `item_history`, which is household-scoped through RLS and already accepted as a household-level memory source for display/history.
- `src/lib/queries/recommendations.ts`
  - Uses SQL RPC functions that normalize item names and rank by `purchase_count` then `last_checked_at`.
  - This is the strongest existing signal for how the product already thinks about historical household item ranking.

### Schema limitation that matters

From `src/lib/types/database.ts` and migrations:
- `item_history` has `item_name`, `item_id`, `list_id`, `checked_by`, `checked_at`, `list_name`, `store_id`, `store_name`
- `item_history` does **not** have `category_id`
- `list_items` has `category_id`, but only for currently active items

This means:
- current history is enough to know **what** a household buys often
- current history is **not** enough to know the last known category for a remembered item over time

---

## Best Data Source for Remembered Items

### Recommendation: dedicated `remembered_items` table

Best fit for Phase 11:

```text
remembered_items
- id
- household_id
- normalized_name
- display_name
- use_count
- last_used_at
- last_category_id
- created_at
- updated_at
```

Why this is the best source:
- household-scoped by design
- query is cheap and predictable for each keystroke
- stores ranking signals directly (`use_count`, `last_used_at`)
- stores the exact category reuse signal (`last_category_id`)
- avoids expensive live joins/grouping across `item_history` and active `list_items`
- avoids mixing “current active list row state” with long-lived item memory

### Why not use `item_history` directly

`item_history` is a strong ranking input but a weak direct autocomplete source:
- it only captures checked-off items, not every previously added item
- it does not store category snapshots
- raw item history would require repeated aggregation/grouping on every search
- it would make the add path dependent on historical checkout behavior rather than remembered entry behavior

### Why not use `list_items` directly

`list_items` is wrong as the primary memory source:
- it only represents the current contents of lists
- items disappear when deleted or completed
- it does not provide household-wide long-term frequency ranking
- current rows can be duplicated across lists and would need heavy normalization

### Recommended write strategy

Treat `remembered_items` as a denormalized autocomplete index maintained by the app/backend:
- on any typed add, barcode-confirm add, or suggestion add:
  - upsert the remembered row by `(household_id, normalized_name)`
  - increment `use_count`
  - update `display_name` to the latest visible spelling
  - update `last_used_at`
- on category assignment or item edit category change:
  - update `last_category_id` for that normalized name

This gives the planner a clear mutation ownership model and avoids recomputing memory from scratch during normal user interaction.

---

## Category Reuse Path

### Recommendation: add category on the initial insert path

For Phase 11, suggestion-based add should not:
1. insert uncategorized item
2. open fallback category picker
3. assign category later

Instead, the add mutation should accept an optional `categoryId` and write it directly into `list_items`.

Recommended mutation shape:

```ts
type AddItemVariables = {
  name: string
  quantity?: number | null
  categoryId?: string | null
}
```

Then the insert path becomes:

```ts
.insert({
  list_id: listId,
  name,
  quantity: quantity ?? 1,
  category_id: categoryId ?? null
})
```

Why this is important:
- immediate suggestion add feels instant
- no flicker through “Andre varer”
- `CategoryPickerModal` stays only as the fallback for truly unknown items
- SUGG-03 is satisfied through one add path, not a chained mutation

### Fallback behavior

If the remembered row has `last_category_id = null` or the category no longer exists:
- fall back to the current uncategorized add path
- if needed, continue to use `CategoryPickerModal`

This keeps the phase robust without overcomplicating the normal case.

---

## Ranking and Narrowing Approach

### Recommended normalization

Use the same kind of normalization pattern already seen in recommendation logic:
- trim whitespace
- lowercase
- collapse repeated spaces
- optionally strip diacritics for matching, while preserving original display name

Suggested stored/search fields:
- `display_name` for UI
- `normalized_name` for filtering/ranking

### Recommended narrowing strategy

For query `q` after the first typed letter:

1. Normalize the input.
2. Filter remembered rows where `normalized_name` contains the query.
3. Split matches into tiers:
   - Tier 1: exact prefix match
   - Tier 2: word-boundary or token-prefix match
   - Tier 3: substring match
4. Order within each tier by:
   - `use_count DESC`
   - `last_used_at DESC`
   - `display_name ASC`
5. Return top 5.

This satisfies the user-visible rule:
- suggestions narrow as more letters are typed
- household frequent items win among matching rows

### Why prefix-first is important

On mobile, inline dropdowns must stay compact. Prefix-first reduces noisy matches and keeps the top 5 useful. Substring-only matching would produce wider, noisier result sets and feel unstable as the user types.

---

## Mobile-Friendly Inline Dropdown Constraints

### Constraint 1: dropdown lives inside a fixed bottom input zone

`ItemInput.svelte` is already a fixed bottom component. The suggestion UI must not:
- create sideways overflow
- cover the entire screen
- fight the dock/input stack introduced in Phase 9

Recommended UI shape:
- anchor dropdown directly above or immediately below the text input inside the input card
- max 5 rows
- capped height with internal scroll if needed
- full width of the name field region, not the entire screen

### Constraint 2: tapping a suggestion must be faster than normal add

Because the decision is “tap suggestion = add immediately,” the dropdown should not introduce:
- a detail preview
- a second confirm button
- a category sub-step

Each row should show just enough information:
- item name
- optional small secondary line or badge for category
- optional subtle frequency/recency cue only if it fits without clutter

### Constraint 3: keep quantity semantics intact

Phase 10 established default quantity `1`. Suggestion adds should:
- use quantity `1` by default
- not require the user to adjust quantity before tapping a suggestion
- leave future inline quantity editing to the main list, not to the suggestion dropdown

### Constraint 4: keyboard friendliness is secondary but should not block touch

Touch is the main mode, but the planner can still add:
- arrow-key highlight if cheap
- Enter to accept highlighted suggestion if the implementation stays simple

This should remain discretionary, not phase-critical.

---

## Planning Implications

The cleanest phase breakdown is:

1. Data model and query layer
   - migration for `remembered_items`
   - household-scoped select/upsert helpers
   - optional backfill from existing household history

2. Add-flow integration
   - update `createAddItemMutation` to accept `categoryId`
   - wire suggestion selection to immediate add
   - update category assignment/edit flows to keep `remembered_items.last_category_id` fresh

3. UI + verification
   - compact inline dropdown in `ItemInput.svelte`
   - mobile-focused Playwright coverage

The main design risk is trying to avoid the dedicated memory table and deriving everything ad hoc. That would save one migration, but it would make both ranking and category reuse less reliable and harder to test.

---

## Focused Testing Strategy

### Recommended automated coverage

Add a dedicated Playwright file such as `tests/item-memory.spec.ts`.

Core scenarios:
- type first letter -> dropdown appears with up to 5 remembered suggestions
- type more letters -> list narrows
- tap suggestion -> item is added immediately to the list
- remembered category is applied automatically and `CategoryPickerModal` does not appear
- if remembered category is missing/null, normal fallback category picker behavior still works
- suggestions are household-scoped and do not leak between test households

Recommended lower-level coverage if ranking logic is extracted:
- unit tests for normalization and ranking helper
- examples:
  - prefix beats substring
  - higher frequency beats lower frequency within same match tier
  - newer `last_used_at` breaks ties

### Test-data strategy

Use seeded remembered rows or a deterministic helper that creates household memory records directly. Do not rely on building 10+ history sessions through recommendations just to test Phase 11 autocomplete behavior.

### UI assertions that matter most

- dropdown visibility and max row count
- row tap adds item without extra modal friction
- category grouping after add shows the item under the remembered category

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2, plus optional lightweight unit tests if a ranking helper is extracted |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:e2e -- tests/item-memory.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUGG-01 | Typing in the add field shows household-scoped remembered suggestions after the first letter | integration | `npm run test:e2e -- tests/item-memory.spec.ts` | ❌ Wave 0 |
| SUGG-02 | Suggestions narrow as the query gets more specific | integration | `npm run test:e2e -- tests/item-memory.spec.ts` | ❌ Wave 0 |
| SUGG-02 | Ranking prefers higher-frequency household matches among equivalent text matches | unit or integration | `npm run test:e2e -- tests/item-memory.spec.ts` or unit command if helper extracted | ❌ Wave 0 |
| SUGG-03 | Tapping a suggestion adds the item immediately with remembered category and bypasses `CategoryPickerModal` | integration | `npm run test:e2e -- tests/item-memory.spec.ts` | ❌ Wave 0 |
| SUGG-03 | If remembered category is unavailable, fallback add path remains valid | integration | `npm run test:e2e -- tests/item-memory.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:e2e -- tests/item-memory.spec.ts`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** full suite green before verification/UAT

### Wave 0 Gaps

- [ ] `tests/item-memory.spec.ts` — focused Phase 11 E2E coverage
- [ ] test helper to seed remembered household items directly
- [ ] stable selectors or `data-testid` hooks for suggestion dropdown and rows
- [ ] optional unit test harness if ranking/normalization is extracted into a pure helper

### Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dropdown feels compact and non-intrusive above the fixed mobile add bar | SUGG-01, SUGG-02 | Real mobile ergonomics are hard to judge headlessly | Open a list on a phone, type one letter, confirm the dropdown stays compact and does not overwhelm the fixed add area |
| Tapping a suggestion feels faster than normal add flow | SUGG-03 | Subjective interaction quality | On a phone, type a known item and tap the suggestion, confirm the item appears immediately with no extra picker or dialog |

---

## Planning Notes

- Prefer a dedicated memory source over live aggregation.
- Update add mutation shape early so category reuse can happen in the first insert.
- Keep the dropdown compact and fully inside the fixed add bar zone.
- Reuse the recommendation system’s normalization/ranking ideas, but do not reuse its UI surface.

