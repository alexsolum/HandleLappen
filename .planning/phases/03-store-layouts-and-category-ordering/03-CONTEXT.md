# Phase 3: Store Layouts and Category Ordering - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Items in every shopping list are grouped by category in Norwegian store order. Any family member can create a per-store layout (custom category order), manage categories (add/rename/delete), and assign or change a category on any item. The "Butikker" tab (currently greyed out) gets activated. Barcode-based auto-categorization and geo-location are downstream phases.

</domain>

<decisions>
## Implementation Decisions

### Category display in list view
- Section headers between item groups — a small header row (e.g., "FRUKT OG GRNT") appears above each category's items, all inside one continuous rounded card
- Empty categories (no items from this list) are hidden — only categories with at least one active item are shown
- Items with no category go into an "Andre varer" catch-all group at the bottom of the active list
- The "Handlet (N)" Done section is a flat list — no category headers; store order is irrelevant once items are bought

### Store selection UX
- In the list detail view — a "Butikk: Ingen" pill/selector in the header area at the top of the list
- Tapping it opens a bottom sheet with a list of saved stores + "Ingen butikk" option
- The selected store is session-only — it resets when the user leaves the list (not saved permanently with the list)

### Store layout management (Butikker tab)
- The Butikker tab (activated in this phase) shows a list of saved stores, same card-row pattern as Lister
- Each store row is tappable to open its layout — a drag-to-reorder screen for that store's category order
- A "+" row at the bottom to create a new store (freeform name, e.g., "Rema 1000 Majorstua")
- Drag handle (⠿⠿ grip icon) on the right side of each category row for reordering — no long-press mode
- A "Standard rekkefølge" entry (or settings icon) in Butikker leads to the default layout screen, which is also where category CRUD (add/rename/delete) lives
- Per-store layout screens only reorder; they do not manage category names

### Category assignment on items
- When a user adds an item by typing and no category is assigned, a category picker modal appears automatically after the item is added
- Modal is dismissible — user can tap outside or tap "Hopp over"; item falls into "Andre varer" if skipped
- Modal shows a scrollable list of all categories to tap-select
- Tap on item row = check off (unchanged, consistent with Phase 2 — shopping check-off must be effortless)
- Long-press on item row = open item detail sheet (full edit: name, quantity, category)
- The detail sheet contains all three fields: item name, quantity, and category picker
- Category changes take effect immediately — item moves to the new category group in the list view

### Claude's Discretion
- Exact drag-and-drop library or implementation approach for category reordering
- Animation details for item moving to a new category group after assignment
- Visual design of the "Butikk: Ingen" pill (size, placement within header)
- Bottom sheet component implementation
- Long-press gesture timing threshold

</decisions>

<specifics>
## Specific Ideas

- Store selection is session-only (not persisted with the list) — user selects it each shopping trip at the store
- Geo-location auto-detect and "shopping mode" noted for roadmap backlog — not in Phase 3
- Auto-suggest category from item name (keyword matching) noted for roadmap backlog — Phase 4 (barcode + Gemini) is the real solution
- The check-off interaction must stay simple and fast — the long-press path to edit must not interfere with the one-tap check-off

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/items/ItemRow.svelte` — renders item rows; will need to add long-press handler, remove tap-to-check conflict. Existing swipe-left delete stays.
- `src/lib/actions/swipe.ts` — swipe gesture action; check if it can coexist with drag-to-reorder (different interaction)
- `src/lib/components/items/DoneSection.svelte` — already a separate component; stays flat, no changes needed for categories
- `src/lib/queries/items.ts` — currently fetches items without category; needs `category_id` added to select and sort
- `src/lib/components/lists/BottomNav.svelte` — Butikker tab is already present (greyed out); activate it in this phase
- `src/routes/(protected)/lister/[id]/+page.svelte` — flat item list; restructure to group items by category using section headers
- shadcn-svelte Button + Input components already in codebase

### Established Patterns
- White card rows `rounded-xl border border-gray-200 divide-y divide-gray-100` — reuse for store rows and category rows
- Section headers `text-sm font-medium text-gray-500 uppercase tracking-wide` — reuse for category headings within the list
- Green accent `text-green-700`, `bg-green-100` — reuse for active states
- `bg-gray-50` page background — keep consistent
- `max-w-lg mx-auto` content constraint — use for Butikker screens
- Mobile-first: touch targets, thumb zone — drag handles must be large enough for mobile
- Norwegian language throughout: "Ingen butikk", "Andre varer", "Hopp over", "Standard rekkefølge"
- TanStack Query with optimistic updates (established in Phase 2) — use for category assignment mutations
- Supabase Realtime channel subscriptions (established in Phase 2) — categories table changes must propagate to all devices (CATG-04)

### Integration Points
- `list_items` table: needs `category_id` column (FK to `categories`)
- New tables: `categories` (id, household_id, name, position), `stores` (id, household_id, name), `store_layouts` (store_id, category_id, position)
- `my_household_id()` RLS anchor — all new tables scoped to household
- `lists` table: may need `store_id` column — but store is session-only, so this may be client-state only (not persisted)
- Realtime subscriptions needed for: `categories` table (add/rename/delete propagate to all devices)

</code_context>

<deferred>
## Deferred Ideas

- Geo-location auto store detection + automatic "shopping mode" — a future phase (requires GPS API, geofencing, background location)
- Auto-suggest category from typed item name (keyword matching, e.g., "melk" → Meieri) — roadmap backlog; Phase 4 covers the real solution via barcode + Gemini AI
- Item name and quantity editing from outside the detail sheet — not needed; the long-press detail sheet covers this

</deferred>

---

*Phase: 03-store-layouts-and-category-ordering*
*Context gathered: 2026-03-10*
