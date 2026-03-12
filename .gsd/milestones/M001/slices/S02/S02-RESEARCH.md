# Phase 2: Shopping Lists and Core Loop - Research

**Researched:** 2026-03-09
**Domain:** SvelteKit 5 + TanStack Query v6 + Supabase Realtime (postgres_changes) + mobile swipe gestures
**Confidence:** HIGH (core stack), MEDIUM (swipe implementation details)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**List management screen (home screen)**
- Vertical list layout — full-width rows, one per list
- Each row shows: list name + item count (e.g., "Ukens handel · 7 ting")
- Create new list: inline "+" row at the bottom of the list; tapping it reveals an inline text input in the same row; submit creates the list and clears the input
- Delete list: swipe left on a list row reveals a red delete button

**Check-off behavior**
- Tap anywhere on the item row to toggle checked/unchecked
- Checked items move to a collapsed "Handlet (N)" section at the bottom of the list
- The Done section is collapsed by default; tap the header to expand and see checked items
- Un-checking is allowed: tapping a checked item moves it back to the active list

**Item entry UX**
- A persistent input bar is fixed at the bottom of the list screen (sits above the keyboard when open)
- Items have two fields: a name (required) and an optional quantity (number input)
- After submitting: input clears and stays focused — the keyboard stays open so the user can add the next item immediately (bulk-entry pattern)
- Delete items: swipe left on an item row to reveal a red delete button (consistent with list delete pattern)

**Navigation structure**
- Phase 2 introduces bottom tab navigation in the protected layout
- Tabs: Lister (active), Husstand (active), Butikker (greyed out — Phase 3 placeholder), Anbefalinger (greyed out — Phase 6 placeholder)
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

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIST-01 | User can create a named shopping list | DB schema (lists table), TanStack Query createMutation, optimistic insert |
| LIST-02 | User can delete a shopping list | Swipe-to-delete gesture, TanStack Query mutation with optimistic rollback |
| LIST-03 | User can add an item to a list by typing a name | DB schema (list_items table), persistent input bar pattern, createMutation |
| LIST-04 | User can remove an item from a list | Swipe-to-delete on item rows, same mutation pattern as LIST-02 |
| LIST-05 | User can check off an item while shopping (marks as done) | Toggle mutation + item_history insert in same DB call, optimistic UI |
| LIST-06 | Changes sync to all family devices within a few seconds | Supabase Realtime postgres_changes → invalidateQueries on active list query |
| HIST-01 | Every check-off logged to item_history (name, list, timestamp, who) | item_history table schema, write on LIST-05 mutation, RLS scoped to household |
</phase_requirements>

---

## Summary

Phase 2 introduces the core data loop of the app: lists, items, real-time sync, and history. It also establishes TanStack Query as the client-side data layer for all future phases. The three technical sub-challenges are: (1) getting TanStack Query v6 correctly set up with Svelte 5's runes and SvelteKit's SSR model, (2) wiring Supabase Realtime `postgres_changes` subscriptions so that updates on one device appear on a second device within 3 seconds, and (3) implementing swipe-to-delete gestures reliably on mobile without a heavy library.

The database layer is straightforward: three new tables (`lists`, `list_items`, `item_history`) all scoped by the existing `my_household_id()` SECURITY DEFINER function. The existing RLS pattern from Phase 1 carries forward unchanged. History logging (`HIST-01`) happens in the same mutation call as the check-off toggle — not a separate trigger — so there is no risk of missed writes.

The most subtle risk is the Supabase Realtime publication: tables must be explicitly added to the `supabase_realtime` publication, and RLS must be enabled, before `postgres_changes` events are delivered to subscribers. Missing either step produces silent failure (no events, no error).

**Primary recommendation:** Use `@tanstack/svelte-query` v6 (Svelte 5 rune-native), Supabase `postgres_changes` subscriptions scoped per open list, and a hand-rolled pointer-event swipe action — no additional gesture library required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/svelte-query` | ^6.1.0 | Client-side async state (queries, mutations, cache, optimistic updates) | v6 is the first version with full Svelte 5 rune support; v5 was buggy with Svelte 5 |
| `@tanstack/query-core` | ^5.x (peer of v6) | Underlying engine for svelte-query v6 | Bundled as peer dependency |
| `@supabase/supabase-js` | ^2.98.0 (already installed) | Supabase client for DB queries and Realtime channel | Already in codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `svelte-gestures` | latest | Pointer-based swipe gesture recogniser | If hand-rolled pointer action proves brittle across iOS/Android |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/svelte-query` v6 | v5 | v5 has Svelte 5 store compatibility issues; v6 is the correct choice |
| Hand-rolled pointer swipe | `svelte-gestures` or `@svelte-put/swipeable` | Library adds ~15 KB; hand-rolled is simpler for a single translate-X swipe reveal |
| Realtime + invalidateQueries | Realtime + manual state splice | invalidateQueries is safer and simpler; avoids stale-merge bugs |

**Installation:**
```bash
npm install @tanstack/svelte-query
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── lists/
│   │   │   ├── ListRow.svelte         # single list row with swipe-delete
│   │   │   ├── ListCreateRow.svelte   # inline "+" create row at bottom
│   │   │   └── BottomNav.svelte       # 4-tab bottom navigation bar
│   │   ├── items/
│   │   │   ├── ItemRow.svelte         # single item row with check-off + swipe-delete
│   │   │   ├── ItemInput.svelte       # persistent bottom input bar
│   │   │   └── DoneSection.svelte     # collapsed "Handlet (N)" section
│   │   └── ui/                        # (existing shadcn-svelte components)
│   ├── actions/
│   │   └── swipe.ts                   # hand-rolled Svelte action for swipe-left reveal
│   ├── queries/
│   │   ├── lists.ts                   # createQuery / createMutation factories for lists
│   │   └── items.ts                   # createQuery / createMutation factories for items
│   └── types/
│       └── database.ts                # (extend with new tables after migration)
├── routes/
│   ├── (protected)/
│   │   ├── +layout.svelte             # ADD: QueryClientProvider + bottom nav
│   │   ├── +layout.server.ts          # (unchanged)
│   │   ├── +page.svelte               # REPLACE: becomes Lister home screen
│   │   ├── lister/
│   │   │   └── [id]/
│   │   │       ├── +page.svelte       # list-detail view (items)
│   │   │       └── +page.server.ts    # initial SSR load of items for the list
│   │   └── husstand/
│   │       └── +page.svelte           # MOVE logout button here
└── supabase/
    └── migrations/
        └── 20260309000004_phase2_shopping_lists.sql
```

### Pattern 1: TanStack Query v6 Setup in SvelteKit Protected Layout

**What:** `QueryClientProvider` wraps the protected layout. `QueryClient` is constructed with `browser` guard so SSR never runs client queries.
**When to use:** Once, in `(protected)/+layout.svelte`. All protected pages inherit the client.

```svelte
<!-- src/routes/(protected)/+layout.svelte -->
<script lang="ts">
  import { browser } from '$app/environment'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'

  let { data, children } = $props()

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 30_000,       // 30 s — lists change frequently
        gcTime: 5 * 60_000,      // 5 min garbage collection
      },
    },
  })
</script>

<QueryClientProvider client={queryClient}>
  <!-- bottom nav + main content -->
  {@render children()}
</QueryClientProvider>
```

Source: TanStack Query Svelte docs (overview), npm @tanstack/svelte-query v6

### Pattern 2: createQuery with Thunk (Svelte 5 Rune Reactive)

**What:** In v6, options passed to `createQuery` must be a **thunk** (arrow function returning the options object) to preserve reactivity. This is the breaking change from v5.
**When to use:** Every `createQuery` call in the codebase.

```svelte
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'
  import { getContext } from 'svelte'

  // supabase client comes from layout data or context
  let { data } = $props()

  const listsQuery = createQuery(() => ({
    queryKey: ['lists', data.user.id],
    queryFn: async () => {
      const { data: lists, error } = await data.supabase
        .from('lists')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return lists
    },
  }))
</script>

{#if listsQuery.isPending}
  <p class="text-sm text-gray-400">Laster lister…</p>
{:else if listsQuery.isError}
  <p class="text-sm text-red-600">Kunne ikke laste lister.</p>
{:else}
  {#each listsQuery.data as list (list.id)}
    <!-- ListRow component -->
  {/each}
{/if}
```

Note: In v6, `createQuery` returns a reactive object directly (not a store), accessed as `listsQuery.isPending`, not `$listsQuery.isPending`. Verify against v6 docs at build time — this distinction changed between v5 and v6.

### Pattern 3: Optimistic Mutation (check-off toggle + history write)

**What:** `onMutate` snapshots cache, applies optimistic update; `onError` rolls back; `onSuccess` invalidates to fetch fresh data. The history row insert happens server-side (or via a second Supabase call in the mutationFn) to guarantee atomicity.
**When to use:** LIST-05 (check-off) and LIST-01/02/03/04 (CRUD).

```typescript
// src/lib/queries/items.ts
import { createMutation, useQueryClient } from '@tanstack/svelte-query'

export function createCheckOffMutation(supabase, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['items', listId]

  return createMutation(() => ({
    mutationFn: async ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) => {
      // 1. Toggle the item
      const { error: itemError } = await supabase
        .from('list_items')
        .update({ is_checked: isChecked, checked_at: isChecked ? new Date().toISOString() : null })
        .eq('id', itemId)
      if (itemError) throw itemError

      // 2. Write history row on check-off (HIST-01)
      if (isChecked) {
        const { error: histError } = await supabase
          .from('item_history')
          .insert({ item_id: itemId, list_id: listId, checked_at: new Date().toISOString() })
        if (histError) throw histError
      }
    },

    onMutate: async ({ itemId, isChecked }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any[]) =>
        old.map((item) =>
          item.id === itemId ? { ...item, is_checked: isChecked } : item
        )
      )
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  }))
}
```

### Pattern 4: Supabase Realtime Subscription (per open list)

**What:** Subscribe to `postgres_changes` on `list_items` filtered by `list_id` when a list detail page mounts; unsubscribe on destroy. On any event, call `invalidateQueries` on the matching TanStack Query key.
**When to use:** In the list-detail page component, inside `$effect` (Svelte 5 rune lifecycle).

```svelte
<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { onDestroy } from 'svelte'

  let { data } = $props()     // data.supabase, data.listId
  const queryClient = useQueryClient()
  const queryKey = ['items', data.listId]

  // Realtime subscription scoped to this list
  const channel = data.supabase
    .channel(`list-items-${data.listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'list_items',
        filter: `list_id=eq.${data.listId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey })
      }
    )
    .subscribe()

  onDestroy(() => {
    data.supabase.removeChannel(channel)
  })
</script>
```

**Critical prerequisite:** The `list_items` table must be added to the `supabase_realtime` publication in the migration:
```sql
alter publication supabase_realtime add table public.list_items;
```
RLS must also be enabled on the table (which it will be). Without the publication entry, no events are delivered — silently.

### Pattern 5: Hand-Rolled Swipe-Left Reveal Action

**What:** A Svelte action (`use:swipeLeft`) that listens to `pointerdown`/`pointermove`/`pointerup` events, translates the row left by up to N px when swiping, and reveals a red delete button underneath. Cancel threshold returns the row to rest.
**When to use:** On both list rows and item rows. Keep it consistent.

```typescript
// src/lib/actions/swipe.ts
import type { Action } from 'svelte/action'

interface SwipeOptions {
  onDelete: () => void
  revealWidth?: number   // default 80
  threshold?: number     // default 60 (px to commit delete)
}

export const swipeLeft: Action<HTMLElement, SwipeOptions> = (node, options) => {
  const { onDelete, revealWidth = 80, threshold = 60 } = options ?? {}
  let startX = 0
  let currentX = 0
  let dragging = false

  function onPointerDown(e: PointerEvent) {
    startX = e.clientX
    dragging = true
    node.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    const dx = Math.min(0, e.clientX - startX)   // left-only
    currentX = Math.max(-revealWidth, dx)
    node.style.transform = `translateX(${currentX}px)`
  }

  function onPointerUp() {
    dragging = false
    if (Math.abs(currentX) >= threshold) {
      onDelete?.()
    }
    // Snap back
    currentX = 0
    node.style.transform = 'translateX(0)'
    node.style.transition = 'transform 0.2s ease'
    setTimeout(() => { node.style.transition = '' }, 200)
  }

  node.addEventListener('pointerdown', onPointerDown)
  node.addEventListener('pointermove', onPointerMove)
  node.addEventListener('pointerup', onPointerUp)
  node.addEventListener('pointercancel', onPointerUp)

  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointermove', onPointerMove)
      node.removeEventListener('pointerup', onPointerUp)
      node.removeEventListener('pointercancel', onPointerUp)
    },
  }
}
```

Svelte 5 note: Touch handlers in Svelte 5 are passive by default (improving scroll performance), but `pointer` events are not passive by default, so `use:swipeLeft` based on pointer events is safe.

### Anti-Patterns to Avoid

- **`$listsQuery.isPending` store syntax in v6:** TanStack Query v6 returns reactive objects (rune-based), not Svelte stores. Do not use the `$` prefix dereference. Verify pattern at implementation time.
- **Creating `QueryClient` outside the component tree:** Instantiate inside the layout component so each browser session gets one instance; avoid module-level globals which break SSR.
- **Subscribing to Realtime in a load function:** Supabase Realtime channels require a browser WebSocket — they must be set up in `onMount` or Svelte 5 `$effect`, never in `+page.server.ts` or `+layout.server.ts`.
- **Writing history (HIST-01) in a Postgres trigger:** The CONTEXT specifies "same transaction/effect as the is_checked update." Using a Postgres trigger is acceptable but adds migration complexity and makes the write invisible to the Svelte layer. Keep history writes in the `mutationFn` for observability and easier testing.
- **Global list-level subscription:** Subscribe only when a list is open (per-list-id channel), not a blanket subscription to all `list_items` changes. This avoids delivering irrelevant events and keeps RLS checks minimal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async state caching + background refetch | Custom Svelte stores with setTimeout | `@tanstack/svelte-query` createQuery | Race conditions, stale-while-revalidate, dedup, error retry — all solved |
| Optimistic updates with rollback | Boolean flags + manual deep clone | TanStack Query `onMutate` / `onError` context pattern | Snapshot/restore is a 3-line pattern; hand-rolled fails on concurrent mutations |
| Real-time push to all devices | Polling (`setInterval` every N seconds) | Supabase Realtime `postgres_changes` | Polling can't hit 3-second SLA without hammering the DB; Realtime uses WebSocket push |
| Swipe gesture | CSS-only transform on `:active` | Pointer-event action (custom) | CSS `:active` doesn't track finger drag; needs `pointermove` |
| RLS per-household filtering in Realtime | Client-side filter of received events | Supabase RLS on the table (WALRUS) | Events are filtered server-side before reaching the client; no client-side leakage |

**Key insight:** TanStack Query's `onMutate`/`onError` pattern for optimistic updates is one of the highest-complexity UI state problems in web apps. Do not hand-roll it.

---

## Database Schema

Three new tables for Phase 2. All anchor to `my_household_id()` for RLS.

```sql
-- Migration: 20260309000004_phase2_shopping_lists.sql

-- ── TABLES ────────────────────────────────────────────────────────────────

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

create index on public.lists(household_id);

create table public.list_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists on delete cascade,
  name       text not null,
  quantity   integer,                    -- optional (NULL = no quantity shown)
  is_checked boolean not null default false,
  checked_at timestamptz,               -- set when is_checked flips to true
  sort_order integer not null default 0, -- for future manual reorder (Phase 3+)
  created_at timestamptz default now()
);

create index on public.list_items(list_id);
create index on public.list_items(list_id, is_checked); -- optimises split view query

create table public.item_history (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists on delete cascade,
  item_id     uuid references public.list_items on delete set null,
  item_name   text not null,            -- denormalised: name at time of check-off
  checked_by  uuid references auth.users on delete set null,
  checked_at  timestamptz not null default now()
);

create index on public.item_history(list_id);
create index on public.item_history(checked_at);

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.lists        enable row level security;
alter table public.list_items   enable row level security;
alter table public.item_history enable row level security;

-- lists: scoped to household
create policy "lists_select" on public.lists for select
  using (household_id = public.my_household_id());
create policy "lists_insert" on public.lists for insert
  with check (household_id = public.my_household_id());
create policy "lists_delete" on public.lists for delete
  using (household_id = public.my_household_id());

-- list_items: join through lists to get household scope
create policy "list_items_select" on public.list_items for select
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "list_items_insert" on public.list_items for insert
  with check (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "list_items_update" on public.list_items for update
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "list_items_delete" on public.list_items for delete
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));

-- item_history: household-scoped via list
create policy "item_history_select" on public.item_history for select
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "item_history_insert" on public.item_history for insert
  with check (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));

-- ── REALTIME PUBLICATION ──────────────────────────────────────────────────
-- list_items must be in the publication for postgres_changes events to fire.
-- lists is added so the Lister home screen updates when another device creates a list.

alter publication supabase_realtime add table public.list_items;
alter publication supabase_realtime add table public.lists;
```

**Note on `item_history` and Realtime:** `item_history` does NOT need to be in the publication. It is write-only in Phase 2 (no Phase 2 UI reads history). Keeping it out of publication reduces noise.

---

## Common Pitfalls

### Pitfall 1: Realtime Table Not in Publication

**What goes wrong:** No `postgres_changes` events are delivered. The subscription appears to succeed (`.subscribe()` resolves without error) but the callback never fires.
**Why it happens:** Tables must be explicitly added to the `supabase_realtime` publication. New tables are NOT in the publication by default on a Supabase project.
**How to avoid:** Include `alter publication supabase_realtime add table public.list_items;` in the migration. Verify in Supabase dashboard under Database → Publications.
**Warning signs:** Changes on one device do not appear on a second device. Console shows the channel as subscribed but callbacks never execute.

### Pitfall 2: TanStack Query v5 vs v6 Syntax Mismatch

**What goes wrong:** `$listsQuery.data` (v5 store subscription syntax) throws in v6 where `createQuery` returns a rune-reactive object. Or `createQuery({})` without a thunk produces stale options (non-reactive).
**Why it happens:** v6 made a breaking change: options must be a thunk `() => ({...})`, and the result is accessed without `$` prefix.
**How to avoid:** Always write `createQuery(() => ({...}))`. Access result as `listsQuery.data`, not `$listsQuery.data`. Read the v6 migration guide before implementing.
**Warning signs:** TypeScript errors on `$query.*` accesses, or query options (like `queryKey`) not updating when reactive state changes.

### Pitfall 3: QueryClient Created at Module Level

**What goes wrong:** All users share the same QueryClient instance between requests during SSR, causing data leakage between sessions.
**Why it happens:** A module-level `const queryClient = new QueryClient()` is evaluated once per server worker.
**How to avoid:** Create `QueryClient` inside the Svelte component body (inside `<script>` in the layout component). Each browser page gets its own instance; SSR renders don't share state.
**Warning signs:** User A sees User B's lists after a page refresh (catastrophic data leak). Less obvious: stale data after logout/login without page refresh.

### Pitfall 4: Realtime Subscription in Server Load Function

**What goes wrong:** `data.supabase.channel(...)` crashes or produces no events when called in `+page.server.ts`.
**Why it happens:** Realtime requires a persistent WebSocket connection — impossible in a server request/response lifecycle.
**How to avoid:** Set up all Supabase Realtime subscriptions in client-side lifecycle: `$effect` (Svelte 5) or `onMount`, never in load functions.
**Warning signs:** TypeScript may not catch this; runtime errors about WebSocket or silent non-delivery of events.

### Pitfall 5: Missing `checked_by` on item_history Write

**What goes wrong:** HIST-01 says history must log "who checked it off." If the mutation runs without attaching `user.id`, the column is NULL and later analytics/recommendations are incomplete.
**Why it happens:** The Supabase client in the browser is authenticated, but `auth.uid()` in a DB function is only available for DB-level operations (e.g., via RLS or a SECURITY DEFINER function). The client-side mutation must explicitly pass the user ID in the INSERT.
**How to avoid:** In the `mutationFn`, read `data.user.id` from the layout data props and include it as `checked_by` in the `item_history` insert.
**Warning signs:** `item_history.checked_by` is always NULL in development testing.

### Pitfall 6: Input Not Re-Focused After Item Submit (Bulk Entry)

**What goes wrong:** After submitting an item, the keyboard dismisses on iOS. The locked UX decision requires the keyboard to stay open for rapid item entry.
**Why it happens:** Programmatically calling `input.focus()` after an `await` (async mutation) does not reliably prevent keyboard dismissal on iOS Safari. iOS requires focus to occur synchronously within the user-gesture handler.
**How to avoid:** Call `input.focus()` synchronously before the `await mutateAsync(...)` call. Use optimistic update so the input clears immediately (no wait for server). The refocus call can also be placed in `onMutate` to fire before the async network round-trip.
**Warning signs:** iOS keyboard dismisses after each item add; user must tap the input again.

---

## Code Examples

### Supabase Realtime Channel (verified pattern)

```typescript
// Subscribe to all events on list_items for a specific list
const channel = supabase
  .channel(`list-items-${listId}`)          // unique channel name per list
  .on(
    'postgres_changes',
    {
      event: '*',                             // INSERT | UPDATE | DELETE | *
      schema: 'public',
      table: 'list_items',
      filter: `list_id=eq.${listId}`,         // server-side filter
    },
    (_payload) => {
      queryClient.invalidateQueries({ queryKey: ['items', listId] })
    }
  )
  .subscribe()

// Cleanup (Svelte 5 onDestroy or effect cleanup)
supabase.removeChannel(channel)
```

Source: Supabase official docs — Postgres Changes guide; makerkit.dev Supabase+TanStack pattern

### Item Count Derivation (lists home screen)

```typescript
// Efficient: fetch item count with the list in a single query
const { data: lists } = await supabase
  .from('lists')
  .select('id, name, list_items(count)')
  .order('created_at', { ascending: false })

// Result shape: [{ id, name, list_items: [{ count: 7 }] }]
// Display: `${list.name} · ${list.list_items[0].count} ting`
```

### Inline Create Row (list creation UX)

The inline "+" row pattern requires local state: a boolean `isCreating` that toggles between showing the "+" button and showing the text input. Submit creates the list and resets `isCreating` to false.

```svelte
<script lang="ts">
  let isCreating = $state(false)
  let newListName = $state('')

  function startCreate() { isCreating = true }

  async function submitCreate() {
    if (!newListName.trim()) return
    await createListMutation.mutateAsync({ name: newListName.trim() })
    newListName = ''
    isCreating = false
  }
</script>

{#if isCreating}
  <div class="flex items-center gap-2 px-4 py-3">
    <input
      bind:value={newListName}
      onkeydown={(e) => e.key === 'Enter' && submitCreate()}
      placeholder="Navn på lista"
      class="flex-1 text-sm outline-none"
      autofocus
    />
    <button onclick={submitCreate} class="text-sm text-green-700">Legg til</button>
  </div>
{:else}
  <button onclick={startCreate} class="flex items-center gap-2 px-4 py-3 w-full text-left text-gray-500 text-sm">
    <span class="text-xl leading-none">+</span> Ny liste
  </button>
{/if}
```

### Bottom Nav Component (locked structure)

```svelte
<!-- src/lib/components/lists/BottomNav.svelte -->
<script lang="ts">
  import { page } from '$app/state'

  const tabs = [
    { label: 'Lister',          href: '/',         active: true },
    { label: 'Husstand',        href: '/husstand',  active: true },
    { label: 'Butikker',        href: null,         active: false },  // Phase 3
    { label: 'Anbefalinger',    href: null,         active: false },  // Phase 6
  ]
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
  {#each tabs as tab}
    {#if tab.active && tab.href}
      <a
        href={tab.href}
        class="flex-1 py-2 text-center text-xs {page.url.pathname === tab.href ? 'text-green-700 font-semibold' : 'text-gray-500'}"
      >
        {tab.label}
      </a>
    {:else}
      <span class="flex-1 py-2 text-center text-xs text-gray-300 cursor-not-allowed opacity-50">
        {tab.label}
      </span>
    {/if}
  {/each}
</nav>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/svelte-query` v5 (Svelte store syntax) | v6 (rune-native, thunk options) | v6 released ~Feb 2025 | Must use v6 for Svelte 5 projects; v5 has known bugs with Svelte 5 |
| Manual `invalidate('supabase:auth')` for auth state | Already established in Phase 1 `+layout.svelte` | Phase 1 | No change for auth; Realtime is separate |
| Polling for sync | Supabase Realtime `postgres_changes` | 2022 (RLS support added 2023) | True push within ~500 ms; polling can't achieve 3-second SLA without hammering DB |

**Deprecated/outdated:**
- `@tanstack/svelte-query` v5 store syntax (`$query.data`): Do not use in Svelte 5; use v6 rune syntax.
- `supabase.from('lists').on(...)` — the old Supabase Realtime v1 API: removed. Always use `supabase.channel(...).on('postgres_changes', ...)`.

---

## Open Questions

1. **Supabase client availability in protected child pages**
   - What we know: The root `+layout.svelte` receives `data.supabase` from the root `+layout.server.ts`. The `(protected)/+layout.server.ts` returns `{ user }` only — no `supabase`.
   - What's unclear: Do child page components receive the Supabase client via `data.supabase` (inherited from root layout data), or must they import it via a Svelte context set in `+layout.svelte`?
   - Recommendation: Verify at Wave 0 by logging `data.supabase` in a protected page. If not inherited, set it as Svelte context in the root `+layout.svelte`. This affects every query and Realtime call.

2. **`page.url.pathname` vs `page.route.id` for bottom nav active state**
   - What we know: `page` from `$app/state` (Svelte 5) exposes `url.pathname` and `route.id`. The `+page.svelte` at `(protected)/` has route ID `/(protected)`.
   - What's unclear: Whether `page.url.pathname` reliably returns `/` for the lists home page (it should, but the route group `(protected)` could affect it in edge cases).
   - Recommendation: Use `page.url.pathname` as shown; verify during implementation.

3. **`quantity` field: integer vs text**
   - What we know: The schema above uses `integer`. The CONTEXT says "optional quantity (number input)."
   - What's unclear: Whether users might want "2 stk" or "500g" (text quantities). Phase 3 adds categories but no mention of unit types.
   - Recommendation: Use `integer` for Phase 2 (clean schema, simple UI). If text quantities are needed, this is a Phase 3+ migration. Note the decision in PLAN.md.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npm run test:e2e -- --project=chromium tests/lists.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIST-01 | User creates a named list; it appears in the home screen | e2e | `npm run test:e2e -- tests/lists.spec.ts -g "create list"` | ❌ Wave 0 |
| LIST-02 | User swipe-deletes a list; it disappears | e2e | `npm run test:e2e -- tests/lists.spec.ts -g "delete list"` | ❌ Wave 0 |
| LIST-03 | User types item name and submits; item appears in list; persists on reload | e2e | `npm run test:e2e -- tests/items.spec.ts -g "add item"` | ❌ Wave 0 |
| LIST-04 | User swipe-deletes an item; it disappears | e2e | `npm run test:e2e -- tests/items.spec.ts -g "remove item"` | ❌ Wave 0 |
| LIST-05 | User taps item row; item moves to "Handlet" section | e2e | `npm run test:e2e -- tests/items.spec.ts -g "check off"` | ❌ Wave 0 |
| LIST-06 | Change on page 1 appears on page 2 (two browser contexts) within 3 s | e2e | `npm run test:e2e -- tests/realtime.spec.ts -g "realtime sync"` | ❌ Wave 0 |
| HIST-01 | item_history row exists in DB after check-off | e2e+DB | `npm run test:e2e -- tests/items.spec.ts -g "history write"` | ❌ Wave 0 |

**Note on swipe tests:** Playwright supports `page.touchscreen.tap()` and drag simulation, but swipe-to-delete is notoriously tricky in headless Chromium. Consider testing delete via a keyboard shortcut or an accessible button that appears after swipe in Chromium tests, while verifying swipe itself manually on device.

**Note on LIST-06 (Realtime):** The realtime sync test requires two simultaneous browser contexts (Playwright supports this via `context.newPage()`). The test helper pattern from `tests/helpers/auth.ts` can be reused to seed two users in the same household.

### Sampling Rate

- **Per task commit:** `npm run test:e2e -- tests/lists.spec.ts tests/items.spec.ts --project=chromium`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/lists.spec.ts` — covers LIST-01, LIST-02
- [ ] `tests/items.spec.ts` — covers LIST-03, LIST-04, LIST-05, HIST-01
- [ ] `tests/realtime.spec.ts` — covers LIST-06 (two-context test)
- [ ] `tests/helpers/lists.ts` — seeded list/item creation helpers (parallel to existing `auth.ts`)

---

## Sources

### Primary (HIGH confidence)

- TanStack Query official docs — https://tanstack.com/query/latest/docs/framework/svelte/overview — v6 overview, thunk requirement, QueryClientProvider pattern
- TanStack Query GitHub Discussion #7413 — https://github.com/TanStack/query/discussions/7413 — Svelte 5 support status, v5 vs v6 compatibility
- TanStack Query GitHub Discussion #7497 — https://github.com/TanStack/query/discussions/7497 — idiomatic Svelte 5 + TanStack Query v6 patterns
- Supabase Realtime blog — https://supabase.com/blog/realtime-row-level-security-in-postgresql — WALRUS RLS enforcement on Realtime events
- npm @tanstack/svelte-query — latest version 6.1.0, Svelte 5 rune-native

### Secondary (MEDIUM confidence)

- DeepWiki TanStack/query 6.3 Svelte examples — https://deepwiki.com/TanStack/query/6.3-svelte-examples — createQuery, createMutation, optimistic updates patterns (DeepWiki auto-generated from source; treat as illustrative, verify exact API)
- makerkit.dev — https://makerkit.dev/blog/saas/supabase-react-query — Supabase Realtime + TanStack Query `invalidateQueries` integration pattern (React example; pattern is identical for Svelte)
- Supabase hrekov.com — https://hrekov.com/blog/supabase-auth-rls-real-time — RLS filtering mechanism for Realtime events

### Tertiary (LOW confidence)

- Svelte 5 pointer event passive handler behaviour — from Svelte 5 migration guide (training knowledge + WebSearch confirmation, not official API reference)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — TanStack Query v6 and Supabase Realtime are official, documented, actively maintained
- Architecture: HIGH — DB schema and RLS follow established Phase 1 patterns exactly; no unknowns
- TanStack Query v6 exact API: MEDIUM — v6 is recent (early 2025); thunk requirement and rune integration verified via multiple sources but exact store vs reactive object access should be confirmed at implementation
- Swipe gesture: MEDIUM — pointer event approach is standard web; iOS Safari passive touch handler behaviour adds risk
- Realtime sync within 3 seconds: MEDIUM — Supabase Realtime targets sub-second delivery on good connections; the 3-second SLA is achievable but depends on network conditions not tested

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack; re-verify TanStack Query v6 API changes if >30 days pass)