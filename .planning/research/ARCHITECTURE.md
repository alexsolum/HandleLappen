# Architecture Research

**Domain:** Family grocery PWA — location-aware shopping mode (v2.2)
**Researched:** 2026-03-28
**Confidence:** HIGH (codebase read directly; geolocation API behaviour confirmed via MDN and community sources)

---

## v2.2 Change Overview

This milestone adds location-awareness on top of the existing SvelteKit + Supabase architecture. The core question is how geolocation watching, geofence detection, store location storage, home location storage, and shopping mode state layer into what already exists.

**What already exists that this milestone touches:**

- `stores` table — household-scoped, currently has only `id`, `name`, `created_at`. No location columns.
- `profiles` table — per-user, currently has `id`, `household_id`, `display_name`, `avatar_url`. No home location.
- `item_history` table — already has `store_id` and `store_name` columns (added in Phase 6). The check-off mutation (`createCheckOffMutation` in `items.ts`) already accepts a `historyContext` with `storeId` and `storeName` — these fields are passed from `selectedStoreId` on the list page.
- `lister/[id]/+page.svelte` — already manages `selectedStoreId` as local `$state`. The store selector is a manual control today; location will auto-populate it.
- `offline.svelte.ts` — manages online/offline state via `$state`. The location store must follow the same pattern.
- `active-list.svelte.ts` — global `$state` singleton that tracks the active list. The shopping mode store follows the same pattern.

**What this milestone adds:**

1. DB schema: latitude/longitude on `stores`, home location on `profiles`
2. Client: a `location.svelte.ts` store (geolocation watcher + geofence engine)
3. Client: a `shopping-mode.svelte.ts` store (computed from location + stores data)
4. UI: `ShoppingModeBanner.svelte` (new component rendered in the protected layout)
5. UI: Admin store detail page gains a location-setting UI (map or coordinate input)
6. UI: User settings page gains a home location setter
7. Behavior change: check-off logic branches on shopping mode state

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SvelteKit PWA (Client)                            │
├───────────────────────────────────────────────────────────────────────── ┤
│  Layout Layer  (protected)+layout.svelte                                  │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  ShoppingModeBanner.svelte [NEW]                                  │    │
│  │  reads: shoppingModeStore  (storeId, storeName, brandColor)       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────────────  ┤
│  Page Layer  lister/[id]/+page.svelte [MODIFIED]                          │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  StoreSelector [EXISTS] │  │  checkOffMutation [EXISTS]            │   │
│  │  auto-set via           │  │  passes historyContext.storeId only   │   │
│  │  shoppingModeStore      │  │  when shoppingModeStore.active=true   │   │
│  └─────────────────────────┘  └──────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────  ┤
│  Store Layer  (Svelte 5 $state singletons in src/lib/stores/)             │
│  ┌───────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  location.svelte.ts   │  │  shopping-mode.svelte.ts                  │ │
│  │  [NEW]                │  │  [NEW]                                    │ │
│  │  watchId: number      │  │  active: boolean                          │ │
│  │  coords: LatLng|null  │  │  storeId: string|null                     │ │
│  │  error: string|null   │  │  storeName: string|null                   │ │
│  │  permission: string   │  │  brandColor: string|null                  │ │
│  └───────────┬───────────┘  └─────────────┬────────────────────────────┘ │
│              │                             │                              │
│              │ coords change               │ derived from coords          │
│              │                             │ + stores with locations      │
├──────────────┴─────────────────────────────┴──────────────────────────── ┤
│  Query Layer  TanStack Query                                               │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  stores query [MODIFIED] — now selects lat, lng alongside id,name  │   │
│  └───────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────  ┤
│  Supabase Backend                                                          │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────┐  │
│  │  stores table [MIGRATED]│  │  profiles table [MIGRATED]             │  │
│  │  + lat float8 nullable  │  │  + home_lat float8 nullable            │  │
│  │  + lng float8 nullable  │  │  + home_lng float8 nullable            │  │
│  │  + address text nullable│  │  RLS: own-row update only              │  │
│  │  RLS: household-scoped  │  └───────────────────────────────────────┘  │
│  └─────────────────────────┘                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  item_history table [NO CHANGE]                                      │ │
│  │  store_id and store_name already exist (Phase 6)                     │ │
│  │  check-off path already accepts historyContext.storeId               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DB Schema Additions

### stores table — add location columns

```sql
alter table public.stores
  add column lat  float8,
  add column lng  float8,
  add column address text;
```

Both `lat` and `lng` are nullable. A store without coordinates simply never triggers geofencing. `address` is a human-readable label shown in the admin UI. No PostGIS extension is needed — all distance calculations run client-side using the haversine formula. Storing raw floats is simpler, avoids the PostGIS dependency, and is sufficient for the 100m geofence at this scale.

### profiles table — add home location columns

```sql
alter table public.profiles
  add column home_lat float8,
  add column home_lng float8;
```

Home location is per-user (individual setting). Stored on `profiles` because that table is already per-user with the correct RLS: `profiles_update_own` allows each user to update only their own row, which is exactly the required access pattern. No separate table is needed.

### No changes to item_history

The `store_id` and `store_name` columns were added in Phase 6 migration `20260311000001_phase6_history_snapshots.sql`. The `createCheckOffMutation` in `items.ts` already passes `historyContext.storeId` and `historyContext.storeName` when performing a check-off. The v2.2 behavior change is purely in the condition under which this context is populated — the schema requires no migration.

---

## New Client Components and Stores

### `src/lib/stores/location.svelte.ts` (NEW)

Manages `navigator.geolocation.watchPosition` as a Svelte 5 `$state` singleton, following the exact same pattern as `offline.svelte.ts`.

```typescript
export const locationStore = $state({
  coords: null as { lat: number; lng: number } | null,
  accuracy: null as number | null,
  permission: 'unknown' as 'unknown' | 'granted' | 'denied' | 'prompt',
  error: null as string | null,
})

let watchId: number | null = null

export function startLocationWatch(): void {
  if (typeof window === 'undefined') return
  if (watchId !== null) return  // already watching

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      locationStore.coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      locationStore.accuracy = position.coords.accuracy
      locationStore.error = null
      locationStore.permission = 'granted'
    },
    (err) => {
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        locationStore.permission = 'denied'
      }
      locationStore.error = err.message
    },
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 }
  )
}

export function stopLocationWatch(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}
```

Key decisions:
- `maximumAge: 15_000` — accept cached position up to 15s old. Safari iOS has documented behaviour where `watchPosition` delivers one high-accuracy fix then switches to a position every 15 minutes when "Precise Location" is disabled. The 15s cache budget is acceptable for a 100m geofence.
- `enableHighAccuracy: true` — required to get GPS-quality fixes on Android. iOS respects this when precise location is enabled.
- `timeout: 10_000` — fire the error callback if no fix arrives within 10s, so the UI can prompt the user rather than waiting indefinitely.
- The store is only started when the user explicitly allows it (permission prompt on first call to `startLocationWatch`). It is never started from SSR context.

### `src/lib/stores/shopping-mode.svelte.ts` (NEW)

Derives shopping mode from location + stores data. This is a computed singleton.

```typescript
import { locationStore } from './location.svelte'

type StoreWithLocation = {
  id: string
  name: string
  lat: number | null
  lng: number | null
}

export const shoppingModeStore = $state({
  active: false,
  storeId: null as string | null,
  storeName: null as string | null,
  brandColor: null as string | null,
})

const GEOFENCE_RADIUS_METERS = 100

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function updateShoppingMode(stores: StoreWithLocation[]): void {
  const coords = locationStore.coords
  if (!coords) {
    shoppingModeStore.active = false
    shoppingModeStore.storeId = null
    shoppingModeStore.storeName = null
    shoppingModeStore.brandColor = null
    return
  }

  const nearby = stores
    .filter((s) => s.lat != null && s.lng != null)
    .find((s) =>
      haversineMeters(coords.lat, coords.lng, s.lat!, s.lng!) <= GEOFENCE_RADIUS_METERS
    )

  if (nearby) {
    shoppingModeStore.active = true
    shoppingModeStore.storeId = nearby.id
    shoppingModeStore.storeName = nearby.name
    shoppingModeStore.brandColor = BRAND_COLORS[nearby.name] ?? null
  } else {
    shoppingModeStore.active = false
    shoppingModeStore.storeId = null
    shoppingModeStore.storeName = null
    shoppingModeStore.brandColor = null
  }
}

// Norwegian chain brand colors (keyed by store name)
const BRAND_COLORS: Record<string, string> = {
  'Rema 1000': '#003087',   // blue
  'Kiwi':      '#4caf50',   // green
  'Meny':      '#e53935',   // red
  'Coop Extra':'#fdd835',   // yellow
}
```

`updateShoppingMode` is called from `$effect` blocks wherever stores data is available. It does not auto-run — it is driven by reactivity, not a polling loop.

### `src/lib/components/shopping/ShoppingModeBanner.svelte` (NEW)

A fixed-position banner rendered in `(protected)/+layout.svelte` directly above the `BottomNav`. Visible only when `shoppingModeStore.active` is true.

```svelte
<script lang="ts">
  import { shoppingModeStore } from '$lib/stores/shopping-mode.svelte'
</script>

{#if shoppingModeStore.active}
  <div
    class="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30
           flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white shadow-md"
    style="background-color: {shoppingModeStore.brandColor ?? '#374151'}"
    data-testid="shopping-mode-banner"
  >
    Handlemodus — {shoppingModeStore.storeName}
  </div>
{/if}
```

Positioning: the `BottomNav` uses `bottom-0` with a fixed height of ~`6.5rem + safe-area-inset-bottom`. The banner sits immediately above it so it does not overlap list content.

---

## Modified Existing Components

### `src/lib/queries/stores.ts` (MODIFIED)

The `StoreRow` type and `.select()` string must include `lat` and `lng`:

```typescript
type StoreRow = {
  id: string
  name: string
  lat: number | null
  lng: number | null
  created_at: string
}

// in createStoresQuery:
.select('id, name, lat, lng, created_at')
```

All consumers of `storesQuery.data` receive `lat`/`lng`. The admin store list and store selector already use `storesQuery.data` — they will ignore the new fields unless they explicitly read them.

### `src/routes/(protected)/+layout.svelte` (MODIFIED)

Two additions:

1. Import and render `ShoppingModeBanner` above `BottomNav`.
2. In `onMount`, call `startLocationWatch()` after the queue drain logic. Location watching begins when the app mounts, not on every page load.

The `(protected)/+layout.svelte` is the correct place because it wraps the entire authenticated app. Location watching should be app-wide, not per-page.

```svelte
onMount(() => {
  void drainQueue()
  startLocationWatch()  // new
  ...
})
```

### `src/routes/(protected)/lister/[id]/+page.svelte` (MODIFIED)

Two behavior changes:

**1. Auto-set selectedStoreId from shoppingModeStore:**

```svelte
$effect(() => {
  if (shoppingModeStore.active && shoppingModeStore.storeId) {
    selectedStoreId = shoppingModeStore.storeId
  }
})
```

This does not override a manual selection the user has already made unless shopping mode activates. If the user has manually selected a different store than the one detected, the effect fires and overwrites their selection. This is the correct behavior — the app detected you are physically in a store, so that store's layout takes priority.

**2. Suppress history when at home (not in shopping mode):**

The current `handleGroupToggle` always passes `historyContext`. The new behavior:

```typescript
function handleGroupToggle(itemId: string, checked: boolean) {
  const item = activeItems.find((entry) => entry.id === itemId)
  if (item) {
    checkOffMutation.mutate({
      itemId,
      isChecked: checked,
      itemName: item.name,
      // Only record history when actively shopping near a store
      historyContext: shoppingModeStore.active
        ? {
            listName: data.listName,
            storeId: shoppingModeStore.storeId,
            storeName: shoppingModeStore.storeName,
          }
        : undefined,
    })
  }
}
```

When `historyContext` is `undefined`, the existing `createCheckOffMutation` already skips the `item_history` insert (the conditional `if (isChecked)` block checks for context). Confirm the exact guard in `items.ts` — currently the mutation inserts into `item_history` whenever `isChecked` is true, regardless of `historyContext`. The `historyContext` is only used to populate optional columns. To suppress the history insert entirely when at home, the mutation logic must check whether `historyContext` is present:

```typescript
// In createCheckOffMutation → runOnlineToggle:
if (isChecked && historyContext !== undefined) {
  // insert into item_history
}
// When historyContext is undefined: toggle the item but do not record history
```

This is a targeted change to `items.ts` — one additional condition on the existing `if (isChecked)` block.

**3. Trigger shoppingMode computation on stores data load:**

```svelte
$effect(() => {
  if (storesQuery.data) {
    updateShoppingMode(storesQuery.data)
  }
})
```

The list page already queries stores (`createStoresQuery`). This effect re-evaluates geofences whenever stores or location changes.

### `src/routes/(protected)/admin/butikker/[id]/+page.svelte` (MODIFIED)

The store detail page gains a location-setting section. Options presented to the admin:

- Manual coordinate entry (lat/lng text inputs)
- Address text field (stored as-is, displayed in admin for context; no geocoding server-side)

The admin sets coordinates by entering them or by clicking "Use my current location" which calls `navigator.geolocation.getCurrentPosition` directly (one-shot, no watcher needed here).

A `updateStoreLocationMutation` is added to `stores.ts`:

```typescript
type UpdateStoreLocationVariables = {
  id: string
  lat: number | null
  lng: number | null
  address: string | null
}

export function updateStoreLocationMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  return createMutation<void, Error, UpdateStoreLocationVariables>(() => ({
    mutationFn: async ({ id, lat, lng, address }) => {
      const { error } = await supabase
        .from('stores')
        .update({ lat, lng, address })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey(householdId) })
    },
  }))
}
```

### User settings page — home location (NEW ROUTE or MODIFIED)

Home location is set once per user. The existing `/admin/husstand` page manages household members. A user settings page does not exist yet. Two options:

**Option A:** Add a "Min posisjon" section to `/admin/husstand/+page.svelte`. Simpler — reuses the existing admin route. The section is per-user because it reads/updates `profiles` scoped by `auth.uid()`.

**Option B:** Create a new `/innstillinger` route.

Recommendation is **Option A** — avoid a new route for a single field. The admin page is already the settings area.

The home location query/mutation reads and updates `profiles.home_lat` and `profiles.home_lng` for the current user. A "Use my location" button calls `getCurrentPosition` and writes the result. A "Clear" button sets both to null.

---

## Data Flow

### Location → Shopping Mode Flow

```
App mounts (protected layout onMount)
    ↓
startLocationWatch()
    ↓
navigator.geolocation.watchPosition registers handler
    ↓
GPS fix arrives → locationStore.coords = { lat, lng }
    ↓
[lister page $effect] updateShoppingMode(storesQuery.data)
    ↓
haversineMeters(coords, store.coords) <= 100m ?
    YES → shoppingModeStore.active=true, storeId, storeName, brandColor
    NO  → shoppingModeStore.active=false, all null
    ↓
ShoppingModeBanner renders (or hides) via $derived in layout
    ↓
List page $effect: if shoppingModeStore.active → selectedStoreId = storeId
    ↓
storeLayoutQuery reloads with new storeId → items re-sort by store layout
```

### Check-Off Branching Flow

```
User taps item checkbox
    ↓
handleGroupToggle(itemId, checked=true)
    ↓
shoppingModeStore.active?
    YES → historyContext = { listName, storeId, storeName }
    NO  → historyContext = undefined
    ↓
checkOffMutation.mutate({ itemId, isChecked: true, itemName, historyContext })
    ↓
isOfflineMode()?
    YES → enqueue to offline queue (historyContext NOT stored — see Pitfalls)
    NO  →
      update list_items.is_checked = true
      historyContext defined?
        YES → insert item_history { list_id, item_name, checked_by,
                                    checked_at, list_name, store_id, store_name }
        NO  → no item_history insert (at-home deletion treatment)
```

### Store Location Setup Flow (Admin)

```
Admin opens /admin/butikker/[id]
    ↓
Sees existing category reorder UI [unchanged]
    ↓
Sees new "Butikkens lokasjon" section
    ↓
Option A: types lat/lng manually
Option B: taps "Bruk min posisjon" → getCurrentPosition() → fills fields
    ↓
Taps "Lagre posisjon"
    ↓
updateStoreLocationMutation.mutate({ id, lat, lng, address })
    ↓
stores table updated → storesQueryKey invalidated
    ↓
All open list pages: storesQuery refetches → updateShoppingMode re-evaluates
```

---

## Component Boundaries: New vs Modified

| Artifact | Status | What Changes |
|----------|--------|--------------|
| `stores` table | MIGRATION | Add `lat float8`, `lng float8`, `address text` (all nullable) |
| `profiles` table | MIGRATION | Add `home_lat float8`, `home_lng float8` (nullable) |
| `item_history` table | NO CHANGE | `store_id`, `store_name` already exist from Phase 6 |
| `src/lib/stores/location.svelte.ts` | NEW | `watchPosition` wrapper with `$state`; `startLocationWatch` / `stopLocationWatch` exports |
| `src/lib/stores/shopping-mode.svelte.ts` | NEW | `shoppingModeStore` `$state` singleton; `updateShoppingMode(stores)` function; haversine; brand color map |
| `src/lib/components/shopping/ShoppingModeBanner.svelte` | NEW | Fixed banner above BottomNav; reads `shoppingModeStore` |
| `src/lib/queries/stores.ts` | MODIFIED | `StoreRow` gains `lat`, `lng`; `.select()` updated; add `updateStoreLocationMutation` |
| `src/routes/(protected)/+layout.svelte` | MODIFIED | Call `startLocationWatch()` in `onMount`; render `ShoppingModeBanner` |
| `src/routes/(protected)/lister/[id]/+page.svelte` | MODIFIED | `$effect` auto-sets `selectedStoreId` from shopping mode; check-off conditioned on `shoppingModeStore.active`; `$effect` calls `updateShoppingMode` |
| `src/lib/queries/items.ts` | MODIFIED | `createCheckOffMutation` → `runOnlineToggle`: history insert gated on `historyContext !== undefined` (not just `isChecked`) |
| `src/routes/(protected)/admin/butikker/[id]/+page.svelte` | MODIFIED | Add location-setting section with coordinate inputs and "use my location" |
| `src/routes/(protected)/admin/husstand/+page.svelte` | MODIFIED | Add home location section (per-user `home_lat`/`home_lng` on profiles) |
| `src/lib/offline/queue.ts` | NOT MODIFIED | Offline queue payload currently omits `historyContext`; offline check-offs never write history. Acceptable for v2.2 — see Pitfalls. |
| `BottomNav.svelte` | NO CHANGE | Layout position unchanged; banner inserts above it |
| `StoreSelector.svelte` | NO CHANGE | Remains available for manual override when shopping mode is not active |

---

## Build Order (Dependency-Based)

```
Step 1: DB migrations (blocking — all subsequent steps depend on schema)
  a. stores: add lat, lng, address columns
  b. profiles: add home_lat, home_lng columns
  Why first: stores query and profile mutation must be able to write/read
             these columns before any client code deploys.

Step 2: src/lib/queries/stores.ts — extend StoreRow and add location mutation
  - Add lat, lng to StoreRow type and .select()
  - Add updateStoreLocationMutation
  Depends on: Step 1a
  Why: admin location UI and the shopping mode engine both depend on stores
       returning lat/lng.

Step 3: src/lib/stores/location.svelte.ts — new geolocation store
  - watchPosition wrapper, permission state, startLocationWatch/stopLocationWatch
  Depends on: nothing (pure browser API)
  Can be built independently of Steps 1-2.

Step 4: src/lib/stores/shopping-mode.svelte.ts — new shopping mode store
  - shoppingModeStore $state
  - haversine function
  - updateShoppingMode(stores)
  - brand color map
  Depends on: Step 3 (reads locationStore.coords)
  Why: the engine needs location coords to evaluate geofences.

Step 5: src/lib/components/shopping/ShoppingModeBanner.svelte — new banner
  - Reads shoppingModeStore
  - Applies brand color
  Depends on: Step 4
  Why: banner is inert without the store to drive it.

Step 6: src/routes/(protected)/+layout.svelte — wire location start + banner
  - Call startLocationWatch() in onMount
  - Render ShoppingModeBanner above BottomNav
  Depends on: Steps 3, 5
  Why: layout is where the location watcher is initialized app-wide.

Step 7: src/lib/queries/items.ts — gate history insert on historyContext
  - In runOnlineToggle: change condition from `if (isChecked)` to
    `if (isChecked && historyContext !== undefined)`
  Depends on: nothing (isolated logic change)
  Can be built in parallel with Steps 3-6.
  Why early: must be in place before the list page change (Step 8)
             sends undefined historyContext for at-home check-offs.

Step 8: lister/[id]/+page.svelte — auto store selection + conditional history
  - $effect: auto-set selectedStoreId from shoppingModeStore
  - $effect: call updateShoppingMode on stores data change
  - handleGroupToggle: pass historyContext only when shoppingModeStore.active
  Depends on: Steps 2, 4, 7
  Why last for core flow: depends on stores having lat/lng (Step 2),
    shopping mode store existing (Step 4), and items mutation gating
    correctly (Step 7).

Step 9: admin butikker/[id] — location setting UI
  - Add lat/lng input section
  - "Use my location" button via getCurrentPosition (one-shot)
  - Wire to updateStoreLocationMutation
  Depends on: Step 2 (mutation must exist)
  Can be built in parallel with Steps 3-8.

Step 10: admin husstand — home location section
  - Read home_lat/home_lng from profiles (requires Step 1b migration)
  - Write via profiles update mutation
  Depends on: Step 1b
  Lowest priority — home location feature is needed for future "at home =
  deletion" nuance but does not block the geofence-to-shopping-mode flow.
```

---

## Architectural Patterns

### Pattern 1: $state Singleton Store for Device API State

**What:** Wrap `navigator.geolocation.watchPosition` in a Svelte 5 `$state` object following the same pattern as `offline.svelte.ts` (which wraps `navigator.onLine`). Export start/stop functions; export the state object. Components and other stores read it reactively.

**When to use:** Any browser API that produces continuous asynchronous updates (network status, geolocation, device orientation, battery status).

**Trade-offs:** The singleton is module-level — safe in SvelteKit because geolocation is browser-only and this module is never imported in SSR context. The `if (typeof window === 'undefined') return` guard at the top of each function is sufficient SSR protection, matching the existing `offline.svelte.ts` approach.

**Example:** See `location.svelte.ts` and `shopping-mode.svelte.ts` above.

### Pattern 2: Computed Geofence Engine as a Separate Store

**What:** The geofence evaluation (`updateShoppingMode`) is a pure function called from `$effect` blocks rather than a continuous loop. It reads `locationStore.coords` and the current stores list, and writes to `shoppingModeStore`. The function is called wherever stores data is available (the list page already loads stores).

**When to use:** When geofence evaluation depends on both live location and database-backed data that may not be available at the time location first resolves.

**Trade-offs:** The function must be called explicitly from `$effect` blocks on pages that load stores. This is slightly more explicit than a fully reactive computed value, but avoids coupling the location store to TanStack Query. A fully reactive approach (making `shoppingModeStore` a `$derived` that reads stores data from a global query cache) would require exposing the QueryClient globally — a bigger architectural change not warranted here.

### Pattern 3: historyContext as Opt-In (undefined = no history)

**What:** The `historyContext` parameter to `checkOffMutation` was already optional. v2.2 formalises its semantics: `undefined` means "do not record this check-off as shopping history". At-home check-offs pass no context; near-store check-offs pass full context including `storeId`.

**When to use:** When the same mutation must produce different persistence side effects depending on app state.

**Trade-offs:** The existing offline queue (`queue.ts`) does not store `historyContext` in its `QueuedMutation.payload` — queued toggles always write history on replay regardless of where the user was when they checked off the item. This is an existing limitation that v2.2 does not fix. The gap is acceptable: offline shopping is the common case (users often have poor signal in stores) and history for offline check-offs is desirable. At-home deletions while offline are rare and the duplicate history entry is a minor inaccuracy.

---

## Anti-Patterns

### Anti-Pattern 1: Starting watchPosition in a Page Component

**What people do:** Call `navigator.geolocation.watchPosition` inside `onMount` of a shopping list page component.

**Why it's wrong:** A new watcher is created each time the user navigates to a list, and the watcher from the previous page may not be cleared. This produces multiple watchers running simultaneously, draining battery and creating race conditions in the `shoppingModeStore` update.

**Do this instead:** Start the watcher once in `(protected)/+layout.svelte` which is mounted once for the session. Stop it in the layout's `onDestroy`. Pages only read `locationStore` and `shoppingModeStore` — they never start or stop the watcher.

### Anti-Pattern 2: PostGIS for a Two-Table, Client-Side Geofence

**What people do:** Enable the PostGIS extension in Supabase and store store locations as `geography(POINT)` columns to enable server-side ST_DWithin queries.

**Why it's wrong:** The app has at most a handful of stores per household. All location data fits in a single query response. A client-side haversine over 5-10 points is microsecond-level computation. PostGIS adds migration complexity, a Supabase extension dependency, and requires understanding of geography column serialization. The overhead is not justified.

**Do this instead:** Store `lat float8` and `lng float8` as plain columns. Evaluate the 100m geofence in `updateShoppingMode` using a 20-line haversine function. If the app ever needs to support thousands of stores or server-side spatial queries (e.g., "find stores near me across all households"), PostGIS becomes appropriate. Not now.

### Anti-Pattern 3: Polling watchPosition Instead of Using the Watcher

**What people do:** Call `navigator.geolocation.getCurrentPosition` on a `setInterval` to simulate continuous location tracking.

**Why it's wrong:** `getCurrentPosition` wakes the GPS hardware on each call. `watchPosition` uses the OS location manager which batches updates and shares the GPS fix with other apps — significantly better battery efficiency. On iOS in standalone mode, `getCurrentPosition` inside a `setInterval` will also be throttled by Safari's background execution limits.

**Do this instead:** Use `watchPosition` with `maximumAge: 15_000` and `enableHighAccuracy: true`. The OS delivers updates when the position changes by a meaningful amount.

### Anti-Pattern 4: Overwriting Manual Store Selection on Every Location Update

**What people do:** Update `selectedStoreId = shoppingModeStore.storeId` in an `$effect` that re-runs every time `locationStore.coords` changes, even when the user has manually selected a different store.

**Why it's wrong:** If the user is 150m from Store A but selects Store B manually (because they drove past and the geofence fired briefly), the effect would keep resetting their selection back to Store A on every location update.

**Do this instead:** Set `selectedStoreId` from shopping mode only when transitioning from inactive to active (i.e., check a flag or compare previous vs current `storeId`). If `shoppingModeStore.active` was already true and the storeId has not changed, do not overwrite. SvelteKit's `$effect` already de-duplicates if the derived values are stable, but the condition must be explicit to avoid overwriting deliberate manual selections.

---

## Integration Points

### Existing Tables Integration

| Table | Relation to Location Feature | What Changes |
|-------|------------------------------|--------------|
| `stores` | Gains `lat`, `lng`, `address` | Migration; query extended to select new columns |
| `profiles` | Gains `home_lat`, `home_lng` | Migration; new admin UI section writes these |
| `item_history` | Already has `store_id`, `store_name` (Phase 6) | No schema change; behavior change: only written when `historyContext` is defined |
| `list_items` | No change | Check-off behavior changes are in the mutation, not the table |
| `store_layouts` | No change | Still used for category sorting once `selectedStoreId` is set |

### Browser API Integration

| API | Integration Pattern | Constraints |
|-----|---------------------|-------------|
| `navigator.geolocation.watchPosition` | Singleton watcher started in layout `onMount` | iOS Safari: precise location must be on or accuracy degrades to 3-9km; EU region limitation (standalone mode disabled by DMA) is not applicable to Norwegian users on Norwegian market app |
| `navigator.geolocation.getCurrentPosition` | One-shot in admin and settings for location-setting UX | No permission difference from watchPosition — same `geolocation` permission |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `location.svelte.ts` ↔ `shopping-mode.svelte.ts` | Direct import; `locationStore.coords` read by `updateShoppingMode` | Both are module-level singletons; no circular dependency |
| `shopping-mode.svelte.ts` ↔ `lister/[id]/+page.svelte` | `$effect` reads `shoppingModeStore.active` and `storeId` | Page calls `updateShoppingMode` with its stores data; store cannot initiate this call on its own |
| `shoppingModeStore` ↔ `checkOffMutation` | Via `historyContext` parameter | Shopping mode state determines whether history is recorded; mutation does not import the store directly — the page passes the context as a parameter |
| `(protected)/+layout.svelte` ↔ all child pages | Location watcher and banner are owned by layout; pages are consumers | Clean one-way dependency |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (family use, <50 users, <10 stores per household) | Client-side haversine over in-memory store list is fine. No server-side geofencing needed. |
| 1k-10k users | No geofencing changes needed — computation is per-client. Store list remains small per household. |
| Multi-household product (different concern) | If stores become shared across households (e.g., a global store database), PostGIS becomes appropriate and the location logic should move server-side. Out of scope. |

---

## Sources

- Direct source reads (HIGH confidence): `src/lib/stores/offline.svelte.ts`, `src/lib/stores/active-list.svelte.ts`, `src/routes/(protected)/+layout.svelte`, `src/routes/(protected)/lister/[id]/+page.svelte`, `src/lib/queries/stores.ts`, `src/lib/queries/items.ts`, `src/lib/offline/queue.ts`, `src/lib/components/lists/BottomNav.svelte`
- Direct migration reads (HIGH confidence): `20260310000005_phase3_categories_stores.sql` (stores table shape), `20260311000001_phase6_history_snapshots.sql` (item_history already has store_id/store_name), `20260308000001_phase1_foundation.sql` (profiles table shape and RLS)
- MDN Geolocation.watchPosition (MEDIUM confidence — accessed via web search): `https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition`
- Safari iOS PWA geolocation limitations (MEDIUM confidence — via web search): precise location off → watchPosition degrades to one fix + updates every 15min; `maximumAge` must account for this
- PostGIS / Supabase geography columns (MEDIUM confidence — via Supabase docs): PostGIS is available but not warranted at this scale; raw float columns are sufficient
- Haversine formula correctness (HIGH confidence — standard formula): Earth radius 6,371,000m, standard Haversine implementation; at 100m distances the formula error vs actual spherical distance is negligible

---
*Architecture research for: HandleAppen v2.2 — Location-aware shopping mode*
*Researched: 2026-03-28*
