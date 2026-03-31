# Quick Task: Remember store auto-selection consent - Plan

## Goal

Persist a user-level automatic store selection preference on the server so returning users do not have to re-enable location-driven store auto-selection every time they open a list.

## Tasks

### 1. Add a persisted per-user consent flag
- files: `supabase/migrations/<new quick migration>.sql`, `src/lib/types/database.ts`, `src/routes/(protected)/+layout.server.ts`
- action: Add a non-sensitive per-user boolean such as `automatic_store_selection_enabled` on `public.profiles` with a safe default of `false`, regenerate Supabase types, and include the flag in protected layout data alongside `householdId`. Keep home coordinates in `user_home_locations`; this quick task is only for remembering consent, not widening home-location exposure.
- verify: The app can read a signed-in user’s stored auto-selection preference from protected layout data without changing household-scoped profile reads.
- done: A returning signed-in user has a server-backed auto-selection preference available before the list page renders.

### 2. Reuse stored consent in the existing list-page location flow
- files: `src/lib/location/session.svelte.ts`, `src/routes/(protected)/lister/[id]/+page.svelte`, `src/lib/components/stores/LocationPermissionCard.svelte`
- action: Extend the location session API so first-time acceptance both starts detection and persists the consent flag through Supabase, then auto-start location detection on later list visits when the stored flag is already `true`. Preserve the existing Phase 24 rule that the initial permission prompt is still explanation-first and user-gesture driven on first opt-in; only previously accepted users should bypass the “Slå på automatisk butikkvalg” step. Keep manual store selection visible as the fallback path if geolocation is denied or unavailable.
- verify: After one successful opt-in, revisiting the same or another list starts the existing detection flow automatically and the entry card no longer requires the user to click “Slå på automatisk butikkvalg” again.
- done: Store auto-selection consent is remembered across list visits and routed through the current session/list-page architecture instead of a parallel implementation.

### 3. Lock the behavior with focused regression coverage
- files: `tests/location-detection.spec.ts`, `tests/home-location.spec.ts`, `tests/helpers/location.ts`
- action: Add/adjust Playwright coverage for the remembered-consent path: one test should accept automatic store selection, revisit a list, and confirm auto-selection resumes without the opt-in step; another should prove the manual fallback still works when the resumed detection path cannot get a location. Reuse the existing location helpers instead of inventing new test wiring.
- verify: `npx playwright test tests/location-detection.spec.ts tests/home-location.spec.ts --project=chromium`
- done: The remembered-consent behavior is regression-tested alongside the shipped location and home-location flows.
