---
phase: 14-recipes
plan: "04"
subsystem: ui
tags: [svelte, tanstack-query, playwright, typescript, forms]

# Dependency graph
requires:
  - phase: 14-recipes
    plan: "01"
    provides: recipes + recipe_ingredients tables, TypeScript types, uploadRecipeImage, compressImage
  - phase: 14-recipes
    plan: "02"
    provides: clean query layer, accessor function pattern for createMutation
  - phase: 14-recipes
    plan: "03"
    provides: detail page at /oppskrifter/[id] with edit button linking to /rediger

provides:
  - Edit recipe page at /oppskrifter/[id]/rediger with pre-filled form
  - updateRecipeMutation in recipes.ts — delete-all/re-insert ingredient sync strategy
  - 4 Playwright tests covering edit page navigation, pre-fill, name update, ingredient add

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "updateRecipeMutation uses delete-all + re-insert for ingredient sync — avoids diff complexity, atomic within Supabase RLS"
    - "image_url uses three-value semantics: undefined=keep, null=remove, string=new URL"
    - "$effect with initialised flag prevents re-overwriting form state on subsequent query refetches"

key-files:
  created:
    - src/routes/(protected)/oppskrifter/[id]/rediger/+page.server.ts
    - src/routes/(protected)/oppskrifter/[id]/rediger/+page.svelte
  modified:
    - src/lib/queries/recipes.ts
    - tests/recipes.spec.ts

key-decisions:
  - "Ingredient sync uses delete-all + re-insert strategy rather than diff — simpler, handles adds/removes/reorders equally, acceptable for MVP recipe sizes"
  - "image_url passed as undefined (not included in update payload) when user makes no image change — avoids overwriting existing URL accidentally"
  - "Edit submit allows zero ingredients (name-only recipe) — ingredient list is optional in line with plan spec"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 14 Plan 04: Edit Recipe Summary

**Edit recipe page at /oppskrifter/[id]/rediger with pre-filled form, updateRecipeMutation with delete-all/re-insert ingredient sync, and 4 Playwright tests**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-14T06:59:20Z
- **Completed:** 2026-03-14T07:01:39Z
- **Tasks:** 4 tasks (mutation, server load, page component, tests)
- **Files created/modified:** 4

## Accomplishments

- Added `UpdateRecipeVariables` type and `createUpdateRecipeMutation` to `src/lib/queries/recipes.ts`
- Mutation: updates recipe fields (name, description, image_url), then deletes all existing ingredients and re-inserts in submission order — handles adds, removes, and reorders without diff logic
- `image_url` uses three-value semantics: `undefined` (keep existing), `null` (remove), or `string` (new uploaded URL) — avoids accidentally clearing images on saves that don't touch the image field
- Server load for `/oppskrifter/[id]/rediger`: validates recipe exists (404 guard), returns `recipeId`
- Edit page: pre-fills from `createRecipeDetailQuery`, ingredients sorted by `position` before populating `IngredientBuilder`
- `$effect` uses `initialised` flag to prevent form state being reset on subsequent query refetches
- Image handling: shows current image with remove button, change button replaces it, removal sets `image_url: null`
- Cancel link returns to detail page, save redirects to detail page after successful mutation
- 4 Playwright tests: pre-fill verification, name update with detail page confirm, ingredient add during edit, Rediger button navigation from detail

## Task Commits

1. **updateRecipeMutation** - `4d98214` (feat) — UpdateRecipeVariables type + mutation with ingredient sync
2. **Edit page (server load + component)** - `6d2f9b9` (feat) — server load 404 guard + full edit form
3. **Playwright tests** - `b33593d` (test) — 4 tests covering edit flow scenarios

## Files Created/Modified

- `src/lib/queries/recipes.ts` - Added UpdateRecipeVariables type and createUpdateRecipeMutation
- `src/routes/(protected)/oppskrifter/[id]/rediger/+page.server.ts` - Server load with 404 guard
- `src/routes/(protected)/oppskrifter/[id]/rediger/+page.svelte` - Pre-filled edit form with image and ingredient handling
- `tests/recipes.spec.ts` - Added Recipe Edit Flow describe block with 4 tests

## Decisions Made

- Delete-all + re-insert for ingredients: avoids per-item diff logic, handles all cases (add/remove/reorder) uniformly
- Three-value image_url semantics prevent accidental data loss on saves that don't touch the image
- Zero-ingredient recipes allowed (submit button only requires non-empty name)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript checked clean on all new files, Vite production build succeeds.

## User Setup Required

None — uses existing Supabase tables, storage bucket, and RLS from Plan 14-01.

## Next Phase Readiness

- Phase 14 (Recipes) is now complete — all 4 plans executed
- Recipe CRUD: list, create, detail+add-to-list, edit all working end-to-end

---
*Phase: 14-recipes*
*Completed: 2026-03-14*

## Self-Check: PASSED

- FOUND: src/lib/queries/recipes.ts
- FOUND: src/routes/(protected)/oppskrifter/[id]/rediger/+page.server.ts
- FOUND: src/routes/(protected)/oppskrifter/[id]/rediger/+page.svelte
- FOUND: tests/recipes.spec.ts (modified)
- FOUND: .planning/phases/14-recipes/slices/14-04-SUMMARY.md
- FOUND commit: 4d98214 (feat — updateRecipeMutation)
- FOUND commit: 6d2f9b9 (feat — edit page server load + component)
- FOUND commit: b33593d (test — Playwright tests)
