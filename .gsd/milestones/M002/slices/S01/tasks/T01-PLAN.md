---
estimated_steps: 3
estimated_files: 3
---

# T01: Add failing callback-contract tests for OAuth success routing

**Slice:** M002/S01 — Google OAuth Callback Path Repair
**Milestone:** M002

## Description

Create the slice’s executable stopping condition first by adding focused automated tests around the OAuth callback route contract. The suite should prove the intended success-path boundary at the app edge: a callback request with a `code` and safe `next` exchanges into a session and redirects internally, while unsafe redirect targets and exchange failures surface a stable, inspectable outcome.

## Steps

1. Add `tests/auth-oauth-callback.spec.ts` with explicit cases for successful exchange to `/`, successful exchange to a safe internal `next`, rejection of unsafe `next` values, and a stable failure-path outcome when exchange fails or no `code` is usable.
2. Reuse or minimally extend shared auth test helpers so the new suite can invoke the callback boundary with controllable Supabase exchange outcomes without introducing a broad new test framework.
3. Confirm the new suite runs in the existing harness and currently fails for the slice-specific reasons that T02 will fix.

## Must-Haves

- [ ] The new test file names the callback contract explicitly and asserts redirect location plus outcome for both success and failure paths.
- [ ] The tests check at least one observability signal that lets a future agent distinguish exchange failure, unsafe redirect sanitization, and successful redirect completion.

## Verification

- `npm test -- tests/auth-oauth-callback.spec.ts`
- The suite fails before implementation for callback-contract reasons, not because the test harness is missing or fundamentally broken.

## Observability Impact

- Signals added/changed: Test assertions for stable callback outcome signals and redirect destinations.
- How a future agent inspects this: Run `npm test -- tests/auth-oauth-callback.spec.ts` and inspect which callback-contract assertion failed.
- Failure state exposed: Whether the route failed on exchange, sanitized `next`, or redirected to the wrong destination.

## Inputs

- `src/routes/auth/callback/+server.ts` — Existing callback exchange and redirect behavior described in research.
- Existing auth test harness and helpers — Current E2E auth coverage patterns to reuse instead of inventing a parallel test stack.

## Expected Output

- `tests/auth-oauth-callback.spec.ts` — Focused failing contract tests that define S01’s objective callback success-path proof.
- `tests/helpers/auth.ts` — Any minimal helper extension needed to drive the callback contract under test.
- `package.json` — Any minimal script or runner adjustment required for the new suite to execute.
