---
estimated_steps: 3
estimated_files: 3
---

# T03: Prove the repaired contract through the browser harness and capture diagnostics

**Slice:** M002/S01 — Google OAuth Callback Path Repair
**Milestone:** M002

## Description

Close S01 at the claimed integration proof level by extending the browser harness with a focused Google OAuth contract check. The goal is not brittle full-Google automation; it is to prove that the real login entrypoint uses the repaired `/auth/callback` contract, that the browser-facing app boundary no longer strands users on a raw callback URL, and that future regressions can be localized quickly from observable state.

## Steps

1. Add or extend a Playwright scenario in `tests/auth.spec.ts` that inspects the Google login initiation path and verifies it targets the repaired app callback contract.
2. Exercise the app-boundary callback behavior through the browser harness in a way that proves users are redirected off any raw callback URL and onto the expected internal destination once the app-side callback contract completes.
3. Assert at least one diagnostic/failure signal or visible redirect outcome that helps future debugging distinguish callback-contract regressions from unrelated login-screen failures.

## Must-Haves

- [ ] Browser verification proves the real login UI still routes Google auth through `/auth/callback`.
- [ ] The scenario checks enough observable state to tell whether a regression is in callback routing, redirect sanitization, or post-callback navigation.

## Verification

- `npx playwright test tests/auth.spec.ts --grep "Google OAuth"`
- The passing browser result demonstrates the repaired callback contract at the user-facing app boundary without depending on live Google automation.

## Observability Impact

- Signals added/changed: Browser-level assertion on callback URL usage and post-callback redirect target.
- How a future agent inspects this: Run the focused Playwright grep and inspect the failing assertion or browser trace.
- Failure state exposed: Whether the login page built the wrong callback URL, the browser stayed on a raw callback location, or post-callback navigation landed on the wrong page.

## Inputs

- `tests/auth-oauth-callback.spec.ts` and T02 runtime changes — The passing contract-level proof that the browser scenario is validating at the real app boundary.
- `tests/auth.spec.ts` / `playwright.config.ts` — Existing browser harness and local runtime origin configuration.

## Expected Output

- `tests/auth.spec.ts` — Browser-level Google OAuth contract coverage for the repaired callback path.
- `playwright.config.ts` — Any minimal harness adjustment needed to support the focused callback verification.
- Passing integration evidence that S01’s repaired callback contract is actually what the user-facing app invokes.
