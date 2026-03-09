---
status: diagnosed
phase: 01-auth-and-household-foundation
source: [01-01-SUMMARY.md]
started: 2026-03-09T19:56:00+01:00
updated: 2026-03-09T20:04:00+01:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running app process, then start HandleAppen from scratch. The app should boot without startup errors, and opening /logg-inn in the browser should show the HandleAppen login screen with e-post and passord fields instead of a crash or blank page.
result: pass

### 2. Protected Route Redirect
expected: When you are signed out and open /husstand directly, the app should redirect you to /logg-inn with the original destination preserved in the URL as next=%2Fhusstand.
result: issue
reported: "There is no possibility to sign out"
severity: major

### 3. Registration Form Validation
expected: On /registrer, the page should show e-post, passord, and bekreft passord fields. Submitting with mismatched passwords should show "Passordene stemmer ikke overens", and a password shorter than 6 characters should show "Passordet må være minst 6 tegn" before any successful signup.
result: pass

### 4. Household Onboarding Screen
expected: After signing in as a user without a household, /velkommen should show two cards: one for creating a household with a husstandsnavn field and one for joining with an invitasjonskode field. Invalid input should show inline error feedback instead of silently failing.
result: pass

### 5. Household Page Surface
expected: After signing in as a user who belongs to a household, /husstand should show a member list and an invitasjonskode section with a Kopier button. The current user should be marked with "(deg)" in the member list.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "When you are signed out and open /husstand directly, the app should redirect you to /logg-inn with the original destination preserved in the URL as next=%2Fhusstand."
  status: failed
  reason: "User reported: There is no possibility to sign out"
  severity: major
  test: 2
  root_cause: "Phase 1 implemented sign-in, registration, route guards, and onboarding flows, but no sign-out control or logout action was added anywhere in the UI. There is no call to supabase.auth.signOut(), so users cannot return the app to a signed-out state to verify protected-route redirects or end a session."
  artifacts:
    - path: "src/routes/+layout.svelte"
      issue: "Global auth session invalidation exists, but there is no sign-out trigger or logout UI."
    - path: "src/routes/(protected)/husstand/+page.svelte"
      issue: "Protected household screen exposes member and invite code UI only; it offers no way to end the current session."
  missing:
    - "Add a visible sign-out control in the authenticated experience."
    - "Wire the control to supabase.auth.signOut() and redirect to /logg-inn after logout."
    - "Add coverage proving protected routes redirect after logout."
  debug_session: ".planning/debug/phase-01-sign-out-gap.md"
