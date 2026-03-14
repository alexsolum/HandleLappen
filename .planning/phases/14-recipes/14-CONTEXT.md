# Phase 14: Recipes - Context

**Gathered:** 2026-03-13
**Status:** Decisions Locked

<domain>
## Phase Boundary

Implement a household-shared recipe system where members can create recipes, manage ingredients using existing household item memory, and add selected ingredients to any shopping list.

## Core Decisions

### 1. Ingredient Selection & Naming
- **Selection Flow:** The ingredient input in the recipe builder MUST mirror the main shopping list's add-item flow: a text field with real-time typeahead suggestions from `household_item_memory`.
- **New Ingredients:** If a user types a new ingredient name, it MUST be saved to `household_item_memory` immediately so it can be assigned a category and used in future lists/recipes.
- **Category Linkage:** Ingredients in recipes ARE NOT "pasted" snapshots; they are live links to the household item. If an item's category is changed in the Admin hub, all recipes using that item MUST reflect the change automatically.
- **Edit View Density:** The ingredient list within the "Edit Recipe" screen MUST use a dense list format (rows with delete buttons) rather than the spacious category-grouped layout of the shopping list.

### 2. "Add to List" UX & Logic
- **Selection UI:** When viewing a recipe, ingredients MUST have checkboxes for multi-select. A single "Legg til i handleliste" button at the bottom handles the batch add.
- **Target List:** Tapping "Add to List" MUST prompt the user to pick which household shopping list they want to add to (using a picker/bottom sheet).
- **Duplicate Handling:** If an item is already on the target list, the app MUST **increment the quantity** (e.g., if "Melk" is on the list with quantity 1, adding it from a recipe makes it 2).
- **Navigation:** After adding items, the app MUST stay on the recipe detail/overview page and show a success toast ("Varene er lagt til i [Listenavn]").

### 3. Recipe Cover Images
- **Source:** Support **local file uploads** only (no external URLs).
- **Compression:** All images MUST be compressed client-side (max 1200px, WebP format) to minimize storage usage and prevent upload failures.
- **Timing:** Image upload MUST happen when the user taps **"Lagre oppskrift"**, not immediately upon file selection.
- **Placeholders:** Recipes without a cover image MUST display a generic, visually consistent placeholder icon or pattern.

### 4. Recipe List Organization
- **Sorting:** The main recipe list MUST be sorted **alphabetically** by name.
- **Layout:** Use **large image cards** for high visual impact in the main list.
- **Search:** Provide a real-time **search bar** at the top of the recipe list.
- **Structure:** Use a **flat list** (no tags or grouping categories in this phase).

</domain>

<code_context>
## Scoped Patterns
- **Database:** Recipes (`recipes` table) and their ingredient links (`recipe_ingredients` joining to `household_item_memory`) need to be household-scoped via `my_household_id()`.
- **Storage:** Create a `recipes` bucket in Supabase Storage. Apply RLS policies based on `my_household_id()` in the path.
- **UI Components:** Re-use `ItemInput` or its suggestion logic for the ingredient builder.
- **Queries:** Use TanStack Query for recipe CRUD.

## Integration Points
- `/oppskrifter` is the entry point (currently a stub).
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
