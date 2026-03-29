---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 23-store-location-foundation-02-PLAN.md
last_updated: "2026-03-29T10:26:26.555Z"
progress:
  total_phases: 26
  completed_phases: 14
  total_plans: 56
  completed_plans: 49
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.
**Current focus:** Phase 23 — store-location-foundation

## Current Position

Phase: 23 (store-location-foundation) — EXECUTING
Plan: 2 of 2

## Session

**Last session:** 2026-03-29T10:13:34.190Z
**Stopped At:** Completed 23-store-location-foundation-02-PLAN.md
**Resume File:** None

## Performance Metrics

**Velocity:**

- Total plans completed: 31
- Average duration: -
- Total execution time: -

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 11 P01 | 18min | 2 tasks | 7 files |
| Phase 11 P02 | 13min | 2 tasks | 4 files |
| Phase 11 P03 | 7min | 2 tasks | 2 files |
| Phase 12 P01 | 15min | 1 task | 2 files |
| Phase 12 P02 | 10min | 2 tasks | 5 files |
| Phase 12 P03 | 10min | 2 tasks | 2 files |
| Phase 13 P01 | 12min | 2 tasks | 3 files |
| Phase 13 P02 | 15min | 3 tasks | 4 files |
| Phase 13 P03 | 10min | 2 tasks | 3 files |
| Phase 13 P04 | 15min | 5 tasks | 5 files |
| Phase 14 P01 | 20min | 3 tasks | 10 files |
| Phase 14 P02 | 8min | 5 verified + 1 fix | 1 file |
| Phase 14 P03 | 3min | 2 tasks | 4 files |
| Phase 14 P04 | 3 | 4 tasks | 4 files |
| Phase 14-recipes P05 | 5 | 2 tasks | 2 files |
| Phase 04-03 barcode scan-to-add | 20min | 3 tasks | 6 files |
| Phase 04 P04 | 2min | 2 tasks | 2 files |
| Phase 18-ios-scanner-black-screen-fix P01 | 34 | 3 tasks | 4 files |
| Phase 19 P01 | 4 | 3 tasks | 4 files |
| Phase 20 P04 | 2min | 1 tasks | 1 files |
| Phase 20 P03 | 4min | 2 tasks | 5 files |
| Phase 20 P02 | 2min | 2 tasks | 2 files |
| Phase 20 P01 | 5 | 2 tasks | 2 files |
| Phase 21 P01 | 16min | 3 tasks | 4 files |
| Phase 21 P02 | 13min | 2 tasks | 2 files |
| Phase 22 P02 | 3min | 2 tasks | 1 files |
| Phase 22 P01 | 2min | 2 tasks | 1 files |
| Phase 22 P03 | 11min | 3 tasks | 3 files |
| Phase 22 P04 | 4min | 2 tasks | 2 files |
| Phase 23-store-location-foundation P01 | 4min | 2 tasks | 5 files |
| Phase 23-store-location-foundation P02 | 7min | 4 tasks | 5 files |

## Accumulated Context

### Decisions

- [v2.2-roadmap]: Geofence uses client-side haversine (not PostGIS ST_DWithin) — simpler schema, no extension dependency, sufficient for 3-10 stores at household scale.
- [v2.2-roadmap]: Geofence radius set to 150m (not 100m from FEATURES.md) — urban Norway GPS degrades to 50-150m indoors; 90-second dwell timer required to prevent false triggers.
- [v2.2-roadmap]: Interval-based getCurrentPosition (30-60s, enableHighAccuracy: false) instead of watchPosition — prevents 15-25% battery/hour drain; paused on visibilitychange hidden.
- [v2.2-roadmap]: Manual store picker (LOCATE-03) ships in Phase 24 alongside auto-detection, not as a separate phase — it is a required fallback, not an optional enhancement.
- [v2.2-roadmap]: Home location (CHKOFF-03) ships in Phase 26 with its own GDPR-safe RLS, 4-decimal precision truncation, deletion control, and in-app privacy disclosure — non-retrofittable.
- [v2.2-roadmap]: CHKOFF-01 (in-store check-off history) ships in Phase 25 with shopping mode, not Phase 26 — it is the check-off branching that depends on shopping mode state being active.
- [v2.2-roadmap]: Phase 26 depends on Phase 24 (location service) only — it is independent of Phase 25 (shopping mode geofence engine) because home detection uses a single fixed point, not the geofence engine.
- [v2.2-roadmap]: Only new npm package is leaflet@^1.9.4 for admin map widget — Leaflet 2.0-alpha excluded (breaking changes, not production-ready as of March 2026).
- [v2.2-roadmap]: iOS Safari standalone PWA has a documented WebKit bug (Apple Developer Forums thread/694999) where geolocation prompt may silently fail — must gate permission call behind user gesture and test on physical iPhone.
- [Phase 04-03-barcode-scan-to-add]: BarcodeLookupSheet is a dumb props-driven component; all state owned by the list page.
- [Phase 08-reaudit]: v1.0-FINAL-AUDIT.md passed. 100% requirement traceability achieved for v1 milestone.
- [Phase 21]: Queue replay now returns survivors and persisted survivor set is the only retry source.
- [Phase 22]: Deterministic rerun evidence artifact used to close Phase 22 verification gap.
- [Phase 23-store-location-foundation]: Store display naming is centralized in storeDisplayName(chain, locationName) across store UI surfaces.
- [Phase 23-store-location-foundation]: Store updates persist chain, location_name, lat, and lng together through updateStoreMutation.
- [Phase 23-store-location-foundation]: Leaflet map widget uses props-in/events-out so edit page owns coordinate persistence via updateStoreMutation.
- [Phase 23-store-location-foundation]: Checkpoint Task 4 completed based on approved human verification of the full store location flow.

### Pending Todos

- Verify OffscreenCanvas compatibility on iOS 15 (Safari 15) before building image upload pipeline in Phase 15 — may need <canvas> fallback.
- Phase 18 iOS fix must be verified on a real iPhone in installed PWA mode — simulator cannot reproduce the black screen.
- Phase 24 iOS location permission must be tested on a physical iPhone installed to home screen, not in simulator or browser mode.
- Phase 26 GDPR review: confirm existing `profiles` RLS policy (`profiles_update_own`) covers newly added `home_lat`/`home_lng` columns and that no household JOIN exposes home coordinates to other members.

### Blockers/Concerns

- None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Add Google Auth using Supabase | 2026-03-12 | 6019636 | [1-add-google-auth-using-supabase](./quick/1-add-google-auth-using-supabase/) |
| 2 | Improve app categories from grocery_categories.md and sync Supabase | 2026-03-12 | c8c7f59 | [2-improve-app-categories-from-grocery-cate](./quick/2-improve-app-categories-from-grocery-cate/) |
| 3 | Add item administration and Varekatalog management | 2026-03-14 | 7f44449 | [3-add-item-administration-in-the-admin-ite](./quick/3-add-item-administration-in-the-admin-ite/) |
| 5 | Fill items database with top products from Kassal | 2026-03-15 | cc04372 | [5-fill-items-database-with-top-products-fr](./quick/5-fill-items-database-with-top-products-fr/) |
