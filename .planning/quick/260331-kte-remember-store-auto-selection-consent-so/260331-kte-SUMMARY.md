# Quick Task 260331-kte Summary

## Goal

Persist store auto-selection consent per user so returning list visits can resume location detection without requiring the explanation-first opt-in button again.

## Completed Tasks

### 1. Persisted per-user consent flag
- Added `public.profiles.automatic_store_selection_enabled boolean not null default false`.
- Updated generated database types for the new profile field.
- Exposed `automaticStoreSelectionEnabled` from the protected layout server data.
- Commit: `0690c5d`

### 2. Reused stored consent in the list-page location flow
- Extended the location session startup path so first-time confirmation can persist consent before starting geolocation.
- Auto-resume now starts location detection on later list visits when the stored flag is already enabled.
- Cleared stale detected-store/session samples on teardown so revisits do not inherit previous page state.
- Commit: `df8362f`

### 3. Added regression coverage
- Added Playwright coverage for remembered-consent revisit behavior.
- Added coverage for the resumed-detection failure path while keeping manual store fallback visible.
- Updated the shared home-location list helper to tolerate remembered auto-starts.
- Commit: `c9613f1`

## Verification

- `npm run check`
  Result: blocked by pre-existing repository typecheck errors unrelated to this quick task.
- `npx playwright test tests/location-detection.spec.ts tests/home-location.spec.ts --project=chromium`
  Result: blocked by the local Supabase test environment. A direct probe to `auth.admin.createUser()` returned `AuthRetryableFetchError` with HTTP `502`, and `http://127.0.0.1:54321/auth/v1/health` also failed upstream before the app flows ran.

## Deviations

- Rule 1: `stopLocationSession()` now clears `detectedStoreId` and `lastSample` so remembered-consent revisits do not inherit stale store state from a previous list page.

## Files Changed

- `supabase/migrations/20260331132000_quick_store_auto_selection_consent.sql`
- `src/lib/types/database.ts`
- `src/routes/(protected)/+layout.server.ts`
- `src/lib/location/session.svelte.ts`
- `src/routes/(protected)/lister/[id]/+page.svelte`
- `tests/helpers/location.ts`
- `tests/location-detection.spec.ts`
- `tests/home-location.spec.ts`
