# Phase 14: Recipes - Research

**Gathered:** 2026-03-13
**Status:** Research Complete

<domain>
## Phase Boundary

Implement a household-shared recipe system where members can create recipes, manage ingredients using existing household item memory, and add selected ingredients to any shopping list.

## Research Findings

### 1. Ingredient Selection & Naming
- **Reusable Component:** `src/lib/components/items/ItemInput.svelte` is the primary input component. It already integrates with `household_item_memory` for typeahead suggestions.
- **Data Source:** `src/lib/queries/remembered-items-core.ts` contains the logic for fetching suggestions via RPC. Recipes should use this to ensure ingredient names match the household's history.
- **Normalization:** New ingredients added to recipes should follow the same normalization rules as shopping list items to prevent duplicates in memory.

### 2. List Mutations ("Add to List")
- **Core Logic:** `createAddOrIncrementItemMutation` in `src/lib/queries/items.ts` handles adding items to a list. It automatically increments quantity if the item exists, matching the requirement for duplicate handling.
- **Batch Operations:** The recipe "Add to List" feature will need to iterate through selected ingredients and call this mutation (or a batched version) for each one.

### 3. Image Uploads
- **Current State:** No existing image upload infrastructure was found.
- **Requirement:** A new utility for Supabase Storage is needed. This will involve:
    - Creating a `recipes` bucket in Supabase Storage.
    - Implementing client-side compression (max 1200px WebP) before upload.
    - Generating unique filenames (e.g., `{uuid}-{timestamp}.webp`) to avoid cache issues.

### 4. Database Schema
- **Existing:** `household_item_memory` (defined in `supabase/migrations/20260312190000_phase11_household_item_memory.sql`) stores commonly used items.
- **New Tables:**
    - `recipes`: `id`, `household_id`, `name`, `description` (optional), `image_url` (optional), `created_at`.
    - `recipe_ingredients`: `id`, `recipe_id`, `name` (linked to `household_item_memory` conceptually, though maybe just text to start if loose coupling is preferred, but strong coupling allows category sync), `position`.
- **Foreign Keys:** `recipes.household_id` -> `households.id`. `recipe_ingredients.recipe_id` -> `recipes.id`.

### 5. Routing
- **Pattern:** Follow the `src/routes/(protected)/lister/[id]/` pattern for `src/routes/(protected)/oppskrifter/[id]/`.
- **Sub-routes:**
    - `/oppskrifter/ny` (Create)
    - `/oppskrifter/[id]/rediger` (Edit)

</domain>

<code_context>
## Scoped Patterns
- **Database:** Recipes (`recipes` table) and their ingredient links (`recipe_ingredients`) need to be household-scoped via `my_household_id()`.
- **Storage:** Create a `recipes` bucket in Supabase Storage. Apply RLS policies based on `my_household_id()` in the path.
- **UI Components:** Re-use `ItemInput` logic for the ingredient builder.
- **Queries:** Use TanStack Query for recipe CRUD.

## Integration Points
- `/oppskrifter` is the entry point.
- `/oppskrifter/[id]` for the detail view.
- `/oppskrifter/ny` for the create view.
- `/oppskrifter/[id]/rediger` for editing.
</code_context>

<deferred>
## Deferred Ideas
- Ingredient quantities and units (RECPE-F01).
- Recipe tags/categories (Middag, Frokost, etc.).
- External URL image support.
</deferred>

---
*Phase: 14-recipes*
*Context gathered: 2026-03-13*
