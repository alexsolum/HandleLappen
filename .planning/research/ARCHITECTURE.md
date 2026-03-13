# Architecture Research

**Domain:** Collaborative family grocery shopping PWA with Supabase — v1.2 integration analysis
**Researched:** 2026-03-13
**Confidence:** HIGH (existing codebase read directly), HIGH (SvelteKit routing patterns), HIGH (Supabase Storage RLS), MEDIUM (dark mode persistence approach)

---

## v1.2 Change Overview

This document extends the v1.0 architecture research with integration-focused analysis for six specific v1.2 changes. Each section identifies what is new, what is modified, and what existing code it touches.

---

## 1. BottomNav: 5 Tabs to 4 Tabs

### Current State

`src/lib/components/lists/BottomNav.svelte` defines a `tabs` array with four entries: Lister (`/`), Husstand (`/husstand`), Butikker (`/butikker`), Anbefalinger (`/anbefalinger`). The layout currently uses `grid-cols-4` and the component renders exactly four tabs. The existing route structure under `(protected)/` includes dedicated routes for `/butikker`, `/husstand`, and a history/recommendations combined route at `/anbefalinger`.

### v1.2 Target

Four tabs: Handleliste (`/`), Oppskrifter (`/oppskrifter`), Anbefalinger (`/anbefalinger`), Admin (`/admin`).

### Changes Required

**Modified — BottomNav.svelte:**
- Replace the `tabs` array entries. Remove Husstand and Butikker tabs. Add Oppskrifter and Admin tabs.
- Add two new icon variants to the `tabIcon` snippet: one for recipes (e.g. a chef's hat or document list) and one for admin (a settings gear or grid).
- The `Tab` type's `icon` union must be extended to include `'recipes'` and `'admin'`.
- The offline badge logic on the Lister tab stays unchanged.
- The grid stays `grid-cols-4` — no layout change needed.

**New routes:**
- `src/routes/(protected)/oppskrifter/+page.svelte` — recipe list view
- `src/routes/(protected)/oppskrifter/[id]/+page.svelte` — single recipe detail view
- `src/routes/(protected)/admin/+page.svelte` — admin hub landing (subpages below)

**Unchanged:**
- The existing `/butikker`, `/husstand` route files remain. They move to Admin subpages but the routes themselves can stay at their current paths — the Admin hub links to them rather than embedding them. No file moves required unless you want to nest them under `/admin/`.

**Routing recommendation — keep existing paths, link from admin hub:**

```
/                          → Handleliste (unchanged)
/lister/[id]               → Active list (unchanged)
/oppskrifter               → NEW: recipe list
/oppskrifter/[id]          → NEW: recipe detail
/anbefalinger              → unchanged (already exists)
/admin                     → NEW: hub page with links to:
  /butikker                  → unchanged route
  /husstand                  → unchanged route
  /admin/historikk           → NEW or move /anbefalinger history section here
  /admin/items               → NEW: item management (name/category/picture)
  /admin/innstillinger       → NEW: user settings (dark mode)
```

Alternatively nest butikker/husstand under `/admin/butikker` and `/admin/husstand`. This is cleaner long-term but requires moving route files. For v1.2, linking to existing paths from the admin hub avoids a refactor risk.

---

## 2. Recipes DB Schema

### New Tables Required

The recipe feature needs two new tables: `recipes` (the recipe entity) and `recipe_ingredients` (the line items linking to household item memory).

```sql
-- Recipes: household-shared recipe cards
create table recipes (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households on delete cascade,
  name           text not null,
  description    text,
  cover_image_path text,        -- Storage object path, e.g. 'recipe-covers/{household_id}/{recipe_id}.webp'
  created_by     uuid references profiles,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on recipes(household_id);

-- Recipe ingredients: ordered line items on a recipe
create table recipe_ingredients (
  id                    uuid primary key default gen_random_uuid(),
  recipe_id             uuid not null references recipes on delete cascade,
  item_memory_id        uuid references household_item_memory,  -- nullable: link to known item
  name                  text not null,                          -- denormalized display name
  quantity              numeric,
  unit                  text,                                   -- e.g. 'stk', 'dl', 'g'
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now()
);
create index on recipe_ingredients(recipe_id);
create index on recipe_ingredients(item_memory_id);
```

### Relation to Existing Tables

```
recipes
  ├── household_id → households.id          (scoping)
  ├── created_by   → profiles.id            (attribution)
  └── cover_image_path → Storage bucket     (image reference)

recipe_ingredients
  ├── recipe_id      → recipes.id           (parent)
  └── item_memory_id → household_item_memory.id  (optional link)
                       Nullable: allows ingredients for items not yet
                       in the household's item memory. Memory entry is
                       created or upserted when the ingredient is added
                       to a shopping list.
```

### Why nullable item_memory_id

When a user creates a recipe ingredient, the item may or may not already exist in `household_item_memory`. Requiring a match would force the user to add an item to memory first. Instead, store the name as `text` always (for display), and set `item_memory_id` when a match exists or is created. When adding to a list, call `upsert_household_item_memory` to ensure the item is tracked going forward.

### RLS for Recipes

```sql
alter table recipes           enable row level security;
alter table recipe_ingredients enable row level security;

-- recipes: household-scoped
create policy "recipes_select" on recipes for select
  using (household_id = my_household_id());

create policy "recipes_insert" on recipes for insert
  with check (household_id = my_household_id());

create policy "recipes_update" on recipes for update
  using (household_id = my_household_id());

create policy "recipes_delete" on recipes for delete
  using (household_id = my_household_id());

-- recipe_ingredients: scoped via recipe
create policy "recipe_ingredients_select" on recipe_ingredients for select
  using (recipe_id in (select id from recipes where household_id = my_household_id()));

create policy "recipe_ingredients_insert" on recipe_ingredients for insert
  with check (recipe_id in (select id from recipes where household_id = my_household_id()));

create policy "recipe_ingredients_update" on recipe_ingredients for update
  using (recipe_id in (select id from recipes where household_id = my_household_id()));

create policy "recipe_ingredients_delete" on recipe_ingredients for delete
  using (recipe_id in (select id from recipes where household_id = my_household_id()));
```

### TypeScript Types

Add to `src/lib/types/database.ts` after the Supabase CLI regenerates the types:

```typescript
// These will be auto-generated by `supabase gen types typescript`
// after running the migration. Key shapes:

type Recipe = {
  id: string
  household_id: string
  name: string
  description: string | null
  cover_image_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type RecipeIngredient = {
  id: string
  recipe_id: string
  item_memory_id: string | null
  name: string
  quantity: number | null
  unit: string | null
  sort_order: number
  created_at: string
}
```

---

## 3. Supabase Storage: Recipe Images and Item Pictures

### Bucket Structure

Two buckets, both private (not public), with signed URLs for access:

| Bucket | Purpose | Path Convention |
|--------|---------|-----------------|
| `recipe-covers` | Recipe cover photos | `{household_id}/{recipe_id}` |
| `item-pictures` | Per-item pictures from Admin → Items | `{household_id}/{item_memory_id}` |

File extension is not enforced in the path — the client uploads whatever format was selected. Recommend `.webp` on the client via browser canvas conversion for size, with `.jpg` as a fallback.

**No nested folder for image variants.** At family scale, one image per recipe and one per item is sufficient. Resizing can be done client-side before upload using `canvas.toBlob()`.

### Storage RLS

Supabase Storage uses its own RLS policies against the `storage.objects` table. The `name` column contains the full path (e.g. `{household_id}/{recipe_id}`).

```sql
-- recipe-covers bucket
create policy "recipe_covers_select" on storage.objects
  for select using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

create policy "recipe_covers_insert" on storage.objects
  for insert with check (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

create policy "recipe_covers_update" on storage.objects
  for update using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

create policy "recipe_covers_delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

-- item-pictures bucket (same pattern)
create policy "item_pictures_select" on storage.objects
  for select using (
    bucket_id = 'item-pictures'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

-- (insert/update/delete policies follow same pattern)
```

`storage.foldername(name)[1]` extracts the first path segment. This enforces household isolation: users can only read/write objects under their own `household_id` folder.

### Client Upload Pattern

```typescript
// Upload recipe cover image
const { data, error } = await supabase.storage
  .from('recipe-covers')
  .upload(`${householdId}/${recipeId}`, file, {
    upsert: true,
    contentType: file.type,
  })

// Get a signed URL for display (60 seconds is enough for an img src)
const { data: urlData } = await supabase.storage
  .from('recipe-covers')
  .createSignedUrl(`${householdId}/${recipeId}`, 60)
```

Store only the path (`{household_id}/{recipe_id}`) in `recipes.cover_image_path`. Regenerate the signed URL in the query layer when building recipe display data — do not store signed URLs in the database.

### New Query File

Create `src/lib/queries/recipes.ts` with:
- `createRecipesQuery` — list all household recipes
- `createRecipeQuery` — single recipe with ingredients
- `createRecipeMutation` — create recipe
- `createUpdateRecipeMutation` — update recipe fields
- `createDeleteRecipeMutation` — delete recipe + its storage object
- `createAddIngredientsToListMutation` — loops over selected ingredients, calls `createAddOrIncrementItemMutation` per ingredient

Create `src/lib/queries/item-memory-admin.ts` for item editing (name/category/picture) separate from the existing `remembered-items.ts` which is optimized for the search autocomplete case.

---

## 4. Admin Hub as Nested SvelteKit Routes

### Route Structure

```
src/routes/(protected)/admin/
  +page.svelte                   — Hub landing: grid of links to subpages
  +layout.svelte                 — Optional: admin-specific chrome (back nav, subpage title)
  historikk/
    +page.svelte                 — History view (move content from /anbefalinger or duplicate)
  items/
    +page.svelte                 — Items list (all household_item_memory rows)
    [id]/
      +page.svelte               — Edit individual item (name, category, picture)
  innstillinger/
    +page.svelte                 — User settings (dark mode toggle, future prefs)
```

Butikker and Husstand stay at their existing paths (`/butikker`, `/husstand`). The Admin hub page links to them externally. This avoids moving route files in v1.2.

### SvelteKit Nested Layout for Admin

An optional `+layout.svelte` at `admin/` can provide a consistent back-button header for all admin subpages:

```svelte
<!-- src/routes/(protected)/admin/+layout.svelte -->
<script lang="ts">
  let { children } = $props()
</script>

<!-- Optional: admin subpage header with back arrow to /admin -->
{@render children()}
```

The protected layout's `BottomNav` already renders on all protected routes, so the Admin subpages get the nav bar automatically. No extra layout wrapping needed for auth — `(protected)/+layout.server.ts` covers all children.

### Hub Page Pattern

The `/admin` hub page is a pure navigation screen — no data loading required at the hub level. Individual subpages load their own data via `+page.server.ts` or `+page.svelte` TanStack Query calls.

Exception: `/admin/historikk` will call `createHistoryQuery` (currently in `/anbefalinger/+page.server.ts`). If history moves fully to admin, the `/anbefalinger` page drops the history section and becomes recommendations-only.

### Tab Active State

The BottomNav `isActive` function currently checks `page.url.pathname === href`. The Admin tab must match any `/admin*` route:

```typescript
function isActive(tab: Tab, href: string) {
  if (tab.label === 'Admin') return page.url.pathname.startsWith('/admin')
  if (tab.label === 'Anbefalinger') return page.url.pathname === '/anbefalinger'
  return page.url.pathname === href
}
```

---

## 5. Dark Mode: CSS Approach and Persistence

### CSS Approach: `class` on `<html>` — Use Tailwind's `darkMode: 'class'`

Tailwind CSS v4 (which this project uses via `@tailwindcss/vite`) supports dark mode via a CSS custom property approach or the class strategy. The `class` strategy is the correct choice here because:

1. It is user-controlled (not system-preference only)
2. It allows overriding the OS preference
3. It is trivially toggled from JavaScript

In Tailwind v4, the dark mode class strategy is configured in CSS:

```css
/* src/app.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

This makes `dark:` utility classes apply when `.dark` is present on any ancestor element. Apply `.dark` to `<html>`.

**`data-attribute` is not recommended here.** Tailwind v4 does support `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` but the `class` approach is simpler, better documented, and works directly with Tailwind's `dark:` prefix without extra configuration.

### Persistence: localStorage (not DB)

Dark mode preference is a device-level display setting, not a household data concern. Use `localStorage` for persistence.

Rationale:
- No latency: preference applied synchronously before first paint
- No auth dependency: works on the login page before the user authenticates
- Avoids a DB column on `profiles` for a single cosmetic preference

Future user preferences that require cross-device sync (e.g. notification settings, language) belong in the DB. Dark mode does not.

### Flash Prevention

Without care, there is a flash of white (light mode) before JavaScript runs. Prevent it with an inline script in `app.html` that reads `localStorage` and applies `.dark` before the page renders:

```html
<!-- src/app.html -->
<!doctype html>
<html lang="nb">
  <head>
    <script>
      // Runs before any CSS or JS loads — prevents flash
      if (localStorage.getItem('theme') === 'dark' ||
          (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
      }
    </script>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

The inline `<script>` runs synchronously, before stylesheets. This is the accepted pattern for dark mode without flash in SSR/SSG apps.

### Dark Mode Store

Create `src/lib/stores/theme.svelte.ts`:

```typescript
// Theme store — wraps localStorage, applies .dark class to <html>
export const themeStore = {
  get isDark() {
    return typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  },
  toggle() {
    const html = document.documentElement
    const next = !html.classList.contains('dark')
    html.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  },
  init() {
    // Called in the client-side layout onMount to sync store state
    // The actual class is already set by the inline script in app.html
  }
}
```

The toggle in `/admin/innstillinger` calls `themeStore.toggle()`. No Supabase call needed.

### Existing Styling Impact

All current Tailwind classes use light-mode colours (`bg-gray-50`, `text-gray-900`, `border-gray-200`, etc.). Adding dark mode is additive — existing markup does not break without dark variants. Dark variants (`dark:bg-gray-900`, etc.) are added component by component. For v1.2, only the new `innstillinger` page and the toggle UI itself need to work; making the full app dark-aware can be a separate pass.

---

## 6. Items Overview: Querying household_item_memory and item_history

### What the Admin → Items View Needs

The items list in Admin shows all items the household has ever used, with their display name, category, use count, and (once storage is wired) a picture. This is a read of `household_item_memory` exclusively — `item_history` is not needed for the list view.

### Query Design

```typescript
// src/lib/queries/item-memory-admin.ts

export function createItemMemoryQuery(supabase: SupabaseClient<Database>) {
  return createQuery(() => ({
    queryKey: ['item-memory-admin'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_item_memory')
        .select(`
          id,
          display_name,
          normalized_name,
          last_category_id,
          last_used_at,
          use_count
        `)
        .order('display_name', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  }))
}
```

`item_history` is not joined here. The items list in Admin is an index of known items, not a history log. History is shown elsewhere (Admin → Historikk).

### Per-Item Detail View (Edit)

When a user taps an item in the Admin → Items list, the detail view (`/admin/items/[id]`) needs:
1. The `household_item_memory` row (name, category, normalized name)
2. The signed URL for the item's picture from `item-pictures` storage (if `cover_image_path` is added to `household_item_memory`)

**Schema addition needed:** Add `picture_path text` to `household_item_memory` to store the storage object path. Without this column, there is nowhere to persist the item picture reference.

```sql
alter table household_item_memory add column picture_path text;
```

### Relationship to Existing item_history

`item_history` rows reference `item_id` which is a `list_items.id`, not a `household_item_memory.id`. There is no direct FK from `item_history` to `household_item_memory`. The connection is via `item_name` (denormalized string match) or via `normalized_name` lookup.

For the Admin → Historikk subpage, history is queried directly from `item_history` exactly as the existing `createHistoryQuery` does — no schema change needed.

For the Admin → Items detail view, if you want to show "how many times purchased", the count comes from `household_item_memory.use_count` (already maintained by the `upsert_household_item_memory` RPC on every check-off). No additional join to `item_history` is required.

---

## Updated System Overview (v1.2)

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (PWA)                              │
├──────────────────────────────────────────────────────────────────┤
│  SvelteKit Routes (protected)                                     │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ /        │ │/oppskrifter│ │/anbefalinger│ │/admin (hub)      │ │
│  │ /lister  │ │/oppskrifter│ │            │ │  /admin/historikk│ │
│  │ /[id]    │ │/[id]       │ │            │ │  /admin/items    │ │
│  └──────────┘ └────────────┘ └────────────┘ │  /admin/[id]     │ │
│                                              │  /admin/innst.   │ │
│                                              │  /butikker (ext) │ │
│                                              │  /husstand (ext) │ │
│                                              └──────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  BottomNav (4 tabs: Handleliste / Oppskrifter / Anbef / Admin)│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  TanStack Query    │  │  Svelte $state│  │  localStorage   │  │
│  │  (data fetching)   │  │  stores       │  │  (theme pref)   │  │
│  └────────────────────┘  └───────────────┘  └─────────────────┘  │
└───────────────────────────────────┬──────────────────────────────┘
                                    │ HTTPS + WebSocket
┌───────────────────────────────────▼──────────────────────────────┐
│                         SUPABASE                                  │
├──────────────┬─────────────────────┬────────────────┬────────────┤
│  Auth (JWT)  │  PostgreSQL + RLS   │  Realtime      │  Storage   │
│              │                     │                │            │
│              │  households         │  list_items    │ recipe-    │
│              │  profiles           │  (per list_id) │ covers/    │
│              │  lists              │                │            │
│              │  list_items         │  lists         │ item-      │
│              │  categories         │  (household)   │ pictures/  │
│              │  stores             │                │            │
│              │  store_layouts      │                │            │
│              │  item_history       │                │            │
│              │  household_item_    │                │            │
│              │    memory           │                │            │
│              │  recipes  [NEW]     │                │            │
│              │  recipe_ingredients │                │            │
│              │    [NEW]            │                │            │
└──────────────┴─────────────────────┴────────────────┴────────────┘
```

---

## Component Boundaries: New vs Modified

| Component / File | Status | Touches |
|------------------|--------|---------|
| `BottomNav.svelte` | MODIFIED | Tab array, icon union, isActive logic |
| `src/routes/(protected)/oppskrifter/+page.svelte` | NEW | recipes query |
| `src/routes/(protected)/oppskrifter/[id]/+page.svelte` | NEW | recipe detail + ingredients |
| `src/routes/(protected)/admin/+page.svelte` | NEW | navigation hub only |
| `src/routes/(protected)/admin/historikk/+page.svelte` | NEW | reuses createHistoryQuery |
| `src/routes/(protected)/admin/items/+page.svelte` | NEW | createItemMemoryQuery |
| `src/routes/(protected)/admin/items/[id]/+page.svelte` | NEW | item edit + storage upload |
| `src/routes/(protected)/admin/innstillinger/+page.svelte` | NEW | themeStore.toggle() |
| `src/lib/queries/recipes.ts` | NEW | recipes, recipe_ingredients tables, storage |
| `src/lib/queries/item-memory-admin.ts` | NEW | household_item_memory (admin read) |
| `src/lib/stores/theme.svelte.ts` | NEW | localStorage, document.documentElement |
| `src/app.html` | MODIFIED | Add inline dark mode script, change lang to "nb" |
| `src/app.css` | MODIFIED | Add @custom-variant dark for Tailwind v4 |
| `src/lib/types/database.ts` | MODIFIED | Add recipes, recipe_ingredients after migration |
| `household_item_memory` table | MODIFIED | Add picture_path column |
| DB migration (new) | NEW | recipes, recipe_ingredients tables + RLS |
| DB migration (new) | NEW | recipe-covers, item-pictures Storage buckets + RLS |

**Unchanged:** All existing query files (`items.ts`, `lists.ts`, `history.ts`, etc.), all existing route files for `/butikker`, `/husstand`, `/lister/[id]`, the protected layout, the offline queue, realtime subscriptions.

---

## Data Flow: Key New Flows

### Add Recipe Ingredients to Shopping List

```
User views /oppskrifter/[id]
    │
    ▼
createRecipeQuery → recipes + recipe_ingredients (joined)
    │
    ▼
User taps "Legg til alle" or selects individual ingredients
    │
    ▼
createAddOrIncrementItemMutation (existing) called per ingredient
  → supabase.from('list_items').insert or increment quantity
  → upsert_household_item_memory RPC called for each item name
    │
    ▼
TanStack Query invalidates ['items', listId]
Realtime propagates to other open clients on that list
```

### Upload Recipe Cover Image

```
User selects image from /oppskrifter/[id] (edit mode)
    │
    ▼
Client resizes/converts to webp via canvas.toBlob()
    │
    ▼
supabase.storage.from('recipe-covers').upload(path, blob, { upsert: true })
    │
    ▼
On success: supabase.from('recipes').update({ cover_image_path: path })
    │
    ▼
createRecipeQuery invalidated → cover re-fetched
Display: supabase.storage.from('recipe-covers').createSignedUrl(path, 60)
```

### Dark Mode Toggle

```
User taps toggle in /admin/innstillinger
    │
    ▼
themeStore.toggle()
  → document.documentElement.classList.toggle('dark', next)
  → localStorage.setItem('theme', next ? 'dark' : 'light')
    │
    ▼
Tailwind dark: variants take effect immediately (class-based)
No network call, no query invalidation needed
```

---

## Build Order for v1.2

Dependencies drive this ordering. Each step's output is a prerequisite for the next.

```
Step 1: DB Migration — recipes + recipe_ingredients + Storage buckets
  Output: schema ready for all recipe and image work
  Blocks: Steps 2, 3, 6

Step 2: BottomNav restructure (4 tabs)
  Output: nav points to correct routes (even if some routes are stubs)
  Blocks: nothing, but unblocks UX review of all subsequent steps
  Risk: low — purely additive change to existing component

Step 3: Admin hub + subpages (no DB queries yet)
  Output: /admin hub page + link skeleton for all subpages
  Blocks: Step 4 (items), Step 5 (innstillinger), Step 7 (historikk)

Step 4: Recipe list + detail views (read + create, no images yet)
  Output: /oppskrifter works end-to-end without cover images
  Blocks: Step 6 (storage images)
  Depends on: Step 1

Step 5: Dark mode toggle
  Output: app.html inline script + CSS variant + themeStore + toggle UI
  Blocks: nothing
  Depends on: Step 3 (innstillinger page exists)
  Risk: low — isolated to CSS class and localStorage

Step 6: Storage — recipe cover images + item pictures
  Output: upload + display works for both buckets
  Blocks: nothing
  Depends on: Step 1 (buckets), Step 4 (recipe detail page exists)

Step 7: Admin → Items (household_item_memory management)
  Output: editable item list with picture upload
  Depends on: Step 6 (storage for item pictures), Step 3 (admin route exists)
  Schema dependency: picture_path column on household_item_memory

Step 8: Admin → Historikk (move/copy from /anbefalinger)
  Output: history moved to /admin/historikk; /anbefalinger becomes rec-only
  Depends on: Step 3 (admin routes), existing createHistoryQuery (no change)
```

---

## Architectural Patterns

### Pattern 1: Query Invalidation on Realtime Event (unchanged from v1.0)

**What:** Invalidate TanStack Query on Realtime events, never patch cache directly.
**For v1.2:** Recipes do not need Realtime at v1.2 scale — household-shared recipes change rarely and page navigation naturally refetches. Add Realtime subscription only if real-time recipe collaboration becomes a requirement.

### Pattern 2: Path-Stored Storage References (new in v1.2)

**What:** Store only the Storage object path in the DB, generate signed URLs at query time.
**When to use:** All storage image references (recipe covers, item pictures).
**Trade-offs:** One extra round-trip per image (signed URL call), but avoids stale or expired URLs in the database. Signed URLs expire — the path does not.

```typescript
// In the recipe query function, after fetching rows:
const withUrls = await Promise.all(
  rows.map(async (recipe) => {
    if (!recipe.cover_image_path) return { ...recipe, coverUrl: null }
    const { data } = await supabase.storage
      .from('recipe-covers')
      .createSignedUrl(recipe.cover_image_path, 300) // 5 min
    return { ...recipe, coverUrl: data?.signedUrl ?? null }
  })
)
```

### Pattern 3: Admin Subpage Layout with Back Navigation

**What:** A thin `+layout.svelte` in `/admin/` that wraps all subpages with a consistent header.
**When to use:** Only when three or more subpages share identical chrome. For v1.2 with 4-5 subpages this is appropriate.
**Trade-offs:** Adds a layout file but reduces duplicated header markup across subpages.

---

## Anti-Patterns

### Anti-Pattern 1: Storing Signed URLs in the Database

**What people do:** Generate a signed URL on upload and store it in `cover_image_path`.
**Why it's wrong:** Supabase signed URLs expire (configurable, but always finite). The stored URL becomes a broken image link.
**Do this instead:** Store the path only. Generate signed URLs in the query layer on demand.

### Anti-Pattern 2: Dark Mode via DB user_preferences Column

**What people do:** Add a `dark_mode boolean` to the `profiles` table to sync preference across devices.
**Why it's wrong:** Adds a network round-trip before the preference can be applied. Until the profile loads, the page flashes the wrong theme. Also conflicts with system-preference fallback logic.
**Do this instead:** localStorage with an inline script in `app.html`. If cross-device sync is needed later, read the DB preference once after login and write it to localStorage — keep the class application local.

### Anti-Pattern 3: Loading All Item History in the Admin Items List

**What people do:** JOIN `household_item_memory` with `item_history` to show "last purchased on X" in the items index.
**Why it's wrong:** `item_history` can grow large. The items list only needs `use_count` and `last_used_at`, both already in `household_item_memory`.
**Do this instead:** Query `household_item_memory` only for the list view. Show history only on the individual item detail page if needed.

### Anti-Pattern 4: Nesting BottomNav-Linked Routes Inside `/admin`

**What people do:** Move `/butikker` and `/husstand` routes to `/admin/butikker` and `/admin/husstand` to keep admin-related content under one path prefix.
**Why it's wrong at v1.2:** Requires moving route files, updating all existing `<a href="/butikker">` links in components, and verifying nothing breaks. This is a refactor risk with no user-facing benefit — users never see the URL path.
**Do this instead:** Link to existing paths from the admin hub. Nest them properly in a future cleanup milestone if desired.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Storage | `supabase.storage.from(bucket).upload() / createSignedUrl()` | Two new private buckets; RLS scoped to household via folder prefix |
| Supabase PostgreSQL | Two new tables: recipes, recipe_ingredients | Follow existing RLS pattern using my_household_id() |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| oppskrifter/ routes ↔ recipes.ts | TanStack Query (createRecipesQuery) | Same pattern as all other query files |
| admin/items/ ↔ household_item_memory | createItemMemoryQuery in item-memory-admin.ts | Separate from remembered-items.ts (autocomplete) to avoid coupling |
| innstillinger ↔ themeStore | Direct store call | No Supabase involvement |
| recipe detail ↔ createAddOrIncrementItemMutation | Reuses existing mutation | No new mutation needed for "add to list" |
| Storage upload ↔ recipe row | Sequential: upload → update DB | Recipe ID must exist before upload (create recipe first) |

---

## Sources

- Existing source files read directly (HIGH confidence): `BottomNav.svelte`, `(protected)/+layout.svelte`, `+layout.server.ts`, `database.ts`, `items.ts`, `history.ts`, `remembered-items-core.ts`, `active-list.svelte.ts`, `app.html`, `vite.config.ts`, `app.css`
- [Supabase Storage RLS docs](https://supabase.com/docs/guides/storage/security/access-control) — bucket policy patterns, storage.foldername() helper (HIGH confidence)
- [Supabase Storage Upload docs](https://supabase.com/docs/guides/storage/uploads/standard-uploads) — upload API, signed URL generation (HIGH confidence)
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) — class strategy, @custom-variant syntax (HIGH confidence)
- [SvelteKit Routing: Nested layouts](https://svelte.dev/docs/kit/routing#layout) — +layout.svelte in subdirectories (HIGH confidence)
- Dark mode flash prevention — inline script in HTML head before CSS (established pattern, HIGH confidence)

---
*Architecture research for: HandleAppen v1.2 — Nav restructure, recipes, admin hub, dark mode*
*Researched: 2026-03-13*
