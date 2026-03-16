---
phase: 20-client-image-display
plan: 01
subsystem: database
tags: [supabase, postgresql, plpgsql, tanstack-query, typescript]

# Dependency graph
requires:
  - phase: 17-schema-migrations
    provides: brand and product_image_url columns on list_items and household_item_memory tables
  - phase: 19-edge-function-dto-enrichment
    provides: brand and imageUrl fields populated by edge function at barcode lookup time
provides:
  - upsert_household_item_memory RPC stores brand and product_image_url via COALESCE upsert
  - sync_household_item_memory trigger passes brand/image from list_items to memory upsert
  - search_household_item_memory returns brand and product_image_url in result set
  - ItemMemoryEntry TypeScript type includes brand and product_image_url
  - createItemMemoryQuery selects brand and product_image_url from household_item_memory
  - createUpdateItemMemoryMutation persists brand and product_image_url on admin edits
affects:
  - phase 20-02, 20-03, 20-04 (UI components consuming these fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - COALESCE on conflict for nullable enrichment fields: new value wins only if non-null, preserving accumulated data
    - write-at-insert-time: brand/image stored on list_items insert, propagated to memory via trigger

key-files:
  created:
    - supabase/migrations/20260316000000_phase20_sync_enrichment.sql
  modified:
    - src/lib/queries/item-memory-admin.ts
    - src/lib/queries/items.ts (committed in 20-03 as part of that phase's work)

key-decisions:
  - "COALESCE upsert: brand = coalesce(excluded.brand, memory.brand) — new value only updates when non-null, preserving existing enrichment"
  - "items.ts brand/imageUrl fields added alongside 20-03 UI work rather than as a separate 20-01 commit"

patterns-established:
  - "COALESCE upsert pattern for nullable enrichment columns: lets accumulation be safe from NULL overwrites"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 20 Plan 01: Backend and Query Infrastructure Summary

**Database functions updated with COALESCE upsert for brand/image, TypeScript query layer extended with brand and product_image_url fields across household item memory admin**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T19:04:39Z
- **Completed:** 2026-03-16T19:09:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated `upsert_household_item_memory` SQL function to accept `p_brand` and `p_product_image_url`, using COALESCE so existing enrichment is never overwritten by NULL
- Updated `sync_household_item_memory` trigger to pass `new.brand` and `new.product_image_url` from list_items inserts to the upsert function
- Updated `search_household_item_memory` to return `brand` and `product_image_url` in result rows
- Extended `ItemMemoryEntry` type with `brand` and `product_image_url` optional fields
- Updated `createItemMemoryQuery` select string to fetch the new columns
- Updated `createUpdateItemMemoryMutation` to persist `brand` and `product_image_url` on admin edits

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration** - `ad765f8` (feat)
2. **Task 2: item-memory-admin TypeScript query layer** - `fcf9566` (feat)

## Files Created/Modified
- `supabase/migrations/20260316000000_phase20_sync_enrichment.sql` - Full migration: upsert/sync/search function updates for brand and image URL
- `src/lib/queries/item-memory-admin.ts` - Types and mutations extended with brand/product_image_url
- `src/lib/queries/items.ts` - Types and mutations for brand/imageUrl (committed in 20-03 alongside UI work)

## Decisions Made
- COALESCE upsert strategy: `brand = coalesce(excluded.brand, memory.brand)` — new value wins only when non-null, so a barcode scan that found no brand won't erase a previously learned one. Consistent with v2.0-roadmap decision for nullable enrichment columns.
- `items.ts` brand/imageUrl changes were committed as part of 20-03 UI work rather than a standalone 20-01 commit, since both changes were made in the same session. No functional difference.

## Deviations from Plan

None - plan executed exactly as written. The items.ts changes were already present (committed during 20-03 execution); the remaining uncommitted 20-01 work (migration + item-memory-admin) was committed atomically in this session.

## Issues Encountered
None - all target files either already had the required changes or were straightforward additions.

## User Setup Required
None - no external service configuration required. The migration must be applied to the database via `supabase db push` or the Supabase dashboard.

## Next Phase Readiness
- All Phase 20 sub-plans (20-02, 20-03, 20-04) are already complete — they depended on this query infrastructure
- Phase 20 is fully complete with all four plans done
- The database migration `20260316000000_phase20_sync_enrichment.sql` needs to be applied to production

---
*Phase: 20-client-image-display*
*Completed: 2026-03-16*
