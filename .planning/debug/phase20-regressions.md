---
status: investigating
trigger: "Investigate and fix 3 regression issues: (1) Product suggestions missing in Legg til vare field, (2) Adding products from recipes fails with error, (3) Can't select Velg ingen option when adding recipe products"
created: 2026-03-16T00:00:00Z
updated: 2026-03-16T00:00:00Z
goal: find_and_fix
---

## Current Focus
hypothesis: ItemInput component's suggestions are not displaying because the `visibleSuggestions` derived property check at line 35 might be failing due to a data flow issue OR the `createRememberedItemsQuery` is not being called correctly OR the query is not returning data due to database changes in Phase 20 (added brand/imageUrl fields)
test: Verify data flow through ItemInput -> rememberedItemsQuery -> searchRememberedItems -> RPC; check ListPickerSheet passing
expecting: Find specific broken link in the data/query chain or missing prop passing
next_action: Check test files to see what's breaking, verify Phase 20 RPC changes haven't broken query

## Symptoms
expected:
  - Issue 1: Product suggestions appear when typing in "Legg til vare" field
  - Issue 2: Products can be added from recipes without error
  - Issue 3: "Velg ingen" option can be selected when adding recipe products to list

actual:
  - Issue 1: No suggestions appear when typing in "Legg til vare" field
  - Issue 2: Adding fails with error "Kunne ikke legge til ingredienser, prøv igjen"
  - Issue 3: Can't interact with "Velg ingen" option

errors:
  - Issue 2: Error message "Kunne ikke legge til ingredienser, prøv igjen" (Could not add ingredients, try again)

reproduction:
  - Issue 1: Open a list, type in "Legg til vare" field
  - Issue 2: Navigate to recipes, try adding ingredients/products to a list
  - Issue 3: In recipe, try selecting "Velg ingen" when adding products to list

started: Recently; likely due to Phase 20 changes or recent commits (after commit 5653842)
timeline: Features worked before, broke after Phase 20 implementation

## Eliminated
(none yet)

## Evidence
- timestamp: 2026-03-16T00:05:00Z
  checked: Phase 20 migration 20260316000000_phase20_sync_enrichment.sql
  found: RPC function signature changed - OLD was search_household_item_memory(text, integer), NEW is search_household_item_memory(p_household_id uuid, p_search_term text)
  implication: Frontend code in remembered-items-core.ts calling RPC with wrong parameters (p_query instead of p_search_term, p_limit instead of p_household_id), no household_id being passed at all
- timestamp: 2026-03-16T00:06:00Z
  checked: remembered-items-core.ts line 28-31
  found: RPC call uses {p_query, p_limit} but new function expects {p_household_id, p_search_term}
  implication: RPC fails silently or returns empty because parameters don't match, no suggestions appear (Issue 1)

## Resolution
root_cause: Phase 20 migration changed RPC signature for search_household_item_memory from (text, integer) to (p_household_id uuid, p_search_term text) but frontend code was not updated. Frontend was calling RPC with wrong parameters (p_query instead of p_search_term, p_limit instead of p_household_id), causing silent failures and no suggestions returned
fix: Updated searchRememberedItems() function signature to accept householdId parameter; updated all callers (ItemInput, IngredientBuilder, Recipe detail page) to pass householdId; updated RPC parameter names from p_query/p_limit to p_household_id/p_search_term; mapped response field from item_name to display_name
verification: pending - need to test suggestions appear, recipes can add ingredients, and Velg ingen works
files_changed:
  - src/lib/queries/remembered-items-core.ts
  - src/lib/queries/remembered-items.ts
  - src/routes/(protected)/lister/[id]/+page.svelte
  - src/routes/(protected)/oppskrifter/[id]/+page.server.ts
  - src/routes/(protected)/oppskrifter/[id]/+page.svelte
  - src/routes/(protected)/oppskrifter/[id]/rediger/+page.server.ts
  - src/routes/(protected)/oppskrifter/[id]/rediger/+page.svelte
  - src/routes/(protected)/oppskrifter/ny/+page.svelte
  - src/lib/components/recipes/IngredientBuilder.svelte
