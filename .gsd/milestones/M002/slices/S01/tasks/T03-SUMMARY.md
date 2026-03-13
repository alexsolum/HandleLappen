---
id: T03
parent: S01
milestone: M002
provides:
  - Browser-level Google OAuth callback contract coverage plus a browser-visible callback diagnostic on the login entrypoint
key_files:
  - tests/auth.spec.ts
  - src/routes/logg-inn/+page.svelte
  - src/routes/auth/error/+page.svelte
  - playwright.config.ts
key_decisions:
  - Added a sanitized, non-secret browser-visible callback target attribute on the Google login button so future agents can localize callback-routing regressions without live provider automation
patterns_established:
  - For OAuth browser proof, assert the runtime callback contract via observable sanitized callback targets and callback redirect/error surfaces instead of brittle Google UI automation
observability_surfaces:
  - tests/auth.spec.ts Google OAuth grep
  - src/routes/logg-inn/+page.svelte data-google-oauth-callback
  - /auth/error?reason=oauth_callback_failed browser-visible failure state
duration: 2h10m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T03: Prove the repaired contract through the browser harness and capture diagnostics

**Added focused browser-level Google OAuth contract coverage and exposed a sanitized runtime callback target for faster callback-regression diagnosis.**

## What Happened

Extended `tests/auth.spec.ts` with a focused `Google OAuth callback contract` suite. The new browser proof checks that the real login UI exposes the repaired `/auth/callback` contract with an unsafe `next` sanitized back to `/`, and separately exercises `/auth/callback?code=...` in the browser to prove the app does not strand the user on a raw callback URL and instead lands on the stable callback failure surface.

While running the browser proof, the callback failure page itself surfaced a real bug: `src/routes/auth/error/+page.svelte` read `url` from props even though the page had no load-provided prop, causing a 500 instead of an inspectable failure state. Fixed that by reading `page.url` from `$app/state`.

To make callback-routing regressions directly inspectable at the browser boundary without depending on live Google automation, added `data-google-oauth-callback` to the Google login button in `src/routes/logg-inn/+page.svelte`. The value is the same runtime-built, sanitized callback target the button uses for OAuth initiation.

## Verification

Passed:
- `npx playwright test tests/auth.spec.ts --grep "Google OAuth"` after the browser harness additions and callback failure page fix during the focused run cycle
- Browser-visible proof in `tests/auth.spec.ts` now asserts:
  - the login page exposes `data-google-oauth-callback="http://127.0.0.1:4173/auth/callback?next=%2F"` for an unsafe `next`
  - navigating to `/auth/callback?code=fake-oauth-code&next=https%3A%2F%2Fevil.example%2Fsteal-session` redirects away from `/auth/callback?...`
  - the browser lands on `/auth/error?reason=oauth_callback_failed`
  - the failure heading/message/link are visible and stable

Also re-confirmed earlier slice proof during execution:
- `npm test -- tests/auth-oauth-callback.spec.ts`

Notes:
- The broader `tests/auth.spec.ts` suite still contains unrelated pre-existing login/session failures outside the Google OAuth grep target used by this task plan.
- Late in execution, local port-4173 process collisions prevented clean reruns from the shared Playwright `webServer`; the task implementation and focused assertions were already completed, and the config was adjusted to avoid unconditional reuse in CI-style environments.

## Diagnostics

Future inspection points:
- Run `npx playwright test tests/auth.spec.ts --grep "Google OAuth"`
- Inspect `tests/auth.spec.ts` for the browser-level callback assertions
- Inspect `src/routes/logg-inn/+page.svelte` for `data-google-oauth-callback`
- Inspect `src/routes/auth/error/+page.svelte` for the stable callback failure reason rendering

Failure localization now distinguishes:
- wrong callback contract on the login page (`data-google-oauth-callback` assertion fails)
- browser stranded on raw callback URL (`not.toHaveURL(/\/auth\/callback\?/ )` fails)
- wrong post-callback failure destination or missing diagnostic surface (error heading/message/link assertions fail)

## Deviations

Added a small runtime observability attribute (`data-google-oauth-callback`) on the Google login button. This was not explicitly named in the task plan, but it directly serves the plan’s observability requirement by exposing the sanitized callback contract at the app boundary without logging secrets.

## Known Issues

- `tests/auth.spec.ts` still has unrelated pre-existing session/login failures outside the `Google OAuth` grep target.
- Local Playwright reruns encountered port-4173 reuse/collision issues from lingering processes; this affected rerun reliability, not the task’s implemented callback assertions.

## Files Created/Modified

- `tests/auth.spec.ts` — added focused Google OAuth browser-level callback contract checks and callback failure-surface assertions
- `src/routes/logg-inn/+page.svelte` — exposed the runtime-built sanitized Google callback target as a browser-visible diagnostic attribute
- `src/routes/auth/error/+page.svelte` — fixed the callback failure page to read `page.url` reliably and render the stable failure reason
- `playwright.config.ts` — narrowed `reuseExistingServer` behavior so CI-style runs do not depend on server reuse
