---
phase: 14-recipes
verified: 2026-03-14T08:00:00Z
status: gaps_found
score: 5/7 must-haves verified
gaps:
  - truth: "Category assignment carries through from recipe ingredient to shopping list item"
    status: failed
    reason: "createAddOrIncrementItemMutation inserts list_items with no category_id — the field is simply absent from the insert payload. Ingredients added from a recipe land as uncategorized items regardless of any remembered category in household_item_memory."
    artifacts:
      - path: "src/lib/queries/items.ts"
        issue: "Lines 138-146: insert payload omits category_id entirely. The mutation signature (AddOrIncrementItemVariables) has no category parameter, so callers cannot pass one."
      - path: "src/routes/(protected)/oppskrifter/[id]/+page.svelte"
        issue: "Lines 78-79: handleAddToList calls mutateAsync({ listId, name: ingredient.name }) — no category lookup before adding to list."
    missing:
      - "AddOrIncrementItemVariables type needs an optional categoryId field"
      - "createAddOrIncrementItemMutation insert payload must include category_id when provided"
      - "The detail page handleAddToList must look up the remembered category for each ingredient name (via household_item_memory or a categories query) and pass it when calling the mutation"
  - truth: "Adding ALL recipe ingredients to a list in one action is distinct from selecting individual ones"
    status: partial
    reason: "The 'add all' path (RECPE-07) is implemented by pre-selecting every ingredient and having a single button, not a dedicated 'Add all' action separate from the per-ingredient checkbox flow. The CONTEXT.md decision doc confirms this was the intended design, but the success criterion says 'in one action' which the implementation satisfies. Marking partial because there is no explicit 'Add All' button independent of the checkbox state — user must not have deselected anything. Functionally it works but the duplicate-prevention note in RECPE-07 also has the category gap above."
    artifacts:
      - path: "src/routes/(protected)/oppskrifter/[id]/+page.svelte"
        issue: "No dedicated 'Add all' button — pre-selection of all ingredients plus one submit button serves as the 'add all' mechanism. This is consistent with CONTEXT.md but the success criterion reads as if it should be a distinct affordance from selective adding."
    missing:
      - "Assess whether pre-selection-of-all satisfies RECPE-07 as designed (likely yes per CONTEXT.md); if so, close this partial gap — the category issue above is the real blocker"
human_verification:
  - test: "Verify that after adding recipe ingredients to a list, items appear in the correct store-layout category section"
    expected: "If 'Melk' has a remembered category 'Meieri og egg', it should appear under that section header in the shopping list, not under 'Andre varer'"
    why_human: "Category carry-through depends on household_item_memory runtime data and store layout ordering which cannot be verified by static code analysis"
  - test: "Upload a cover image when creating a recipe, then verify the image appears on the recipe list card and detail page"
    expected: "Image renders in the card grid and as a full-width hero on the detail page"
    why_human: "Requires browser canvas API, Supabase Storage write, and image serving — cannot be verified statically"
  - test: "Create a recipe, add it to a shopping list, then check the target list to confirm items were added with correct quantities (increment if already present)"
    expected: "Items added; if 'Melk' was already on the list with quantity 1, it becomes quantity 2"
    why_human: "Increment-on-duplicate behavior requires runtime state with actual list data"
---

# Phase 14: Recipes Verification Report

**Phase Goal:** Any household member can browse, create, and use household-shared recipes — selecting which ingredients to add to a shopping list so the store-layout ordering and category assignment carry through from recipe to list
**Verified:** 2026-03-14T08:00:00Z
**Status:** gaps_found — 1 critical gap (category carry-through broken), 1 partial gap (add-all semantics)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create a recipe with a name and optionally upload a cover image, and immediately see it in the recipe list | VERIFIED | `/oppskrifter/ny` form with file input + `compressImage`/`uploadRecipeImage` + `createRecipeMutation` + redirect to `/oppskrifter`. Playwright test `can create a new recipe with ingredients` covers this. |
| 2 | User can add ingredients by picking from household's previously used items, preserving category linkage | PARTIAL | `IngredientBuilder` calls `searchRememberedItems` for typeahead — names are preserved. But category is stored only as a remembered attribute in `household_item_memory`; it is not passed through when adding ingredients to a list (see gap). The pick-from-memory part works; the category carry-through to the list does not. |
| 3 | User can edit a recipe's name, cover image, and ingredient list, and delete a recipe | VERIFIED | `/oppskrifter/[id]/rediger` with `createUpdateRecipeMutation` (delete-all/re-insert strategy). Delete from detail page via `createDeleteRecipeMutation` with confirmation dialog. Playwright tests cover both flows. |
| 4 | The recipe list shows each recipe's cover image (or placeholder) and name, loads within a normal page transition | VERIFIED | `/oppskrifter/+page.svelte` uses `createRecipesQuery` (alphabetical sort), renders image cards with `<img>` when `recipe.image_url` is set, SVG placeholder icon when null. Search bar filters client-side. |
| 5 | From a recipe detail page, user can select individual ingredients with checkboxes and add only those to a chosen shopping list | VERIFIED | `/oppskrifter/[id]/+page.svelte` renders `recipe_ingredients` as checkboxes (`selectedIngredients` Set), `ListPickerSheet` bottom sheet selects target list, `handleAddToList` iterates selected only. Playwright test `ingredients are all pre-selected and can be toggled` + `can add ingredients to a shopping list` cover this. |
| 6 | From a recipe detail page, user can add all ingredients to a chosen shopping list in one action; items already on the list are not duplicated (quantity incremented) | PARTIAL | Pre-selection of all ingredients plus a single button satisfies "one action". Duplicate handling exists in `createAddOrIncrementItemMutation` (name-match increment). However, category is not passed — items land without `category_id`, so store-layout ordering does NOT carry through. This fails the core goal criterion. |
| 7 | Store-layout ordering and category assignment carry through from recipe to list | FAILED | `createAddOrIncrementItemMutation` insert payload (lines 138-146 of `src/lib/queries/items.ts`) omits `category_id`. The `AddOrIncrementItemVariables` type has no `categoryId` parameter. The detail page `handleAddToList` (line 79) passes only `{ listId, name }`. Items added from recipes are always uncategorized regardless of what `household_item_memory` knows about that ingredient. |

**Score:** 5/7 truths verified (truths 2 and 6 are partial due to the category gap; truth 7 fails outright)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260313000000_phase14_recipes.sql` | DB schema: recipes + recipe_ingredients + RLS + Storage | VERIFIED | Tables, indexes, 4 RLS policies each, Storage bucket with 4 path-scoped policies — all present and substantive |
| `src/lib/types/database.ts` | Regenerated types including recipes/recipe_ingredients | VERIFIED | Types updated; file modified in 63f0c81 |
| `src/lib/queries/recipes.ts` | TanStack Query factories: list, detail, create, delete, update | VERIFIED | All 5 factories present and wired: `createRecipesQuery`, `createRecipeDetailQuery`, `createRecipeMutation`, `createDeleteRecipeMutation`, `createUpdateRecipeMutation` |
| `src/lib/components/recipes/IngredientBuilder.svelte` | Typeahead from household_item_memory, add/remove | VERIFIED | Calls `searchRememberedItems`, renders suggestion dropdown, add/remove buttons, ingredient list |
| `src/lib/storage/upload.ts` | `compressImage` (canvas WebP max 1200px) + `uploadRecipeImage` | VERIFIED | Full implementation: FileReader → canvas → toBlob('image/webp', 0.8) → Supabase storage upload |
| `src/routes/(protected)/oppskrifter/+page.svelte` | Recipe list with search, image cards, placeholder | VERIFIED | Uses `createRecipesQuery`, client-side search filter, grid cards with image/placeholder, "Ny oppskrift" link |
| `src/routes/(protected)/oppskrifter/ny/+page.svelte` | Creation form: name, description, image, ingredients, submit | VERIFIED | Full form wired to `createRecipeMutation` + `uploadRecipeImage`; redirects to `/oppskrifter` on success |
| `src/routes/(protected)/oppskrifter/[id]/+page.server.ts` | Server load with 404 guard | VERIFIED | Validates recipe existence via RLS-filtered query; throws 404 if not found |
| `src/routes/(protected)/oppskrifter/[id]/+page.svelte` | Detail view: hero image, ingredient checkboxes, add-to-list, delete | VERIFIED | Full implementation with sticky action bar, `ListPickerSheet`, delete confirmation dialog, toast; data-testid attributes for Playwright |
| `src/lib/components/recipes/ListPickerSheet.svelte` | Bottom sheet list picker for recipe context | VERIFIED | Dialog-based sheet using showModal/close, passes `listId` + `listName` to `onSelect` callback |
| `src/routes/(protected)/oppskrifter/[id]/rediger/+page.server.ts` | Server load with 404 guard for edit page | VERIFIED | Same pattern as detail server load |
| `src/routes/(protected)/oppskrifter/[id]/rediger/+page.svelte` | Edit form pre-filled from query, update mutation, image handling | VERIFIED | `$effect` with `initialised` flag pre-fills form; three-value `image_url` semantics; redirects to detail on save |
| `tests/helpers/recipes.ts` | Admin helpers: createTestRecipe, addTestIngredient, deleteTestRecipe | VERIFIED | All three helpers use service-role client and proper insert/delete patterns |
| `tests/recipes.spec.ts` | Playwright tests covering creation, search, detail, edit, delete, add-to-list | VERIFIED | Three describe blocks with 2+4+4 = 10 tests covering all major flows |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `/oppskrifter/+page.svelte` | `createRecipesQuery` | import + call in `<script>` | WIRED | `createRecipesQuery(supabase)` called; result drives `filteredRecipes` derived state rendered in grid |
| `/oppskrifter/ny/+page.svelte` | `createRecipeMutation` + `uploadRecipeImage` | imports + `handleSubmit` | WIRED | Both called in `handleSubmit`; image uploaded before mutation; redirects on success |
| `/oppskrifter/ny/+page.svelte` | `IngredientBuilder` | import + component usage | WIRED | `<IngredientBuilder {supabase} bind:ingredients .../>` renders in form |
| `/oppskrifter/[id]/+page.svelte` | `createRecipeDetailQuery` | import + call | WIRED | `createRecipeDetailQuery(supabase, recipeId)` result drives entire detail view |
| `/oppskrifter/[id]/+page.svelte` | `createAddOrIncrementItemMutation` | import + `handleAddToList` | WIRED (partial) | Called per ingredient in loop; but missing `category_id` — see gap |
| `/oppskrifter/[id]/+page.svelte` | `ListPickerSheet` | import + component with `onSelect={handleAddToList}` | WIRED | Sheet opens on button click; `onSelect` triggers add-to-list flow |
| `/oppskrifter/[id]/rediger/+page.svelte` | `createUpdateRecipeMutation` | import + `handleSubmit` | WIRED | Called in `handleSubmit`; ingredient sync via delete-all/re-insert; redirects to detail |
| `createAddOrIncrementItemMutation` | `list_items.category_id` | insert payload | NOT WIRED | Insert at lines 138-146 has no `category_id` field. Store-layout ordering cannot apply to recipe-sourced items. |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| RECPE-01 | User can create a recipe with a name and optional cover image | SATISFIED | `/oppskrifter/ny` form with file input, `compressImage` + `uploadRecipeImage`, `createRecipeMutation` |
| RECPE-02 | User can add ingredients by selecting from household's known items | PARTIALLY SATISFIED | `IngredientBuilder` uses `searchRememberedItems` typeahead; category not carried through to list add |
| RECPE-03 | User can edit a recipe's name, cover image, and ingredient list | SATISFIED | `/oppskrifter/[id]/rediger` with `createUpdateRecipeMutation` covering all three editable fields |
| RECPE-04 | User can delete a recipe | SATISFIED | Delete button on detail page with confirmation dialog → `createDeleteRecipeMutation` → redirect |
| RECPE-05 | Recipe list shows each recipe's cover image (if set) and name | SATISFIED | `/oppskrifter` grid cards: image with `object-cover`, SVG placeholder when null, recipe name in `<h3>` |
| RECPE-06 | User can view a recipe and add individual ingredients to a chosen shopping list | PARTIALLY SATISFIED | Checkbox selection + `ListPickerSheet` + `createAddOrIncrementItemMutation` work; items added without category |
| RECPE-07 | User can add all recipe ingredients to a chosen shopping list in one action | PARTIALLY SATISFIED | All-pre-selected + single button satisfies "one action"; duplicate increment works; category still missing |

All 7 requirement IDs (RECPE-01 through RECPE-07) are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/queries/items.ts` | 138-146 | `category_id` absent from insert payload in `createAddOrIncrementItemMutation` | Blocker | Recipe ingredients added to lists are always uncategorized; store-layout ordering cannot apply; direct violation of the phase goal |
| `src/routes/(protected)/oppskrifter/[id]/+page.svelte` | 79 | `mutateAsync({ listId, name: ingredient.name })` — no category lookup | Blocker | Even if the mutation were fixed, the caller does not look up or pass the remembered category for each ingredient name |

No TODO/FIXME/placeholder comments found in recipe files. No stub implementations found. No `return null` / empty returns found in recipe components.

### Human Verification Required

#### 1. Category in Shopping List After Recipe Add

**Test:** Create a recipe with an ingredient that has a remembered category (e.g., add "Melk" to a shopping list first so it gets a category like "Meieri og egg", then create a recipe containing "Melk", then use Add to List from the recipe detail).
**Expected:** "Melk" should appear under the "Meieri og egg" section header in the target list, not under "Andre varer". This currently FAILS because `category_id` is not passed.
**Why human:** Requires real Supabase data, store layout configuration, and visual verification of the category section grouping.

#### 2. Cover Image Upload and Display

**Test:** Create a recipe, upload a JPEG photo, save, then verify the image appears on the recipe list card and as the hero on the detail page.
**Expected:** Image displays correctly at both locations; file is stored in Supabase Storage under `{household_id}/{uuid}.webp`.
**Why human:** Requires browser canvas API, file selection, and live Supabase Storage.

#### 3. Ingredient Quantity Increment (Duplicate Handling)

**Test:** Add "Melk" (quantity 1) to a shopping list manually. Then open a recipe containing "Melk" and use Add to List targeting the same list.
**Expected:** "Melk" quantity becomes 2 in the list, not a duplicate row.
**Why human:** Requires two sequential UI interactions across two different views with real database state.

### Gaps Summary

**One blocker gap prevents the phase goal from being achieved.**

The phase goal explicitly states that "store-layout ordering and category assignment carry through from recipe to list." This requires that when an ingredient is added to a shopping list from a recipe, its `category_id` is set — enabling the existing category-grouped list view to place it in the correct section.

The current implementation breaks this chain at the `createAddOrIncrementItemMutation` level: the function's type signature (`AddOrIncrementItemVariables`) has no `categoryId` parameter, and the insert payload at lines 138-146 of `src/lib/queries/items.ts` omits `category_id` entirely. Additionally, the recipe detail page's `handleAddToList` does not attempt to look up the remembered category for each ingredient name before calling the mutation.

To close this gap, three changes are needed in sequence:
1. Add `categoryId?: string | null` to `AddOrIncrementItemVariables` and include it in the insert payload (when adding a new item, not when incrementing an existing one).
2. In the recipe detail page's `handleAddToList`, look up the remembered category for each ingredient name from `household_item_memory` (via `searchRememberedItems` or a direct query by exact name) before calling the mutation.
3. Pass the found `categoryId` (or `null` if no match) to `mutateAsync`.

The remaining requirements (RECPE-01, RECPE-03, RECPE-04, RECPE-05) are fully satisfied. The recipe CRUD backbone, image upload, edit flow, and delete flow all work correctly. The add-to-list UI flow works mechanically — only the category thread is missing.

---

_Verified: 2026-03-14T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
