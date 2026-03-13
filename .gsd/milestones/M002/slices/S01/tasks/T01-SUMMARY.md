---
id: T01
parent: S01
milestone: M002
provides:
  - Focused OAuth callback contract coverage plus minimal Playwright runner fixes so the suite executes directly by file path
key_files:
  - tests/auth-oauth-callback.spec.ts
  - tests/helpers/auth-oauth-callback.ts
  - package.json
  - playwright.config.ts
key_decisions:
  - Reused a lightweight route-invocation helper instead of introducing a separate auth test framework for callback contract coverage
  - Allowed Playwright to reuse an existing local server so targeted test runs fail on test assertions instead of port-collision harness errors
patterns_established:
  - Callback route contract tests can invoke SvelteKit handlers directly and assert redirect plus stable outcome signals without browser OAuth automation
observability_surfaces:
  - tests/auth-oauth-callback.spec.ts stable outcome assertions for success, sanitized next handling, exchange_failed, and missing_code
duration: 25m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Add failing callback-contract tests for OAuth success routing

**Confirmed and stabilized focused OAuth callback contract coverage, plus runner fixes so the suite executes directly and exposes callback outcomes.**

## What Happened

I verified that the slice already had the intended callback-contract test file and a minimal direct-invocation helper in place. The route under test also already satisfies the expected contract, so the suite did not reproduce the plan’s expected failing-first state.

The concrete work needed in this unit was runner hardening: `npm test -- tests/auth-oauth-callback.spec.ts` initially failed for a Playwright web server port-collision reason, and the existing `test` script pattern also caused the whole `tests/` directory to run instead of just the requested file.

I made two minimal harness adjustments:
- changed `package.json` so `npm test -- <file>` passes the file path straight through to Playwright
- changed `playwright.config.ts` to `reuseExistingServer: true` so targeted runs attach cleanly instead of failing on port 4173 reuse

After those fixes, the targeted callback suite runs cleanly and verifies:
- success redirect to `/`
- success redirect to a safe internal `next`
- unsafe `next` sanitization back to `/`
- stable failure redirect for exchange failure
- stable failure redirect when no usable `code` is present

## Verification

- Ran `npm test -- tests/auth-oauth-callback.spec.ts`
- Result: **passed** (`5 passed`)
- Verified the suite now runs as a targeted file invocation instead of accidentally executing the full E2E test tree
- Verified the route-level observability signal asserted by the suite distinguishes `session_exchanged`, `exchange_failed`, and `missing_code`, plus `nextWasSanitized`

## Diagnostics

Inspect later with:
- `npm test -- tests/auth-oauth-callback.spec.ts`
- `tests/auth-oauth-callback.spec.ts` for redirect and outcome assertions
- `tests/helpers/auth-oauth-callback.ts` for the direct handler invocation harness and expected stable outcome signal shape

The callback contract is currently green, so future regressions should show up as assertion failures in this suite rather than harness startup issues.

## Deviations

The task plan expected the new suite to fail before runtime repair in T02, but the route and callback suite were already present and conforming when this unit started. I therefore limited changes to runner execution correctness and task bookkeeping instead of re-creating already-existing failing tests.

## Known Issues

- The broader Playwright suite still has unrelated failures outside this task’s scope.
- Because the callback runtime already matches the contract, T02 may need replanning or reduction to only the remaining config/browser proof work if those gaps still exist.

## Files Created/Modified

- `.gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md` — task execution summary and verification record
- `package.json` — fixed `npm test -- <file>` passthrough so targeted callback verification runs correctly
- `playwright.config.ts` — allowed reuse of an existing local server to avoid harness-level port-collision failure during targeted runs
