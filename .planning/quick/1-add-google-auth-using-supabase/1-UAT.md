---
status: testing
phase: quick-1-add-google-auth-using-supabase
source:
  - .planning/quick/1-add-google-auth-using-supabase/1-SUMMARY.md
started: 2026-03-12T12:10:00Z
updated: 2026-03-12T12:10:00Z
---

## Current Test

number: 1
name: Google sign-in launches OAuth flow
expected: |
  From /logg-inn or /registrer, clicking "Fortsett med Google" should send you to the Supabase-hosted Google OAuth flow without showing an in-app error.
awaiting: user response

## Tests

### 1. Google sign-in launches OAuth flow
expected: From /logg-inn or /registrer, clicking "Fortsett med Google" should send you to the Supabase-hosted Google OAuth flow without showing an in-app error.
result: pending

### 2. Returning Google user lands on intended page
expected: If you start from /logg-inn, complete Google sign-in, and already have a household profile, you should end up on the app and not be bounced back to auth.
result: pending

### 3. Protected-route redirect is preserved through Google sign-in
expected: If you first open a protected route such as /husstand while signed out, then continue with Google sign-in, you should return to that intended route instead of losing the next redirect.
result: pending

### 4. New Google user is routed into onboarding
expected: If the Google account does not yet have a household, sign-in should complete and then route you to /velkommen so you can create or join a household.
result: pending

### 5. OAuth failure page is recoverable
expected: If OAuth callback exchange fails, /auth/error should show a clear retry path back to /logg-inn or /registrer.
result: pending

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0

## Gaps

None yet.
