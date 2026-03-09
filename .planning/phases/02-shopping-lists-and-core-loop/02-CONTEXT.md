# Phase 2: Shopping Lists and Core Loop - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Family members can create household-scoped shopping lists, add/remove items with optional quantity, check items off while shopping, and see changes appear on all devices within a few seconds — with every check-off written to the history log. Categories, store association, barcode scanning, and offline support are downstream phases.

Shopping lists are general-purpose and NOT named by or bound to a store at creation time. The store is selected at shopping time (Phase 3), not at list creation time.

</domain>

<decisions>
## Implementation Decisions

### List management screen (home screen)
- Vertical list layout — full-width rows, one per list
- Each row shows: list name + item count (e.g., "Ukens handel · 7 ting")
- Create new list: inline "+" row at the bottom of the list; tapping it reveals an inline text input in the same row; submit creates the list and clears the input
- Delete list: swipe left on a list row reveals a red delete button

### Check-off behavior
- Tap anywhere on the item row to toggle checked/unchecked
- Checked items move to a collapsed "Handlet (N)" section at the bottom of the list
- The Done section is collapsed by default; tap the header to expand and see checked items
- Un-checking is allowed: tapping a checked item moves it back to the active list

### Item entry UX
- A persistent input bar is fixed at the bottom of the list screen (sits above the keyboard when open)
- Items have two fields: a name (required) and an optional quantity (number input)
- After submitting: input clears and stays focused — the keyboard stays open so the user can add the next item immediately (bulk-entry pattern)
- Delete items: swipe left on an item row to reveal a red delete button (consistent with list delete pattern)

### Navigation structure
- Phase 2 introduces bottom tab navigation in the protected layout
- Tabs: **Lister** (active), **Husstand** (active), **Butikker** (greyed out — Phase 3 placeholder), **Anbefalinger** (greyed out — Phase 6 placeholder)
- Opening a list shows a list-detail view with a back arrow ("← Lister") in the top header; bottom nav remains visible
- Logout moves from the top header to the Husstand tab area (e.g., at the bottom of the husstand screen)
- The existing protected layout header is updated: remove the logout button, keep the brand name or replace with contextual back navigation

### Claude's Discretion
- Exact animation for items moving to the Done section (slide, fade, or instant)
- Swipe gesture implementation details (threshold, reveal width, cancel behavior)
- Visual design of the bottom nav (icon choices, active state color, label size)
- Greyed-out tab appearance (opacity, disabled interaction or show a "coming soon" tooltip)
- Empty state for a new list with no items
- Empty state for the home screen with no lists yet

</decisions>

<specifics>
## Specific Ideas

- Lists are general-purpose ("Ukens handel", "Helgehandling") — not named by store. Store selection happens at shopping time in Phase 3, not at list creation.
- The Done section label should use Norwegian: "Handlet (N)" where N is the count of checked items
- The bottom nav placeholder tabs (Butikker, Anbefalinger) are greyed out from day one — communicates the product roadmap without blocking current functionality

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/ui/button/button.svelte` — shadcn-svelte Button component, already in codebase
- `src/lib/components/ui/input/input.svelte` — shadcn-svelte Input component, already in codebase
- `src/routes/(protected)/+layout.svelte` — protected layout with top header; will be updated to add bottom nav and remove logout button
- `src/routes/(protected)/husstand/+page.svelte` — white `rounded-xl border border-gray-200` card pattern established here — reuse for list rows
- `src/hooks.server.ts` + `locals.household_id` — household context already injected server-side; all list/item queries can use `my_household_id()` RLS

### Established Patterns
- White card rows with `rounded-xl border border-gray-200 divide-y divide-gray-100` — use for list rows and item rows
- Green accent: `text-green-700`, `bg-green-100` — reuse for active state, checked-off avatars
- `bg-gray-50` page background — established in protected layout
- Section headers: `text-sm font-medium text-gray-500 uppercase tracking-wide` — use for "Handlet (N)" section header
- `max-w-lg mx-auto` content constraint — established in husstand page; use for list and item views
- Mobile-first: touch targets, one-handed reachability (bottom input bar, thumb-zone consideration)
- Norwegian language throughout: button labels, empty states, section headers

### Integration Points
- `my_household_id()` SECURITY DEFINER function — anchor for all RLS on `lists`, `list_items`, `item_history` tables
- Supabase Realtime: per-open-list subscription (TanStack Query invalidation on event)
- TanStack Query: established in this phase — sets the data-fetching pattern all future phases follow
- `item_history` write: happens on check-off mutation, same transaction/effect as the `is_checked` update
- Bottom nav in `(protected)/+layout.svelte`: updates this shared layout — affects all existing protected routes (husstand, home)

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-shopping-lists-and-core-loop*
*Context gathered: 2026-03-09*
