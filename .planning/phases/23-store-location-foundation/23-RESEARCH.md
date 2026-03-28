# Phase 23: Store Location Foundation - Research

**Researched:** 2026-03-28
**Domain:** Leaflet maps in SvelteKit, Supabase schema migration, store data model refactor
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace single `name` column with `chain` (nullable text) + `location_name` (text) columns
- Display name composed as `{chain} {location_name}` (e.g., "Rema 1000 Teie")
- When chain is "Annet" or null, display name is just the location_name
- Add `lat` (float) and `lng` (float) nullable columns to `stores` table
- Predefined chain list: Rema 1000, Kiwi, Meny, Coop Extra, Coop Mega, Coop Prix, Spar, Joker, Bunnpris, + "Annet" (no branding)
- Chain colors mapped client-side (consumed by Phase 25 for shopping mode banner)
- Page order: Chain dropdown -> Location name field -> "Vises som: {composed name}" preview -> Map widget (250px) -> Save button -> Category reorder section
- Map widget appears above the existing category drag-reorder list
- Single "Lagre" button saves chain, location_name, and coordinates together
- Map height: 250px — balanced for mobile-first PWA
- Leaflet ^1.9.4 with OpenStreetMap tiles — no API key required
- Tap-to-place: user taps map to drop a pin, tap again to reposition
- Explicit save — pin placement does not auto-persist; user must tap "Lagre"
- Default center for new stores (no saved coordinates): southern Norway (~59N, 10E, zoom ~7)
- Saved stores: center on saved pin at neighborhood zoom level (~14)
- Butikker list page creation form updated to match: chain dropdown + location name field (replaces single name input)
- Chain + location required at creation time (consistent with edit page)

### Claude's Discretion
- Leaflet marker icon styling
- Exact zoom levels and map tile provider details
- Migration strategy for existing `name` data to `chain` + `location_name`
- Loading/error states for the map widget
- Mobile touch handling details for map interaction

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STORELOC-01 | User can place a pin on a map in the store admin page to save the store's geographic coordinates | Leaflet `map.on('click', e => ...)` pattern with single-marker tap-to-reposition; coordinates held in component state until "Lagre" pressed |
| STORELOC-02 | User can see a store's saved location displayed on a map when editing that store | Load existing `lat`/`lng` from extended `createStoresQuery`; conditionally center + place marker at saved coordinates on map init |
</phase_requirements>

---

## Summary

Phase 23 adds geographic coordinates and chain identity to the stores data model, along with an interactive Leaflet map widget in the admin store edit page. The work has three pillars: a Supabase migration to extend the `stores` table, a query/mutation layer update to carry the new columns, and a Leaflet map component embedded in the store edit page.

Leaflet 1.9.4 is confirmed current (verified via npm registry, 2026-03-28). The library requires client-side-only initialization in SvelteKit because it accesses `window` during setup. The standard pattern is a dynamic `await import('leaflet')` inside Svelte's `onMount`, which avoids SSR crashes. This project's admin routes do SSR (the `(protected)` layout uses a `load` function), so the dynamic-import approach is mandatory — not optional.

The most notorious Leaflet/Vite pitfall is broken default marker icons in production builds. Vite rewrites CSS asset paths in a way that breaks Leaflet's internal icon resolution. The fix is explicit: import the three PNG assets directly from the `leaflet/dist/images/` directory and assign them to `L.Icon.Default.prototype.options` after the dynamic import. This is well-documented and reproducible without exception in Vite projects.

**Primary recommendation:** Install `leaflet` and `@types/leaflet` as dependencies, use dynamic import inside `onMount`, fix the Vite marker icon pitfall at initialization time, and implement tap-to-reposition by calling `map.on('click', handler)` that sets/repositions a single marker and stores the pending coordinates in `$state`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| leaflet | ^1.9.4 | Interactive map widget, tile rendering, marker placement | Locked decision; no API key; 1.9.4 confirmed current in npm registry |
| @types/leaflet | ^1.9.21 | TypeScript types for Leaflet | Required for type safety; version confirmed current in npm registry |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OpenStreetMap tiles | CDN | Map tile source | Built into all Leaflet examples; no auth |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| leaflet dynamic import | Sveaflet / svelte-leaflet wrapper | Wrappers add abstraction and maintenance risk; raw Leaflet gives direct control and is simpler for a single use case |
| Default blue marker | Custom SVG icon | Custom icon avoids Vite image path bug entirely; default icon works with explicit fix |

**Installation:**
```bash
npm install leaflet
npm install --save-dev @types/leaflet
```

**Version verification:** Confirmed against npm registry on 2026-03-28:
- `leaflet`: 1.9.4
- `@types/leaflet`: 1.9.21

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes land in existing locations:

```
supabase/migrations/
└── 20260328000000_phase23_store_location.sql  # new migration

src/lib/
├── queries/stores.ts                           # extended with new columns + update mutation
├── components/stores/
│   ├── StoreRow.svelte                         # update: display composed name
│   ├── StoreSelector.svelte                    # update: display composed name
│   └── StoreMapWidget.svelte                   # NEW: encapsulates Leaflet lifecycle

src/routes/(protected)/admin/butikker/
├── +page.svelte                                # update: creation form chain+location fields
└── [id]/
    └── +page.svelte                            # update: chain/location/map fields above category reorder
```

### Pattern 1: Leaflet Dynamic Import in onMount

**What:** Import Leaflet inside `onMount` so the SSR pass never touches the `window`-dependent library. This is the canonical SvelteKit pattern for browser-only libraries.

**When to use:** Any time a library accesses `window`, `document`, or browser APIs at import time.

**Example:**
```typescript
// Source: https://khromov.se/using-leaflet-with-sveltekit/
import { onMount, onDestroy } from 'svelte'

let mapEl: HTMLDivElement
let mapInstance: import('leaflet').Map | null = null

onMount(async () => {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  // Fix Vite marker icon breakage (see Pitfall 1)
  L.Icon.Default.prototype.options.iconUrl = (await import('leaflet/dist/images/marker-icon.png?url')).default
  L.Icon.Default.prototype.options.iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png?url')).default
  L.Icon.Default.prototype.options.shadowUrl = (await import('leaflet/dist/images/marker-shadow.png?url')).default
  L.Icon.Default.imagePath = ''

  mapInstance = L.map(mapEl).setView([59.0, 10.0], 7)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapInstance)
})

onDestroy(() => {
  mapInstance?.remove()
  mapInstance = null
})
```

### Pattern 2: Tap-to-Place Single Marker

**What:** On map click, place a marker if none exists; if one exists, move it to the new position. Store the pending `lat`/`lng` in `$state` — not yet persisted until "Lagre" is tapped.

**When to use:** Any admin map where user sets a single point location.

**Example:**
```typescript
// Source: https://leafletjs.com/reference.html (map click event)
let pendingLat = $state<number | null>(existingLat ?? null)
let pendingLng = $state<number | null>(existingLng ?? null)
let marker: import('leaflet').Marker | null = null

// inside onMount, after map is created:
mapInstance.on('click', (e: import('leaflet').LeafletMouseEvent) => {
  pendingLat = e.latlng.lat
  pendingLng = e.latlng.lng

  if (marker) {
    marker.setLatLng(e.latlng)
  } else {
    marker = L.marker(e.latlng).addTo(mapInstance!)
  }
})

// if existing coordinates, place marker immediately:
if (existingLat !== null && existingLng !== null) {
  marker = L.marker([existingLat, existingLng]).addTo(mapInstance)
  mapInstance.setView([existingLat, existingLng], 14)
}
```

### Pattern 3: Store Update Mutation (new)

**What:** A new `updateStoreMutation` in `stores.ts` that saves `chain`, `location_name`, `lat`, `lng` to the `stores` table via `.update()`.

**When to use:** Store edit page "Lagre" button — saves all four fields together.

**Example:**
```typescript
// Follows createStoreMutation pattern in src/lib/queries/stores.ts
type UpdateStoreVariables = {
  id: string
  chain: string | null
  location_name: string
  lat: number | null
  lng: number | null
}

export function updateStoreMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  return createMutation<void, Error, UpdateStoreVariables>(() => ({
    mutationFn: async ({ id, chain, location_name, lat, lng }) => {
      const { error } = await supabase
        .from('stores')
        .update({ chain, location_name, lat, lng })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey(householdId) })
    },
  }))
}
```

### Pattern 4: Composed Display Name Utility

**What:** Pure function to compute display name from `chain` + `location_name`. Used everywhere `store.name` was previously rendered.

**Example:**
```typescript
// New utility: src/lib/utils/stores.ts (or inline in component)
export function storeDisplayName(chain: string | null, locationName: string): string {
  if (!chain || chain === 'Annet') return locationName
  return `${chain} ${locationName}`
}
```

### Anti-Patterns to Avoid

- **Importing Leaflet at module top-level:** `import L from 'leaflet'` at the top of a `.svelte` file crashes SSR. Always use dynamic import inside `onMount`.
- **Not calling `map.remove()` on destroy:** Leaflet maps bind event listeners to the DOM element. Without cleanup, navigating away and back creates duplicate map instances on the same element, causing visual glitches.
- **Persisting coordinates on map click instead of on save:** The design requires explicit save. Storing to Supabase on every tap would create noise and violate the UX decision.
- **Forgetting to invalidate the stores query cache after update:** `updateStoreMutation.onSuccess` must call `queryClient.invalidateQueries` so the edit page re-reads fresh data when navigated back to.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive slippy map | Custom canvas tile renderer | Leaflet | Tile caching, touch events, retina support, projection math — all solved |
| Touch drag on mobile | Manual pointermove handler | Leaflet built-in | Leaflet handles iOS Safari touch, pinch-zoom, and pan natively |
| Coordinate-to-pixel math | Manual projection | Leaflet `L.LatLng`, `map.latLngToLayerPoint` | Mercator projection edge cases are non-trivial |
| Marker icon path resolution | Custom asset import logic | The explicit Vite fix (see Pitfall 1) | One-time fix, well-documented; rolling a custom solution risks subtle differences |

**Key insight:** Leaflet's touch and tile system is production-hardened over 10+ years. The entire map interaction (pan, zoom, tap) is free; only the click-to-place marker and coordinate state need project-specific code.

---

## Common Pitfalls

### Pitfall 1: Broken Marker Icons in Vite Production Build
**What goes wrong:** Default Leaflet marker icons (the blue pin) render as broken images in Vite production builds. The map loads but no pin is visible.
**Why it happens:** Leaflet resolves marker icon paths from CSS at runtime. Vite rewrites CSS asset URLs during bundling, changing the paths Leaflet expects.
**How to avoid:** After the dynamic `import('leaflet')`, explicitly assign the three icon image paths to `L.Icon.Default.prototype.options` and set `L.Icon.Default.imagePath = ''`. Import images with Vite's `?url` query suffix to get the correct hashed asset URL.
**Warning signs:** Icons work in `vite dev` but are missing in `vite build` preview.

### Pitfall 2: Map Container Height Must Be Explicit
**What goes wrong:** The map renders as a zero-height div — completely invisible.
**Why it happens:** Leaflet initializes using the container's computed height. Without an explicit CSS height, the div collapses.
**How to avoid:** Set `height: 250px` directly on the map container element via a `style` attribute or Tailwind `h-[250px]` class. The locked decision already specifies 250px.
**Warning signs:** Map div exists in DOM but has offsetHeight of 0; Leaflet console warning about container size.

### Pitfall 3: SSR Window Access Crash
**What goes wrong:** Build or page load throws `ReferenceError: window is not defined`.
**Why it happens:** Leaflet accesses `window` at import time. The `(protected)` layout uses `+layout.server.ts` which means SSR is active on these routes.
**How to avoid:** Never use a static top-level import for Leaflet. Always use `await import('leaflet')` inside `onMount`.
**Warning signs:** Error appears during `vite build` or first server render, not in browser.

### Pitfall 4: Map Click Event Fires on Marker Drag / Zoom Controls
**What goes wrong:** Clicking zoom buttons or interacting with existing markers also fires the map's `click` event, repositioning the pin unintentionally.
**Why it happens:** Leaflet bubbles click events from controls and markers up to the map unless `stopPropagation` is called.
**How to avoid:** Marker click and control click events stop propagation by default in Leaflet. This is only a risk if adding custom overlays. Standard usage is safe.
**Warning signs:** Pin jumps when user zooms in/out using the zoom control.

### Pitfall 5: Existing `name` Column Migration
**What goes wrong:** Migration fails or data is silently lost if `name` is NOT NULL and the new `location_name` column is added as NOT NULL simultaneously.
**Why it happens:** Current `stores.name` is `NOT NULL`. New schema splits this into `chain` (nullable) + `location_name` (NOT NULL). Any existing rows need their `name` value migrated before the old column is dropped.
**How to avoid:** Migration must: (1) ADD `chain` text and `location_name` text (both nullable initially), (2) UPDATE rows to copy `name` into `location_name`, (3) ALTER `location_name` to SET NOT NULL, (4) DROP `name`. Do this in a single transaction.
**Warning signs:** Migration fails on `SET NOT NULL` if step 2 (backfill) was skipped.

---

## Code Examples

Verified patterns from official sources:

### OpenStreetMap Tile Layer Setup
```typescript
// Source: https://leafletjs.com/reference.html (TileLayer)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map)
```

### Map Click Event to Extract LatLng
```typescript
// Source: https://leafletjs.com/reference.html (Map events)
map.on('click', (e: L.LeafletMouseEvent) => {
  const { lat, lng } = e.latlng
  // lat and lng are numbers ready to persist
})
```

### Safe Map Cleanup in onDestroy
```typescript
// Source: https://leafletjs.com/reference.html (map.remove())
import { onDestroy } from 'svelte'
onDestroy(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
```

### Migration: Extending stores Table
```sql
-- Source: pattern from existing project migrations (e.g., 20260316000000_phase20_sync_enrichment.sql)
-- Run in a single transaction to ensure atomicity

alter table public.stores
  add column chain         text,
  add column location_name text,
  add column lat           double precision,
  add column lng           double precision;

-- Backfill: existing name becomes location_name
update public.stores set location_name = name;

-- Now enforce NOT NULL on location_name
alter table public.stores
  alter column location_name set not null;

-- Drop old column (name becomes redundant)
alter table public.stores drop column name;
```

### Composed Name Helper
```typescript
// Used in StoreRow.svelte, StoreSelector.svelte, and store edit page
export function storeDisplayName(chain: string | null | undefined, locationName: string): string {
  if (!chain || chain === 'Annet') return locationName
  return `${chain} ${locationName}`
}
```

### Updated StoreRow Type (post-migration)
```typescript
// src/lib/queries/stores.ts
type StoreRow = {
  id: string
  chain: string | null
  location_name: string
  lat: number | null
  lng: number | null
  created_at: string
}
```

### Supabase Query Update
```typescript
// src/lib/queries/stores.ts — createStoresQuery updated select
const { data, error } = await supabase
  .from('stores')
  .select('id, chain, location_name, lat, lng, created_at')
  .order('created_at', { ascending: true })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `store.name` single string | `chain` + `location_name` separate columns, composed client-side | Phase 23 (this phase) | All `store.name` references must be replaced with `storeDisplayName(store.chain, store.location_name)` |
| No coordinates on stores | `lat: double precision, lng: double precision` nullable columns | Phase 23 (this phase) | Phase 24 haversine engine can read these directly from the existing stores query |
| Free-text store name creation | Chain dropdown + location name field | Phase 23 (this phase) | All store creation UIs (butikker list page) must be updated |

**Deprecated/outdated:**
- `store.name` column: Removed in migration; any code referencing `store.name` becomes a TypeScript error after types are regenerated.
- `createStoreMutation` with `{ name }` variable: Must be updated to `{ chain, location_name }`.

---

## Open Questions

1. **Supabase type regeneration workflow**
   - What we know: `src/lib/types/database.ts` is a generated file (appears to be UTF-16 encoded, possibly generated by `supabase gen types`). After migration, the stores Row type will be stale.
   - What's unclear: Whether the project has a local Supabase stack running or whether types are manually maintained. The file appears to not be auto-committed.
   - Recommendation: Include a task to run `supabase gen types typescript --local > src/lib/types/database.ts` after migration, OR note that the hand-maintained `StoreRow` type in `stores.ts` is the source of truth (project uses explicit local types in query files, not the generated types directly in most places).

2. **Migration timestamp**
   - What we know: Migration files use timestamps as prefixes (e.g., `20260316000000`).
   - What's unclear: The exact timestamp to use for the Phase 23 migration. Convention in this project is `YYYYMMDD000000_phaseXX_description.sql`.
   - Recommendation: Use `20260328000000_phase23_store_location.sql` (today's date).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (e2e only — no unit test framework detected) |
| Config file | `playwright.config.ts` (inferred from package.json `"test": "playwright test"`) |
| Quick run command | `npm test -- --grep "store location"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STORELOC-01 | Admin opens store edit page, taps map, pin appears, taps Lagre, coordinates saved | e2e | `npm test -- --grep "STORELOC-01"` | No — Wave 0 |
| STORELOC-02 | Admin revisits store edit page, map shows previously saved pin at correct position | e2e | `npm test -- --grep "STORELOC-02"` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** Manual browser verification (map renders, pin drops, save persists)
- **Per wave merge:** `npm test` (full Playwright suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/store-location.spec.ts` — covers STORELOC-01 and STORELOC-02 (Playwright e2e spec)

---

## Sources

### Primary (HIGH confidence)
- npm registry (verified 2026-03-28): `leaflet@1.9.4`, `@types/leaflet@1.9.21`
- `supabase/migrations/20260310000005_phase3_categories_stores.sql` — current stores schema (project codebase)
- `src/lib/queries/stores.ts` — existing query/mutation patterns (project codebase)
- `src/routes/(protected)/admin/butikker/[id]/+page.svelte` — current store edit page (project codebase)
- `src/routes/(protected)/admin/butikker/+page.svelte` — current store list page (project codebase)
- https://leafletjs.com/reference.html — Leaflet map click events, TileLayer, marker API

### Secondary (MEDIUM confidence)
- https://khromov.se/using-leaflet-with-sveltekit/ — SvelteKit + Leaflet onMount dynamic import pattern; verified against Leaflet docs
- https://willschenk.com/labnotes/2024/leaflet_markers_with_vite_build/ — Vite marker icon fix with explicit prototype assignment; consistent with multiple Stack Overflow and GitHub issues on same topic

### Tertiary (LOW confidence)
- GitHub issue https://github.com/Leaflet/Leaflet/issues/6247 — root cause of the Vite/webpack marker icon breakage (single source, but consistent with the fix documented in MEDIUM sources)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirmed exact versions; locked decisions align with verified library
- Architecture: HIGH — patterns derived from existing codebase code review + official Leaflet docs
- Pitfalls: HIGH for Vite icon breakage and SSR crash (widely documented); MEDIUM for migration pitfall (standard SQL; no unusual risk for this schema size)

**Research date:** 2026-03-28
**Valid until:** 2026-06-28 (Leaflet 1.9.x is stable; no breaking changes expected in 90 days)
