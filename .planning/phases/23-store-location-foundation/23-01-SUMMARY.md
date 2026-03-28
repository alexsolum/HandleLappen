---
phase: 23-store-location-foundation
plan: 01
subsystem: database
tags: [supabase, svelte, stores, migration, location]
requires:
  - phase: 03-categories-stores
    provides: stores table and RLS policies
provides:
  - Stores schema with chain, location_name, lat, lng
  - Store query/mutation support for composed identity and coordinates
  - Shared store display-name utility and chain constants
  - Store UI surfaces updated to composed name rendering
affects: [24-location-service-and-store-detection, 25-shopping-mode-and-in-store-checkoff, 26-home-location-and-leaving-store]
tech-stack:
  added: []
  patterns: [composed store display name via utility, explicit update mutation for store coordinates]
key-files:
  created:
    - supabase/migrations/20260328000000_phase23_store_location.sql
    - src/lib/utils/stores.ts
  modified:
    - src/lib/queries/stores.ts
    - src/lib/components/stores/StoreRow.svelte
    - src/lib/components/stores/StoreSelector.svelte
key-decisions:
  - "Store display naming is centralized in storeDisplayName(chain, locationName) to keep all surfaces consistent."
  - "Store updates persist chain, location_name, lat, and lng together through updateStoreMutation."
patterns-established:
  - "Store list/select surfaces render composed names from chain + location_name instead of direct table fields."
  - "Stores query layer includes lat/lng in default store payloads for downstream location phases."
requirements-completed: [STORELOC-01, STORELOC-02]
duration: 4min
completed: 2026-03-28
---

# Phase 23 Plan 01: Store Location Foundation Summary

**Supabase stores schema now supports chain identity and coordinates, with query/UI layers migrated to composed store names for downstream location features.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T21:17:09Z
- **Completed:** 2026-03-28T21:22:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added migration to introduce `chain`, `location_name`, `lat`, `lng`, backfill existing names, enforce `location_name` not-null, and drop legacy `name`.
- Updated store query/mutation layer to read/write the new columns and added `updateStoreMutation`.
- Added `CHAIN_OPTIONS`, `CHAIN_COLORS`, and `storeDisplayName` utility and updated `StoreRow`/`StoreSelector` to use composed names.

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and query/mutation layer update** - `d979bf2` (feat)
2. **Task 2: Update StoreRow and StoreSelector to use composed display name** - `0090d5a` (feat)

## Files Created/Modified
- `supabase/migrations/20260328000000_phase23_store_location.sql` - stores schema migration for chain/location/coordinates.
- `src/lib/utils/stores.ts` - chain constants/color map and composed display-name helper.
- `src/lib/queries/stores.ts` - updated store row shape/select/insert and added update mutation.
- `src/lib/components/stores/StoreRow.svelte` - renders composed display name in row label and delete aria-label.
- `src/lib/components/stores/StoreSelector.svelte` - renders composed display name in selected label and option list.

## Decisions Made
- Centralized composed naming in `storeDisplayName` to avoid duplicated formatting logic.
- Kept `chain` nullable and enforced `location_name` as not null after backfill, matching migration and UI requirements.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit` reports pre-existing errors in unrelated files (`remembered-items-core.ts`, `tests/item-memory.spec.ts`, `vite.config.ts`). Logged in `.planning/phases/23-store-location-foundation/deferred-items.md` per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Store schema/query/display foundation is in place for map widget and coordinate editing in Plan 23-02.
- No blockers in this plan scope.

## Self-Check: PASSED
