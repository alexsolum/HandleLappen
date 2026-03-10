# Phase 3: Store Layouts and Category Ordering - Research

**Researched:** 2026-03-10
**Domain:** Svelte 5 drag-to-reorder, Supabase multi-table schema, gesture handling, category grouping UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Section headers between item groups — a small header row (e.g., "FRUKT OG GRNT") appears above each category's items, all inside one continuous rounded card
- Empty categories (no items from this list) are hidden — only categories with at least one active item are shown
- Items with no category go into an "Andre varer" catch-all group at the bottom of the active list
- The "Handlet (N)" Done section is a flat list — no category headers; store order is irrelevant once items are bought
- In the list detail view — a "Butikk: Ingen" pill/selector in the header area at the top of the list
- Tapping it opens a bottom sheet with a list of saved stores + "Ingen butikk" option
- The selected store is session-only — it resets when the user leaves the list (not saved permanently)
- The Butikker tab shows a list of saved stores, same card-row pattern as Lister
- Each store row is tappable to open its layout — a drag-to-reorder screen for that store's category order
- A "+" row at the bottom to create a new store (freeform name)
- Drag handle (grip icon) on the right side of each category row for reordering — no long-press mode
- A "Standard rekkefølge" entry (or settings icon) in Butikker leads to the default layout screen, which is also where category CRUD (add/rename/delete) lives
- Per-store layout screens only reorder; they do not manage category names
- When a user adds an item by typing and no category is assigned, a category picker modal appears automatically after the item is added
- Modal is dismissible — user can tap outside or tap "Hopp over"; item falls into "Andre varer" if skipped
- Modal shows a scrollable list of all categories to tap-select
- Tap on item row = check off (unchanged)
- Long-press on item row = open item detail sheet (full edit: name, quantity, category)
- The detail sheet contains all three fields: item name, quantity, and category picker
- Category changes take effect immediately — item moves to the new category group in the list view

### Claude's Discretion
- Exact drag-and-drop library or implementation approach for category reordering
- Animation details for item moving to a new category group after assignment
- Visual design of the "Butikk: Ingen" pill (size, placement within header)
- Bottom sheet component implementation
- Long-press gesture timing threshold

### Deferred Ideas (OUT OF SCOPE)
- Geo-location auto-detect and "shopping mode" — future phase
- Auto-suggest category from typed item name (keyword matching) — roadmap backlog; Phase 4 barcode + Gemini is the solution
- Item name and quantity editing from outside the detail sheet — not needed
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CATG-01 | Items in a list are grouped by category (e.g., Produce, Dairy, Meat, Frozen) | Section-header grouping pattern in list view; `category_id` FK on `list_items`; derived grouping logic |
| CATG-02 | Categories sorted by default store layout order reflecting Norwegian grocery stores | Default 13-category layout seeded in migration; `position` integer on `categories` table; query ordered by position |
| CATG-03 | Any family member can create a per-store layout — custom category order for a specific store | `stores` + `store_layouts` tables; drag-to-reorder UI; Butikker tab route activation |
| CATG-04 | Any family member can add, rename, or delete categories | Standard CRUD UI on "Standard rekkefølge" screen; Supabase Realtime on `categories` table; invalidate query on change |
| CATG-05 | User can manually assign or change an item's category | Long-press detail sheet with category picker; auto-category modal after add; optimistic update moves item to correct group |
</phase_requirements>

---

## Summary

Phase 3 adds two major capabilities: (1) category-aware rendering of the shopping list view, and (2) a complete store layout management system via the Butikker tab. The existing list view renders items as a flat array — this must be refactored to derive a sorted, category-grouped structure from the items query result. Three new database tables are needed (`categories`, `stores`, `store_layouts`) with full RLS using the established `my_household_id()` anchor.

The critical UX decision — drag-to-reorder using an explicit grip handle rather than long-press mode — means the native HTML5 drag-and-drop API is unsuitable (no reliable touch support). The recommended library is `svelte-dnd-action` (version 0.9.x, actively maintained), which supports Svelte 5, touch devices with configurable `delayTouchStart`, and the existing `$state()` runes pattern already used in this codebase.

Store selection is session-only (client `$state`, not persisted to DB), which eliminates a table column and simplifies the data model. The bottom sheet for store selection and the category picker modal should be built with the native `<dialog>` element for zero-dependency accessibility, following the pattern already used in the app for modals.

**Primary recommendation:** Use `svelte-dnd-action` for drag-to-reorder (explicit grip handle, touch-safe), native `<dialog>` for bottom sheets and modals, integer `position` column for sort order (gap-of-10 strategy avoids renumbering on typical reorders), and Supabase Realtime on the `categories` table for CATG-04.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `svelte-dnd-action` | 0.9.x (latest) | Drag-to-reorder lists with touch support | Only Svelte-native DnD library with proven touch support, Svelte 5 compatibility, and `delayTouchStart` option to prevent scroll conflicts on mobile |
| `@supabase/supabase-js` | 2.98.x (already in project) | New table CRUD and Realtime subscriptions | Already established in Phase 1/2 |
| `@tanstack/svelte-query` | 6.1.x (already in project) | Optimistic mutations for category assignment | Established in Phase 2; invalidation pattern already in place |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `<dialog>` element | Browser API (no package) | Bottom sheet (store selector) and category picker modal | Already used pattern in web platform — no extra dependency, built-in accessibility (focus trap, ESC close, `aria-modal`) |
| Svelte `$state()` rune | Svelte 5 (already in project) | Session-only store selection state | Store selection is ephemeral — not persisted to DB, so no TanStack Query needed for it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `svelte-dnd-action` | `@rodrigodagostino/svelte-sortable-list` | Sortable-list has more built-in polish but heavier API surface; dnd-action is simpler and the existing codebase uses minimal libraries |
| `svelte-dnd-action` | `@thisux/sveltednd` | sveltednd is Svelte 5 native but has no documented touch/mobile support — unacceptable for this app |
| `svelte-dnd-action` | Pointer-events custom implementation | Custom drag would conflict with the existing `swipe.ts` action (both use `pointerdown`/`pointermove`); library handles coexistence better |
| Native `<dialog>` | `svelte-bottom-sheet` | Extra dependency for functionality the platform provides natively; app already avoids third-party UI libraries |
| Integer `position` (gap-10) | Fractional indexing strings | Fractional indexing avoids renumbering but adds string comparison complexity; category lists are short (13 items max) — integer gaps are sufficient |

**Installation:**
```bash
npm install svelte-dnd-action
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── routes/(protected)/
│   ├── lister/[id]/
│   │   └── +page.svelte          # Add category grouping, store pill, long-press
│   └── butikker/
│       ├── +page.svelte          # Store list (mirrors Lister tab)
│       ├── [id]/+page.svelte     # Per-store category reorder screen
│       └── standard/+page.svelte # Default layout + category CRUD
├── lib/
│   ├── queries/
│   │   ├── categories.ts         # createCategoriesQuery, CRUD mutations
│   │   └── stores.ts             # createStoresQuery, store CRUD, layout mutations
│   ├── components/
│   │   ├── items/
│   │   │   ├── ItemRow.svelte    # Add long-press handler (pointerdown timer)
│   │   │   ├── CategorySection.svelte  # NEW: header + items for one category
│   │   │   ├── CategoryPickerModal.svelte  # NEW: dialog-based category picker
│   │   │   └── ItemDetailSheet.svelte  # NEW: dialog-based edit sheet (name, qty, category)
│   │   └── stores/
│   │       ├── StoreSelector.svelte   # NEW: "Butikk: Ingen" pill + bottom sheet dialog
│   │       ├── StoreRow.svelte        # NEW: store card-row (mirrors ListRow.svelte)
│   │       └── DraggableCategoryRow.svelte  # NEW: category row with grip handle
│   └── actions/
│       └── swipe.ts              # Existing — no changes needed
supabase/migrations/
└── 20260310000005_phase3_categories_stores.sql  # New migration
```

### Pattern 1: Category-Grouped List Rendering

**What:** Derive a sorted array of `{category, items[]}` groups from the flat items query result, using the store's layout order (or default order) when a store is selected. Items with no `category_id` go into a synthetic "Andre varer" group appended last.

**When to use:** In `lister/[id]/+page.svelte` `$derived` — recomputes whenever items data or selectedStore changes.

**Example:**
```typescript
// Derived grouping (in +page.svelte)
const groupedItems = $derived(() => {
  const unchecked = itemsQuery.data?.filter(i => !i.is_checked) ?? []
  // Get ordered categories for current context
  const orderedCategories = selectedStore
    ? storeLayout // store_layouts for selectedStore, sorted by position
    : defaultCategories // categories table, sorted by position

  const groups: Array<{ categoryId: string | null; name: string; items: Item[] }> = []

  for (const cat of orderedCategories) {
    const catItems = unchecked.filter(i => i.category_id === cat.id)
    if (catItems.length > 0) {
      groups.push({ categoryId: cat.id, name: cat.name, items: catItems })
    }
  }

  // Andre varer: items with no category_id
  const uncategorized = unchecked.filter(i => i.category_id == null)
  if (uncategorized.length > 0) {
    groups.push({ categoryId: null, name: 'Andre varer', items: uncategorized })
  }

  return groups
})
```

### Pattern 2: Drag-to-Reorder with svelte-dnd-action

**What:** Use `dndzone` action on a container element; update local state on `consider` (drag in progress) and persist to DB on `finalize` (drag complete). Grip handle on the right side triggers drag.

**When to use:** Butikker screens (both default layout and per-store layout).

**Example:**
```typescript
// Source: https://github.com/isaacHagoel/svelte-dnd-action
import { dndzone, type DndEvent } from 'svelte-dnd-action'

let categories = $state<Array<{id: string; name: string}>>([])

function handleConsider(e: CustomEvent<DndEvent<typeof categories[0]>>) {
  categories = e.detail.items
}

function handleFinalize(e: CustomEvent<DndEvent<typeof categories[0]>>) {
  categories = e.detail.items
  // Persist new positions to DB — batch update position values
  persistOrder(categories)
}
```

```svelte
<div
  use:dndzone={{ items: categories, flipDurationMs: 200, dragStartThreshold: 1, delayTouchStart: true }}
  onconsider={handleConsider}
  onfinalize={handleFinalize}
>
  {#each categories as category (category.id)}
    <div class="...">
      <span>{category.name}</span>
      <!-- Grip handle — the dndzone dragStartThreshold:1 means any movement initiates drag -->
      <span class="drag-handle cursor-grab touch-none" aria-hidden="true">⠿⠿</span>
    </div>
  {/each}
</div>
```

**Note on Svelte 5 event syntax:** `svelte-dnd-action` dispatches custom events `consider` and `finalize`. In Svelte 5, use `onconsider` / `onfinalize` (not `on:consider` / `on:finalize`) for consistency with the rest of the codebase.

### Pattern 3: Long-Press Gesture (pointer events)

**What:** Track `pointerdown` with a timer; if the pointer is still down after threshold (500ms) without movement > 8px, trigger the detail sheet. Cancel on `pointerup` / `pointermove` (if significant movement detected).

**When to use:** `ItemRow.svelte` — replaces the current `onclick` only when a long-press is detected; tap (< 500ms) still calls `onToggle`.

**Example:**
```typescript
// In ItemRow.svelte — add alongside existing swipeLeft action
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 8

function startLongPress(e: PointerEvent) {
  const startX = e.clientX
  const startY = e.clientY
  longPressTimer = setTimeout(() => onLongPress?.(), LONG_PRESS_MS)

  function cancelOnMove(me: PointerEvent) {
    const dx = Math.abs(me.clientX - startX)
    const dy = Math.abs(me.clientY - startY)
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) cancelLongPress()
  }

  window.addEventListener('pointermove', cancelOnMove, { once: false })
  window.addEventListener('pointerup', cancelLongPress, { once: true })
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}
```

**Coexistence with swipeLeft:** The existing `swipe.ts` defers pointer capture until 8px horizontal movement. Long-press timer fires at 500ms with no significant movement — these two interactions are mutually exclusive by design. A swipe cancels the long-press timer via `pointermove`. A long-press that fires means no swipe is in progress.

### Pattern 4: Session-Only Store Selection

**What:** `selectedStoreId` is a Svelte `$state` local to the list page component (or a writable store if needed across navigations — but since it resets on leave, local state is preferred). No DB column needed on `lists` table.

**Example:**
```typescript
// In lister/[id]/+page.svelte
let selectedStoreId = $state<string | null>(null)
// Reset automatically when component is destroyed (page leave)
// Derived label for pill display:
const selectedStoreName = $derived(
  selectedStoreId
    ? storesQuery.data?.find(s => s.id === selectedStoreId)?.name ?? 'Ukjent'
    : 'Ingen'
)
```

### Pattern 5: Native `<dialog>` Bottom Sheet and Modal

**What:** Use the browser's `<dialog>` element with `showModal()` / `close()`. Apply CSS to position it as a bottom sheet (slide-up). No external dependency.

**When to use:** Store selector bottom sheet; category picker modal after add; item detail sheet on long-press.

**Example:**
```svelte
<script lang="ts">
  let dialogEl: HTMLDialogElement

  function open() { dialogEl.showModal() }
  function close() { dialogEl.close() }

  function handleBackdropClick(e: MouseEvent) {
    // dialog fills viewport; click on backdrop = click on dialog element itself
    if (e.target === dialogEl) close()
  }
</script>

<dialog
  bind:this={dialogEl}
  onclick={handleBackdropClick}
  class="fixed bottom-0 left-0 right-0 m-0 w-full max-w-none rounded-t-2xl p-0 backdrop:bg-black/40"
>
  <div class="px-4 py-6">
    <!-- content -->
    <button onclick={close}>Hopp over</button>
  </div>
</dialog>
```

**Accessibility:** Native `<dialog>` automatically traps focus, handles ESC key close, and sets `aria-modal`. No additional ARIA required.

### Anti-Patterns to Avoid

- **Querying items without `category_id`:** The current `createItemsQuery` selects specific columns without `category_id`. Adding `category_id` to the select is a required change — forgetting it means grouping logic always sees `undefined` and puts everything in "Andre varer".
- **Persisting selected store to DB:** The decision is session-only. Do not add a `store_id` column to `lists` — it would break the "resets on leave" behavior and add unnecessary write complexity.
- **Using HTML5 drag-and-drop directly:** `draggable="true"` does not fire on iOS Safari touch. Always use `svelte-dnd-action` which uses pointer events internally.
- **Separate card per category group:** The locked decision specifies one continuous rounded card for all category groups in the active list (with dividers between sections, not separate cards). Do not render each category as its own isolated card.
- **Showing category headers in Done section:** The Done section stays flat. Do not add category logic to `DoneSection.svelte`.
- **Long-press on check-off path:** The `onclick` tap-to-check behavior MUST remain the primary interaction. Long-press is a secondary path. Never block or delay the check-off tap.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch-safe drag-to-reorder | Custom pointer-event drag handler | `svelte-dnd-action` | HTML5 DnD doesn't work on iOS; pointer events conflict with existing swipe action; library handles all edge cases |
| Modal focus trapping | Custom focus trap utility | Native `<dialog>.showModal()` | Platform-native focus trap and ESC handling; no polyfill needed for target browsers (modern PWA installs) |
| Drag position persistence | Fractional index string algorithm | Integer `position` with gap-of-10 | 13 categories max; renumbering is rare; simple integer update suffices |

**Key insight:** This phase's complexity is in data modeling (3 new tables, correct RLS) and UI interaction coexistence (swipe + long-press + tap on the same row). The libraries eliminate the gesture and drag complexity so the implementation focus can stay on data flow and query invalidation.

---

## Common Pitfalls

### Pitfall 1: `category_id` missing from items query select

**What goes wrong:** `createItemsQuery` returns items without `category_id`. Grouping logic sees every item as uncategorized. Category assignment appears to work (DB update succeeds) but UI never regroups.

**Why it happens:** The existing query was built before categories existed. Column must be added explicitly.

**How to avoid:** Update `createItemsQuery` select string: `'id, list_id, name, quantity, is_checked, checked_at, sort_order, category_id, created_at'`. Add `category_id: string | null` to the item type.

**Warning signs:** All items appear in "Andre varer" regardless of assignment.

### Pitfall 2: Supabase Realtime not receiving `categories` table events

**What goes wrong:** User A adds/renames/deletes a category; User B sees no change until refresh.

**Why it happens:** New tables must be explicitly added to the `supabase_realtime` publication. The migration must include `alter publication supabase_realtime add table public.categories;`.

**How to avoid:** Include the publication statement in the migration for `categories`. The pattern is established in Phase 2 for `lists` and `list_items`. Do the same for `categories` — but NOT for `stores` or `store_layouts` (store layouts are not shared in real-time; category names are shared per household).

**Warning signs:** `postgres_changes` subscription on `categories` fires no events in dev.

### Pitfall 3: Drag reorder with `svelte-dnd-action` in Svelte 5 uses wrong event syntax

**What goes wrong:** `on:consider` / `on:finalize` event syntax fails silently or throws a warning in Svelte 5; drag completes but list reverts to previous order.

**Why it happens:** Svelte 5 migrated from `on:event` directive to `onevent` prop syntax. `svelte-dnd-action` dispatches CustomEvents on the DOM element, which work with both, but must be consistent within a file.

**How to avoid:** Use `onconsider` and `onfinalize` (prop syntax) throughout. The library's GitHub release notes confirm both work; use the Svelte 5 style for consistency.

**Warning signs:** Drag works visually but `handleFinalize` is never called.

### Pitfall 4: Long-press and swipeLeft conflict

**What goes wrong:** A slow leftward swipe triggers the long-press detail sheet instead of initiating the swipe-delete.

**Why it happens:** If the long-press timer threshold fires before enough horizontal movement is detected, the timer callback fires.

**How to avoid:** Cancel the long-press timer in the `pointermove` handler if horizontal movement exceeds `MOVE_CANCEL_PX` (8px — matching the existing `DRAG_INTENT_PX` in `swipe.ts`). Since `swipe.ts` also uses 8px as its horizontal intent threshold, movement beyond that cancels the long-press before swipe captures.

**Warning signs:** Long-press fires on fast swipe gestures.

### Pitfall 5: `store_layouts` missing rows for new categories

**What goes wrong:** A household creates a new category. Per-store layouts don't include it. It doesn't appear in the store layout screen.

**Why it happens:** `store_layouts` is a join table between stores and categories. New categories aren't automatically added to existing store layouts.

**How to avoid:** When inserting a new category, also insert a `store_layouts` row for each existing store in the household (appended at the end — highest position + 10). This can be done in the client mutation or via a Postgres trigger. A client-side approach is simpler for this phase.

**Warning signs:** New category appears in "Standard rekkefølge" but not in per-store layout screens.

### Pitfall 6: `dndzone` and touch-action CSS conflict

**What goes wrong:** Drag starts but immediately locks up on mobile; page scrolls instead of dragging.

**Why it happens:** The `touch-action: pan-y` style on `ItemRow.svelte` allows vertical scrolling. The same style on drag containers prevents the browser from recognizing horizontal pointer movement as a drag.

**How to avoid:** Apply `touch-action: none` to the drag handle element only (the grip icon span), not the entire row. `svelte-dnd-action` handles pointer capture internally once drag intent is detected.

**Warning signs:** Drag never initiates on mobile; page scrolls.

---

## Code Examples

### Migration: categories, stores, store_layouts tables

```sql
-- Phase 3 migration (verified pattern — follows Phase 2 structure)

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  position     integer not null default 0,
  created_at   timestamptz default now()
);

create index on public.categories(household_id);
create index on public.categories(household_id, position);

create table public.stores (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

create index on public.stores(household_id);

create table public.store_layouts (
  store_id    uuid not null references public.stores on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  position    integer not null default 0,
  primary key (store_id, category_id)
);

create index on public.store_layouts(store_id, position);

-- Add category_id to list_items
alter table public.list_items
  add column category_id uuid references public.categories on delete set null;

create index on public.list_items(category_id);
```

### RLS Policies (following my_household_id() anchor pattern)

```sql
-- categories: household-scoped CRUD
alter table public.categories enable row level security;

create policy "categories_select" on public.categories for select
  using (household_id = public.my_household_id());
create policy "categories_insert" on public.categories for insert
  with check (household_id = public.my_household_id());
create policy "categories_update" on public.categories for update
  using (household_id = public.my_household_id());
create policy "categories_delete" on public.categories for delete
  using (household_id = public.my_household_id());

-- stores: household-scoped CRUD
alter table public.stores enable row level security;

create policy "stores_select" on public.stores for select
  using (household_id = public.my_household_id());
create policy "stores_insert" on public.stores for insert
  with check (household_id = public.my_household_id());
create policy "stores_update" on public.stores for update
  using (household_id = public.my_household_id());
create policy "stores_delete" on public.stores for delete
  using (household_id = public.my_household_id());

-- store_layouts: scoped via stores join
alter table public.store_layouts enable row level security;

create policy "store_layouts_select" on public.store_layouts for select
  using (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));
create policy "store_layouts_insert" on public.store_layouts for insert
  with check (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));
create policy "store_layouts_update" on public.store_layouts for update
  using (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));
create policy "store_layouts_delete" on public.store_layouts for delete
  using (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));

-- Realtime: categories only (store layouts don't need realtime — session-only store selection)
alter publication supabase_realtime add table public.categories;
```

### Default Norwegian Grocery Category Seed Data

The 13-category default order is inferred from Norwegian grocery store layout conventions (produce at entrance, dry goods in center aisles, frozen and dairy at perimeter). This is treated as a testable hypothesis — per-store override is the escape hatch for households who disagree.

```sql
-- Seed default categories for new households
-- Called during household creation (or via a Postgres function)
-- position values use gap-of-10 to allow easy insertion

-- Position 10: Frukt og grønt (produce — always at entrance)
-- Position 20: Brød og bakevarer (bakery)
-- Position 30: Pålegg og kjøtt (deli/cold cuts)
-- Position 40: Meieri og egg (dairy/eggs)
-- Position 50: Kjøtt og fisk (meat/fish)
-- Position 60: Hermetikk og glass (canned goods)
-- Position 70: Pasta, ris og korn (pasta/rice/grains)
-- Position 80: Snacks og godteri (snacks)
-- Position 90: Drikke (beverages)
-- Position 100: Rengjøring (cleaning products)
-- Position 110: Helse og hygiene (health/hygiene)
-- Position 120: Kjøl og frys (refrigerated/frozen — perimeter back)
-- Position 130: Andre varer (catch-all — always last, synthetic, not stored)
```

Note: "Andre varer" is a synthetic client-side group for uncategorized items — it is NOT stored as a `categories` row. It is always appended last in rendering logic.

### Optimistic Category Assignment Mutation

```typescript
// Source: follows Phase 2 createCheckOffMutation pattern
export function createAssignCategoryMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation(() => ({
    mutationFn: async ({ itemId, categoryId }: { itemId: string; categoryId: string | null }) => {
      const { error } = await supabase
        .from('list_items')
        .update({ category_id: categoryId })
        .eq('id', itemId)
      if (error) throw error
    },
    onMutate: async ({ itemId, categoryId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any[] = []) =>
        old.map(item => item.id === itemId ? { ...item, category_id: categoryId } : item)
      )
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }))
}
```

### Realtime Subscription on categories (follows Phase 2 pattern)

```typescript
// Source: follows list_items channel pattern in lister/[id]/+page.svelte
const categoriesChannel = supabase
  .channel(`categories-${householdId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'categories' },
    // No filter needed — RLS ensures only household's categories arrive
    () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey(householdId) })
  )
  .subscribe()
```

### Drag Reorder Position Persistence (batch update)

```typescript
// After dndzone finalize — write new positions to DB
async function persistCategoryOrder(
  supabase: SupabaseClient,
  orderedCategories: Array<{ id: string }>
) {
  // Gap-of-10: position 10, 20, 30...
  const updates = orderedCategories.map((cat, index) => ({
    id: cat.id,
    position: (index + 1) * 10,
  }))
  // Supabase upsert batch
  const { error } = await supabase
    .from('categories')
    .upsert(updates, { onConflict: 'id' })
  if (error) throw error
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 `draggable` attribute | Pointer-events based DnD (svelte-dnd-action) | iOS 13+ era | Touch devices work reliably |
| Custom modal/dialog divs | Native `<dialog>` element | Browsers 2022+ | Zero-dependency focus trap and a11y |
| Full position renumber on reorder | Gap-of-10 integers, occasional renumber | Established pattern | Avoids full table scan on every reorder |
| `on:event` directive | `onevent` prop in Svelte 5 | Svelte 5.0 (Oct 2024) | Required for consistency in this codebase |

**Deprecated/outdated:**
- `on:consider` / `on:finalize`: Use `onconsider` / `onfinalize` in Svelte 5 files. Both work but Svelte 5 style required for consistency.
- `draggable="true"` attribute: Do not use — no reliable touch support on iOS/Android.

---

## Open Questions

1. **Household-level category seeding**
   - What we know: Categories are per-household. A new household starts with no categories.
   - What's unclear: Should the 13 default categories be seeded via a Postgres function called on household creation, or via a client-side mutation during onboarding?
   - Recommendation: Seed via a SQL function `seed_default_categories(household_id)` called in the household INSERT trigger (or in the Supabase Edge Function if one handles onboarding). This ensures categories exist before Phase 4 barcode features.

2. **`store_layouts` population for new stores**
   - What we know: Creating a new store needs a `store_layouts` row for every existing category.
   - What's unclear: Should this be a client-side loop or a Postgres function?
   - Recommendation: Use a client-side mutation that inserts all rows in one `supabase.from('store_layouts').insert(rows)` batch call. Simple enough without a trigger.

3. **Category ordering for items query**
   - What we know: Items query needs to support grouping by category in the correct order.
   - What's unclear: Whether to sort at DB level (join to `categories` order by position) or client level.
   - Recommendation: Sort client-side in the `$derived` grouping logic. The categories query result is already ordered by position; the derived grouping iterates categories in that order. This avoids a complex join in the items query and follows the existing pattern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.x |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/categories.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CATG-01 | Items in list grouped by category with section headers | e2e | `npx playwright test tests/categories.spec.ts -g "category grouping"` | Wave 0 |
| CATG-02 | Default category order matches Norwegian store layout | e2e | `npx playwright test tests/categories.spec.ts -g "default order"` | Wave 0 |
| CATG-03 | Family member creates per-store layout and reorders categories | e2e (manual drag) | Manual-only — drag reorder not automatable in Playwright without CDP tricks | Wave 0 (stub) |
| CATG-04 | Family member can add, rename, delete categories; changes sync to all devices | e2e | `npx playwright test tests/categories.spec.ts -g "category crud"` | Wave 0 |
| CATG-05 | User assigns category to item; item moves to correct group immediately | e2e | `npx playwright test tests/categories.spec.ts -g "assign category"` | Wave 0 |

**CATG-03 note:** Drag-to-reorder via Playwright is not reliable without low-level CDP mouse simulation. The test for CATG-03 should stub the drag interaction and instead test the result (persisted order in DB) via an admin client assertion. The drag UX itself is verified manually.

### Sampling Rate
- **Per task commit:** `npx playwright test tests/categories.spec.ts`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/categories.spec.ts` — covers CATG-01, CATG-02, CATG-04, CATG-05 (CATG-03 as stub)
- [ ] `tests/helpers/categories.ts` — admin helper: `createTestCategory`, `seedDefaultCategories`, `deleteTestCategory`

---

## Sources

### Primary (HIGH confidence)
- `src/lib/queries/items.ts` — existing query shape, mutation pattern established in Phase 2
- `src/routes/(protected)/lister/[id]/+page.svelte` — existing list rendering (flat, to be refactored)
- `src/lib/actions/swipe.ts` — existing swipe action; confirms pointer-event pattern and 8px intent threshold
- `supabase/migrations/20260309000004_phase2_shopping_lists.sql` — RLS policy pattern using `my_household_id()`
- `supabase/migrations/20260308000001_phase1_foundation.sql` — `my_household_id()` SECURITY DEFINER function

### Secondary (MEDIUM confidence)
- [svelte-dnd-action GitHub](https://github.com/isaacHagoel/svelte-dnd-action) — Svelte 5 compatibility confirmed, touch support via `delayTouchStart`, version 0.9.69 active
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) — publication pattern verified; matches Phase 2 implementation
- [TanStack Query Svelte optimistic updates example](https://tanstack.com/query/v5/docs/framework/svelte/examples/optimistic-updates) — verified pattern matches Phase 2 codebase

### Tertiary (LOW confidence)
- Norwegian store layout category order (13 categories) — inferred from general grocery store layout conventions; no official Norwegian standard documented publicly. STATE.md explicitly flags this as a testable hypothesis.
- `svelte-dnd-action` Svelte 5 event syntax (`onconsider` / `onfinalize`) — confirmed in search results that both syntaxes work; Svelte 5 style preferred for consistency

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — svelte-dnd-action verified on GitHub, all other libraries already in project
- Architecture: HIGH — patterns directly derived from existing Phase 2 code
- Pitfalls: HIGH — derived from direct code analysis (swipe.ts thresholds, existing query shape, realtime publication pattern)
- Default category order: LOW — inferred from general grocery conventions, not a measured Norwegian standard

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable libraries; svelte-dnd-action patch updates don't affect API)
