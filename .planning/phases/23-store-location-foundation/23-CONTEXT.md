# Phase 23: Store Location Foundation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add geographic coordinates and chain association to stores via an interactive Leaflet map and structured fields in the admin store edit page. This is infrastructure — no location detection, no shopping mode. It gives the proximity engine (Phase 24+) real coordinate data and chain identity to work with.

</domain>

<decisions>
## Implementation Decisions

### Store data model
- Replace single `name` column with `chain` (nullable text) + `location_name` (text) columns
- Display name composed as `{chain} {location_name}` (e.g., "Rema 1000 Teie")
- When chain is "Annet" or null, display name is just the location_name
- Add `lat` (float) and `lng` (float) nullable columns to `stores` table
- Predefined chain list: Rema 1000, Kiwi, Meny, Coop Extra, Coop Mega, Coop Prix, Spar, Joker, Bunnpris, + "Annet" (no branding)
- Chain colors mapped client-side (consumed by Phase 25 for shopping mode banner)

### Store edit page layout
- Page order: Chain dropdown -> Location name field -> "Vises som: {composed name}" preview -> Map widget (250px) -> Save button -> Category reorder section
- Map widget appears above the existing category drag-reorder list
- Single "Lagre" button saves chain, location_name, and coordinates together
- Map height: 250px — balanced for mobile-first PWA

### Map interaction
- Leaflet ^1.9.4 with OpenStreetMap tiles — no API key required
- Tap-to-place: user taps map to drop a pin, tap again to reposition
- Explicit save — pin placement does not auto-persist; user must tap "Lagre"
- Default center for new stores (no saved coordinates): southern Norway (~59N, 10E, zoom ~7)
- Saved stores: center on saved pin at neighborhood zoom level (~14)

### Store creation flow
- Butikker list page creation form updated to match: chain dropdown + location name field (replaces single name input)
- Chain + location required at creation time (consistent with edit page)

### Claude's Discretion
- Leaflet marker icon styling
- Exact zoom levels and map tile provider details
- Migration strategy for existing `name` data to `chain` + `location_name`
- Loading/error states for the map widget
- Mobile touch handling details for map interaction

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store schema and location requirements
- `.planning/REQUIREMENTS.md` — STORELOC-01, STORELOC-02 requirements for map pin placement and display
- `.planning/ROADMAP.md` — Phase 23 success criteria: map pin, coordinate persistence, no API key, lat/lng on stores table

### Roadmap decisions (v2.2)
- `.planning/STATE.md` §Accumulated Context — Geofence uses client-side haversine; 150m radius; Leaflet ^1.9.4 only (no 2.0-alpha); iOS Safari PWA geolocation caveats

### Existing store implementation
- `supabase/migrations/20260310000005_phase3_categories_stores.sql` — Current `stores` table schema and RLS policies
- `src/lib/queries/stores.ts` — Store CRUD queries and mutations (need updating for new columns)
- `src/routes/(protected)/admin/butikker/[id]/+page.svelte` — Current store edit page (category reorder only)
- `src/routes/(protected)/admin/butikker/+page.svelte` — Store list page with create/delete flow
- `src/lib/types/database.ts` — Generated Supabase types (stores type needs regeneration)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StoreRow.svelte`: Existing store list row component — needs update for composed display name
- `StoreSelector.svelte`: Store selector component — needs update for chain-based display
- TanStack Query patterns: `createStoresQuery`, `createStoreMutation`, `deleteStoreMutation` — established patterns to follow
- `DraggableCategoryRow.svelte`: Category reorder component — stays as-is below new map section

### Established Patterns
- Supabase client passed via `data.supabase` from layout
- `data.householdId` available in all protected routes
- Tailwind CSS with green-700 primary, rounded-xl cards, max-w-lg container
- Norwegian language UI labels throughout

### Integration Points
- `stores` table: needs migration adding `chain`, `location_name`, `lat`, `lng` columns; migrating existing `name` data
- Store queries: `createStoresQuery` selects `id, name, created_at` — needs to include new columns
- `createStoreMutation`: currently inserts `name` — needs chain + location_name
- Everywhere `store.name` is referenced needs updating to composed display name
- Phase 24+ will read `lat`/`lng` from the existing stores query for geofence calculations
- Phase 25 will read `chain` for branded banner colors

</code_context>

<specifics>
## Specific Ideas

- Store name is always a composition: "Rema 1000 Teie" = chain "Rema 1000" + location "Teie"
- "Annet" chain means independent store — no chain prefix, display name is just location_name
- Chain list covers ~95% of Norwegian grocery retail: Rema 1000, Kiwi, Meny, Coop Extra, Coop Mega, Coop Prix, Spar, Joker, Bunnpris
- Map default view shows southern Norway to cover the most populated areas

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-store-location-foundation*
*Context gathered: 2026-03-28*
