# Quick Task 3: Add item administration in the Admin→Items section. Rename items to "Varekatalog" - Plan

## Goal

Surface the “Varekatalog” (formerly Items) admin link and deliver a working `/admin/items` page so households can rename items and adjust their category context before we hook up photos and picture management.

## Tasks

### 1. Turn the Admin hub entry into a live “Varekatalog” link
- files: `src/routes/(protected)/admin/+page.svelte`, `tests/admin.spec.ts`
- action: Rename the stub label to “Varekatalog”, point it at `/admin/items`, and keep Brukerinnstillinger as a disabled placeholder.
- verify: `/admin` shows a real link for Varekatalog, and the admin spec expects the new text/href (Brukerinnstillinger is still non-clickable).
- done: The hub no longer displays the old “Items” stub.

### 2. Add an item-memory admin query/mutation layer
- files: `src/lib/queries/item-memory-admin.ts`
- action: Introduce `createItemMemoryQuery` (fetch household_item_memory rows ordered by display_name) and `createUpdateItemMemoryMutation` (rename/recategorize rows with normalized_name upkeep).
- verify: The query resolves and the mutation invalidates the admin query on success.
- done: Admin data can be reloaded after an edit without duplicate code.

### 3. Build the `/admin/items` (Varekatalog) interface
- files: `src/routes/(protected)/admin/items/+page.svelte`
- action: Wire the new query/mutation plus `createCategoriesQuery` to render the list, show counts/last-used date, and expose an inline edit form (name + category dropdown) per item.
- verify: Editing pushes the mutation, clears the form, and refreshed data shows the new values; loading/errors show appropriate placeholders/messages.
- done: The page surfaces a full Varekatalog management view with edit affordances.

### 4. Update regression tests
- files: `tests/admin.spec.ts`
- action: Expect “Varekatalog” link text and verify it points to `/admin/items`; keep the Brukerinnstillinger stub expectation.
- verify: Playwright tests match the live UI strings.
- done: `tests/admin.spec.ts` reflects the new admin hub state.
