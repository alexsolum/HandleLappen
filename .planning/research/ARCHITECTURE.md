# Architecture Research

**Domain:** Collaborative family grocery shopping PWA with Supabase
**Researched:** 2026-03-08
**Confidence:** HIGH (Supabase patterns), MEDIUM (PWA offline strategy), HIGH (schema design)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  React UI    │  │  TanStack    │  │  IndexedDB   │           │
│  │  Components  │  │  Query Cache │  │  Offline     │           │
│  └──────┬───────┘  └──────┬───────┘  │  Store       │           │
│         │                 │          └──────┬───────┘           │
│         └─────────────────┼────────────────┘                    │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │               Service Layer (hooks + queries)             │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │               Service Worker (Workbox)                    │   │
│  │    App Shell Cache │ Background Sync Queue │ Offline      │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼──────────────────────────────────────┐
│                        SUPABASE                                   │
├────────────────┬────────────────┬────────────────┬───────────────┤
│   Auth         │   PostgreSQL   │   Realtime     │  Edge         │
│   (JWT)        │   + RLS        │   (WebSocket)  │  Functions    │
│                │                │                │               │
│   Sessions     │  households    │  Postgres      │  /barcode     │
│   Refresh      │  profiles      │  Changes       │  (Kassal.app  │
│   tokens       │  lists         │  subscribed    │  + OPF proxy  │
│                │  list_items    │  per list_id   │  + DB cache)  │
│                │  categories    │                │               │
│                │  store_layouts │                │               │
│                │  item_history  │                │               │
│                │  product_cache │                │               │
└────────────────┴────────────────┴────────────────┴───────────────┘
                                                   │
                            ┌──────────────────────┼─────────────┐
                            │  External APIs        │             │
                            │  Kassal.app (primary) │             │
                            │  Open Food Facts (fb) │             │
                            └───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React UI | Render lists, items, categories, barcode scanner | Service Layer (hooks) |
| TanStack Query | Client-side cache, optimistic updates, background refetch | Service Layer, IndexedDB (via persist plugin) |
| IndexedDB | Offline structured storage, outbound sync queue | Service Worker, TanStack Query persist |
| Service Worker (Workbox) | App shell caching, background sync, push future | IndexedDB (sync queue), Network |
| Service Layer (hooks) | Abstract Supabase calls, owns business logic | Supabase client, TanStack Query |
| Supabase Auth | JWT issuance, session management, refresh | All Supabase services via RLS |
| Supabase PostgreSQL + RLS | Primary data store, enforces household isolation | Realtime, Edge Functions |
| Supabase Realtime | WebSocket broadcast of DB change events to clients | PostgreSQL (WAL), Client |
| Edge Function: /barcode | Proxy Kassal.app + Open Food Facts, cache in DB | Kassal.app, Open Food Facts, PostgreSQL |

---

## Supabase Schema Design

### Core Tables

```sql
-- Households: the top-level tenant unit
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at  timestamptz default now()
);

-- Profiles: one per auth.users row, belongs to a household
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid not null references households on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz default now()
);
create index on profiles(household_id);

-- Shopping lists: named lists owned by a household
create table lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  store_id     uuid references stores,         -- optional: list tied to a store
  created_by   uuid references profiles,
  archived_at  timestamptz,                    -- soft delete
  created_at   timestamptz default now()
);
create index on lists(household_id);

-- Items on a list
create table list_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references lists on delete cascade,
  product_id   uuid references product_cache,  -- null for manual items
  name         text not null,                  -- denormalized for offline/display
  quantity      numeric default 1,
  unit         text,
  category_id  uuid references categories,
  is_checked   boolean not null default false,
  checked_by   uuid references profiles,
  checked_at   timestamptz,
  sort_order   integer,                         -- position within category group
  added_by     uuid references profiles,
  created_at   timestamptz default now()
);
create index on list_items(list_id);
-- REPLICA IDENTITY FULL required for realtime filter on list_id
alter table list_items replica identity full;

-- Categories: shared across household, with a global default sort order
create table categories (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid references households,   -- null = system default category
  name           text not null,
  default_order  integer not null default 100, -- lower = closer to store entrance
  icon           text,
  created_at     timestamptz default now()
);

-- Stores: named stores a household shops at
create table stores (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  chain        text,                            -- e.g. 'Rema 1000', 'Kiwi'
  created_at   timestamptz default now()
);
create index on stores(household_id);

-- Store layout overrides: per-store category sort order
create table store_layouts (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores on delete cascade,
  category_id uuid not null references categories on delete cascade,
  sort_order  integer not null,
  unique(store_id, category_id)
);
create index on store_layouts(store_id);

-- Item history: immutable log of checked-off items
create table item_history (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households,
  list_id      uuid references lists,
  profile_id   uuid references profiles,
  product_id   uuid references product_cache,
  name         text not null,
  category_id  uuid references categories,
  quantity     numeric,
  unit         text,
  checked_at   timestamptz not null default now()
);
create index on item_history(household_id, checked_at desc);
create index on item_history(household_id, product_id);

-- Product cache: barcode → product data from Kassal.app / Open Food Facts
create table product_cache (
  id           uuid primary key default gen_random_uuid(),
  ean          text unique not null,
  name         text not null,
  brand        text,
  image_url    text,
  category_hint text,                          -- category name from external API
  nutrition    jsonb,
  raw_data     jsonb,                          -- full API response
  source       text not null,                  -- 'kassal' | 'openfoodfacts'
  fetched_at   timestamptz not null default now(),
  expires_at   timestamptz generated always as (fetched_at + interval '30 days') stored
);
create index on product_cache(ean);
```

### RLS Policies

The central pattern: users belong to a household through `profiles`. All tables scoped to a household use a SECURITY DEFINER helper function to avoid per-row subquery cost.

```sql
-- Helper: returns current user's household_id (cached once per query)
create or replace function my_household_id()
  returns uuid language sql stable security definer
  as $$ select household_id from profiles where id = (select auth.uid()) $$;

-- Enable RLS on all tables
alter table households     enable row level security;
alter table profiles       enable row level security;
alter table lists          enable row level security;
alter table list_items     enable row level security;
alter table categories     enable row level security;
alter table stores         enable row level security;
alter table store_layouts  enable row level security;
alter table item_history   enable row level security;
alter table product_cache  enable row level security;

-- households: member can read their own household
create policy "household_select" on households for select
  using (id = my_household_id());

-- profiles: read all profiles in same household
create policy "profiles_select" on profiles for select
  using (household_id = my_household_id());

create policy "profiles_insert_own" on profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on profiles for update
  using (id = (select auth.uid()));

-- lists: full access within household
create policy "lists_select" on lists for select
  using (household_id = my_household_id());

create policy "lists_insert" on lists for insert
  with check (household_id = my_household_id());

create policy "lists_update" on lists for update
  using (household_id = my_household_id());

create policy "lists_delete" on lists for delete
  using (household_id = my_household_id());

-- list_items: scoped via list membership
create policy "list_items_select" on list_items for select
  using (list_id in (select id from lists where household_id = my_household_id()));

create policy "list_items_insert" on list_items for insert
  with check (list_id in (select id from lists where household_id = my_household_id()));

create policy "list_items_update" on list_items for update
  using (list_id in (select id from lists where household_id = my_household_id()));

create policy "list_items_delete" on list_items for delete
  using (list_id in (select id from lists where household_id = my_household_id()));

-- product_cache: readable by all authenticated users (global cache)
create policy "product_cache_select" on product_cache for select
  to authenticated using (true);

-- item_history: household-scoped
create policy "history_select" on item_history for select
  using (household_id = my_household_id());

create policy "history_insert" on item_history for insert
  with check (household_id = my_household_id());
```

---

## Supabase Realtime Subscription Pattern

### Setup Requirements

```sql
-- Add list_items to the realtime publication
alter publication supabase_realtime add table list_items;
-- REPLICA IDENTITY FULL is required to filter on list_id (non-PK column)
alter table list_items replica identity full;
```

### Client Subscription (per active list)

```typescript
// Subscribe to all changes on a specific list
const channel = supabase
  .channel(`list:${listId}`)
  .on(
    'postgres_changes',
    {
      event: '*',                    // INSERT | UPDATE | DELETE
      schema: 'public',
      table: 'list_items',
      filter: `list_id=eq.${listId}`
    },
    (payload) => {
      // Invalidate TanStack Query cache — let it refetch from DB
      queryClient.invalidateQueries({ queryKey: ['list_items', listId] });
    }
  )
  .subscribe();

// Cleanup when component unmounts or list changes
return () => { supabase.removeChannel(channel); };
```

### Subscription Scope Rule

Subscribe at the **list level**, not household level. One channel per open list. This limits authorization checks per event to only users currently viewing that list, avoiding the N-subscribers-per-insert RLS overhead.

### Realtime Limitations to Plan For

- DELETE events cannot be filtered — the payload will arrive but filter is not applied. Mitigation: invalidate and refetch on DELETE rather than applying the event directly.
- RLS is checked per subscriber per event. At family scale (2-10 users) this is negligible. Flag for re-evaluation if household size grows beyond ~50 concurrent users.
- REPLICA IDENTITY FULL is required for filtering on any non-primary-key column (like `list_id`). Apply this DDL before subscribing.

---

## PWA Offline-First Architecture

### Two Storage Layers

| Layer | Technology | What Goes Here |
|-------|-----------|----------------|
| Runtime cache | TanStack Query in-memory + persist plugin | Active list items, categories, household data |
| Persistent offline store | IndexedDB (via `idb` library) | Cached list data, outbound mutation queue, product cache |

### Service Worker Strategy (Workbox)

```
Request Type              Strategy
─────────────────────────────────────────────────────────
App shell (HTML/JS/CSS)   Cache First (precached at install)
Supabase REST API calls   Network First, fall back to IndexedDB
Static assets (icons)     Cache First
Kassal.app API            Network Only (proxied via Edge Function)
```

### Offline Mutation Queue

When the device is offline, writes (add item, check item, delete item) are:

1. Applied optimistically to TanStack Query cache (UI updates instantly)
2. Persisted to an IndexedDB `mutation_queue` store
3. Registered with the Background Sync API (`sync` tag: `list-mutations`)
4. Replayed by the service worker when connectivity returns

```
User checks item off
       │
       ▼
Optimistic update → TanStack Query cache (instant UI)
       │
       ▼
Attempt Supabase mutation
  ├── Online: success → confirm optimistic state
  └── Offline: enqueue to IndexedDB → Background Sync registration
                    │
                    └── On reconnect: service worker replays queue
                                      → Supabase mutation
                                      → Realtime propagates to other devices
```

### Conflict Resolution Strategy

Grocery shopping is append-friendly. True conflicts (two users simultaneously checking the same item) are rare but handled by:

- `is_checked` and `checked_by` are "last writer wins" (PostgreSQL UPDATE semantics)
- Realtime event on UPDATE triggers cache invalidation — stale optimistic state is overwritten
- No CRDT complexity needed at family scale

---

## Barcode / Product Cache Architecture

### Edge Function: `/barcode/{ean}`

```
Client scans barcode (EAN)
       │
       ▼
Check IndexedDB product cache (< 30 days old?)
  ├── Hit: return immediately (no network)
  └── Miss:
       │
       ▼
  Call Supabase Edge Function /barcode/{ean}
       │
       ├── Check product_cache table (< 30 days old?)
       │     └── Hit: return DB cache
       │
       └── Miss: fetch Kassal.app GET /api/v1/products/ean/{ean}
             ├── Success: normalize + upsert product_cache + return
             └── 404 / error: fetch Open Food Facts as fallback
                   ├── Success: normalize + upsert product_cache + return
                   └── No data: return not-found (user types name manually)
```

### Product Cache Expiry

- DB cache TTL: 30 days (`expires_at` generated column)
- Client IndexedDB cache TTL: 30 days (checked on read)
- A background cleanup cron (Supabase pg_cron) removes expired rows weekly

### Norwegian Coverage Notes

- Kassal.app covers Norwegian EAN barcodes comprehensively — prices, brand, category
- Open Food Facts covers international products sold in Norway (imported goods)
- Category hint from Kassal.app is text, not a structured taxonomy — the Edge Function maps it to a category name, but household must confirm/assign the final category

---

## Store Layout / Category Ordering Data Model

### Resolution Order for Displaying Items

```
list_items grouped by category_id
       │
       ▼
For each category, determine sort_order:
  1. Check store_layouts WHERE store_id = list.store_id (per-store override)
  2. Fall back to categories.default_order (global default)
       │
       ▼
Sort category groups by resolved sort_order ASC
Sort items within category by list_items.sort_order ASC
```

### Default Category Order (Norwegian Store Convention)

```
10  Frukt og grønt (produce)
20  Bakeri (bakery)
30  Meieri og egg (dairy/eggs)
40  Kjøtt og fjærkre (meat/poultry)
50  Fisk og sjømat (fish/seafood)
60  Pålegg og delikatesser (deli/cold cuts)
70  Tørrvarer (dry goods / pasta / rice)
80  Hermetikk og glass (canned / jarred)
90  Frysevarer (frozen)
100 Drikke (beverages)
110 Rengjøring og vask (cleaning)
120 Personlig pleie (personal care)
130 Annet (other)
```

This default is seeded at deploy time. Households can reorder categories for specific stores via `store_layouts`.

---

## Recommended Project Structure

```
src/
├── components/           # UI components (presentational)
│   ├── list/             # ListItem, ListGroup, CheckboxRow
│   ├── scanner/          # BarcodeScanner, ProductCard
│   ├── layout/           # BottomNav, PageShell, Header
│   └── ui/               # Button, Input, Modal (design system primitives)
├── features/             # Feature modules (route-level logic)
│   ├── shopping/         # Active list view + realtime hook
│   ├── lists/            # List management (create, archive, select)
│   ├── history/          # Item history + recommendations
│   ├── household/        # Household setup, invite, member management
│   └── settings/         # Store layouts, category ordering
├── hooks/                # Shared data hooks (useList, useCategories, etc.)
├── lib/
│   ├── supabase.ts       # Supabase client singleton
│   ├── queryClient.ts    # TanStack Query client config + persister
│   └── db.ts             # IndexedDB schema (idb library)
├── services/
│   ├── lists.ts          # CRUD for lists, list_items
│   ├── barcode.ts        # Barcode lookup + local cache logic
│   ├── history.ts        # Item history queries
│   └── recommendations.ts# History-based suggestion engine
├── sw/
│   ├── sw.ts             # Service worker entry (Workbox)
│   └── sync.ts           # Background sync queue handler
├── types/                # Shared TypeScript types (Database schema types)
└── pages/                # Route components
    ├── ShoppingPage.tsx
    ├── ListsPage.tsx
    ├── HistoryPage.tsx
    └── SettingsPage.tsx
```

### Structure Rationale

- **features/:** Groups all concerns for a user-facing route — component, hooks, queries. Prevents cross-feature coupling.
- **hooks/:** Shared hooks that multiple features need (e.g., `useHousehold`, `useCategories`).
- **services/:** Pure async functions, no React — makes testing and reuse outside React easier.
- **sw/:** Service worker is a separate compilation target in Vite with `vite-plugin-pwa`.
- **lib/:** Singletons and infrastructure setup that must be initialized once.

---

## Architectural Patterns

### Pattern 1: Query Invalidation on Realtime Event

**What:** When a Realtime INSERT/UPDATE arrives, invalidate the corresponding TanStack Query key rather than applying the event payload directly to cache.
**When to use:** Always, for list_items subscriptions.
**Trade-offs:** Adds one extra DB round-trip per event, but keeps client state authoritative and avoids patch-merge complexity. At family scale this is imperceptible.

```typescript
.on('postgres_changes', { event: '*', table: 'list_items', filter: `list_id=eq.${listId}` },
  () => queryClient.invalidateQueries({ queryKey: ['list_items', listId] })
)
```

### Pattern 2: Optimistic Mutation with Rollback

**What:** Apply local state change immediately in TanStack Query, then issue the Supabase mutation. Roll back if the mutation fails.
**When to use:** Check/uncheck item, add item (high-frequency, fast actions).
**Trade-offs:** UI feels instant; rollback on failure can be jarring if frequent — acceptable for grocery use case where failures are rare.

```typescript
useMutation({
  mutationFn: (item) => supabase.from('list_items').update({ is_checked: true }).eq('id', item.id),
  onMutate: async (item) => {
    await queryClient.cancelQueries({ queryKey: ['list_items', listId] });
    const previous = queryClient.getQueryData(['list_items', listId]);
    queryClient.setQueryData(['list_items', listId], (old) =>
      old.map(i => i.id === item.id ? { ...i, is_checked: true } : i)
    );
    return { previous };
  },
  onError: (_err, _item, ctx) => {
    queryClient.setQueryData(['list_items', listId], ctx.previous);
  },
})
```

### Pattern 3: SECURITY DEFINER Household Helper

**What:** A PostgreSQL function that returns the calling user's `household_id` and is called once per query (not per row).
**When to use:** In every RLS policy that needs household-scoped access.
**Trade-offs:** Requires the function to be maintained alongside schema changes; provides significant query performance gains by preventing per-row subqueries.

---

## Data Flow

### Add Item Flow (Online)

```
User types item name → React component
       │
       ▼
useMutation (optimistic): item appears in list instantly
       │
       ▼
Supabase INSERT into list_items
       │
       ├── Triggers Realtime event on list channel
       │         │
       │         └── Other open clients invalidate cache → refetch → sync
       │
       └── Confirms optimistic state for originating client
```

### Add Item Flow (Offline)

```
User types item name → React component
       │
       ▼
useMutation (optimistic): item appears in list instantly with local UUID
       │
       ▼
Supabase INSERT fails (no network)
       │
       ▼
Mutation enqueued to IndexedDB sync queue
Background Sync API registered
       │
       ▼ (on reconnect)
Service worker fires 'sync' event
Reads queue → replays INSERT to Supabase
       │
       ▼
Realtime propagates to other family devices
TanStack Query invalidated → fresh data from server
```

### Barcode Scan Flow

```
Camera captures barcode (EAN string)
       │
       ▼
Check IndexedDB product_cache (by EAN, within 30 days)
  ├── Hit: prefill item name + category, skip network
  └── Miss:
       │
       ▼
  POST to Supabase Edge Function /barcode/{ean}
  Edge Function: check product_cache table → Kassal.app → Open Food Facts
       │
       ▼
  Product returned → save to IndexedDB
  Prefill item form: name, brand, category hint
       │
       └── User confirms/edits → INSERT list_item
```

### Store Layout Resolution Flow

```
List loaded (with store_id or no store)
       │
       ▼
Fetch list_items + categories + store_layouts
       │
       ▼
Group items by category_id
For each category:
  - If list.store_id exists → join store_layouts for sort_order
  - Else → use categories.default_order
       │
       ▼
Render sorted category groups
```

---

## Component Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React UI ↔ Service Layer | TanStack Query hooks | UI never calls Supabase directly |
| Service Layer ↔ Supabase | Supabase JS client | Authenticated via session JWT |
| Supabase Realtime ↔ Client | WebSocket (managed by Supabase JS) | One channel per open list |
| Service Worker ↔ IndexedDB | `idb` library (Promise-based) | Async, no blocking |
| Edge Function ↔ Kassal.app | HTTPS GET with API key in env | Key stored in Edge Function secrets |
| Edge Function ↔ product_cache | Supabase service role client | Bypasses RLS for cache writes |

---

## Suggested Build Order (Phase Dependencies)

```
Phase 1: Auth + Household Foundation
  → profiles, households tables, RLS, invite flow
  → Nothing else works without authenticated household context

Phase 2: Lists + Items (Core Loop)
  → lists, list_items tables, CRUD, category grouping
  → Realtime subscription (basic, not yet filtered with full REPLICA IDENTITY)
  → This is the testable shopping loop

Phase 3: Store Layouts + Category Ordering
  → stores, store_layouts, categories seeded with Norwegian defaults
  → Depends on: items must exist before layout ordering matters

Phase 4: Barcode Lookup
  → product_cache table + Edge Function + Kassal.app + OPF integration
  → Depends on: list_items must exist to receive scanned products
  → Edge Function can be built independently of Phase 3

Phase 5: PWA + Offline
  → Service worker, IndexedDB persist, Background Sync queue
  → Should wrap Phase 2 flow first (add/check items)
  → Depends on: mutation patterns established in Phase 2

Phase 6: History + Recommendations
  → item_history table, history view, co-purchase suggestion queries
  → Depends on: list_items must have been checked off in production
  → Recommendations are trivially SQL-based at family scale (no ML needed)
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Kassal.app | GET /api/v1/products/ean/{ean} via Edge Function | Bearer token, Norwegian grocery data |
| Open Food Facts | GET /api/v2/product/{ean}.json | Free, no auth, global fallback |
| Supabase Auth | supabase.auth.signUp / signInWithOtp | Email/password or magic link |
| Supabase Realtime | supabase.channel().on('postgres_changes') | WebSocket, auto-reconnect |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| features/ ↔ services/ | Imported async functions | Services are pure, no React deps |
| hooks/ ↔ services/ | Hooks wrap services with useQuery/useMutation | Query keys are the contract |
| sw/ ↔ services/ | IndexedDB queue (no direct import possible) | SW is a separate JS context |

---

## Anti-Patterns

### Anti-Pattern 1: Subscribe at Household Level

**What people do:** Subscribe to all list_items changes filtered by household_id.
**Why it's wrong:** Every INSERT on any list triggers an RLS check per subscriber. A household with many lists accumulates unnecessary event volume. Also, filtering on household_id requires REPLICA IDENTITY FULL on list_items AND list_items does not have a household_id column directly — you'd need a join, which Realtime filters do not support.
**Do this instead:** Subscribe per active list (`list_id=eq.{listId}`). Unsubscribe when the list is closed. This minimizes event scope and RLS overhead.

### Anti-Pattern 2: Applying Realtime Payloads Directly to Cache

**What people do:** Take the `payload.new` from a Realtime event and patch it into TanStack Query cache directly.
**Why it's wrong:** The payload bypasses TanStack Query's normalization, stale-while-revalidate logic, and optimistic update reconciliation. It can produce inconsistent UI if an optimistic update is in-flight.
**Do this instead:** On any Realtime event, call `queryClient.invalidateQueries()`. Let TanStack Query refetch from the source of truth.

### Anti-Pattern 3: Per-Row RLS Subqueries

**What people do:** Write RLS policies with subqueries that reference other tables inline:
```sql
using (household_id = (select household_id from profiles where id = auth.uid()))
```
**Why it's wrong:** PostgreSQL evaluates this subquery once per row scanned, causing full-table scans on large tables.
**Do this instead:** Use the `my_household_id()` SECURITY DEFINER function wrapped in `(select my_household_id())` so the planner caches the result for the query duration.

### Anti-Pattern 4: Storing Complete Product Data in list_items

**What people do:** Copy all product fields (name, brand, image, nutrition) into the list_items row.
**Why it's wrong:** Massively inflates list_items table size, makes Realtime payloads large, and creates data drift if product data is updated.
**Do this instead:** Store only `product_id` (FK to product_cache) and `name` (denormalized for offline display). Fetch full product data separately via JOIN when needed.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 households (family) | Current design is complete — no changes needed |
| 100 households | Index review; ensure `my_household_id()` function is performant |
| 10K households | Consider Realtime connection limits (Supabase Pro: 500 concurrent); evaluate Broadcast over Postgres Changes for list_items |
| 100K+ households | Separate Realtime tier; pgBouncer connection pooling; product_cache becomes shared CDN-backed service |

### Scaling Priorities

1. **First bottleneck (if public):** Realtime concurrent connections — Supabase Free tier is 200, Pro is 500. Mitigation: upgrade plan or switch to Broadcast pattern.
2. **Second bottleneck:** product_cache table scan performance — mitigated by the EAN index already in the schema.

---

## Sources

- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax, REPLICA IDENTITY, RLS interaction (HIGH confidence)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SECURITY DEFINER pattern, index strategy (HIGH confidence)
- [Supabase Realtime Subscribing to DB Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) — subscription setup, channel cleanup (HIGH confidence)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, auth.uid() (HIGH confidence)
- [MDN: Offline and Background Operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — Background Sync API, service worker patterns (HIGH confidence)
- [LogRocket: Offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — IndexedDB patterns, architecture (MEDIUM confidence)
- [TanStack Query: Optimistic Updates](https://tanstack.com/query/v4/docs/framework/react/guides/optimistic-updates) — onMutate/onError pattern (HIGH confidence)
- [Kassal.app API Docs](https://kassal.app/api/docs) — EAN lookup endpoint, response structure (MEDIUM confidence — auth details unclear from public docs)
- [DEV: Enforcing RLS in Supabase Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) — household membership RLS pattern (MEDIUM confidence)

---
*Architecture research for: HandleAppen — Family Grocery Shopping PWA*
*Researched: 2026-03-08*
