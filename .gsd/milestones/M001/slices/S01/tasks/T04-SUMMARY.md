---
id: T04
parent: S01
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T04: Plan 04

**# Plan 01-04 Summary**

## What Happened

# Plan 01-04 Summary

**Closed the Phase 1 UAT logout gap by adding a visible sign-out path on protected screens and regression coverage for redirect-after-logout**

## Accomplishments
- Added a shared authenticated shell for protected routes with a visible `Logg ut` control wired to `supabase.auth.signOut()`.
- Updated the protected landing page and household page to render inside the shared shell without duplicating logout logic.
- Added seeded auth test helpers plus Playwright coverage for sign-out and post-logout redirect behavior.
- Fixed an existing Svelte type-check issue on the onboarding page so `npm run check` passes cleanly.

## Verification
- `npm run check` passed
- `npm run build` passed
- Manual checkpoint approved: logout is visible, sends the user to `/logg-inn`, and `/husstand` redirects to `/logg-inn?next=%2Fhusstand` after logout
- `npx playwright test tests/auth.spec.ts --grep "sign out|protected route redirects after logout"` executed with both tests skipped because `SUPABASE_SERVICE_ROLE_KEY` is not configured in the current local environment

## Commits
- `a01beab` `feat(01-04): add protected logout flow`
- `637a7a6` `test(01-04): cover logout redirect flow`

## UAT Gap Closure
- Resolved gap from `01-UAT.md`: missing sign-out flow prevented verification of signed-out protected-route redirect
