# M002/S01: Google OAuth Callback Path Repair

**Goal:** Repair the Google OAuth success path so local Supabase and the app agree on the callback destination, the app callback route remains the authoritative code-exchange boundary, and successful Google login no longer strands the browser on a raw `?code=` URL.
**Demo:** From `/logg-inn`, the app initiates Google OAuth against `/auth/callback`, the callback route exchanges a `code` into session state and safely redirects to `/`, and automated app-boundary proof plus a local browser check show the browser does not remain on a raw callback URL.

## Must-Haves

- Local Supabase auth redirect configuration allows the real app origins used in dev and Playwright to return through `/auth/callback`.
- `src/routes/auth/callback/+server.ts` remains the authoritative OAuth success callback and preserves internal-only `next` redirects after `exchangeCodeForSession(code)`.
- Automated verification exercises the callback success contract at the app boundary instead of relying on brittle live Google UI automation.
- Slice verification includes at least one diagnostic/failure signal that helps a future agent tell whether the callback route received a `code`, sanitized `next`, and completed or failed the session exchange.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `tests/auth-oauth-callback.spec.ts` — asserts callback success redirects to a sanitized internal destination after a successful exchange, rejects unsafe `next` values, and exposes a stable failure signal when exchange does not succeed.
- `tests/auth.spec.ts` — extended or kept passing with a browser-level check that the login entrypoint still initiates Google OAuth using the app callback contract rather than leaving the browser on `/?code=...`.
- `npm test -- tests/auth-oauth-callback.spec.ts`
- `npm test -- tests/auth.spec.ts`
- `npx playwright test tests/auth.spec.ts --grep "Google OAuth"`

## Observability / Diagnostics

- Runtime signals: callback handler emits a stable success/failure outcome around OAuth exchange without logging secrets or raw provider payloads.
- Inspection surfaces: route-level test assertions, browser-visible redirect target, and any structured error reason/query surface used by the callback contract.
- Failure visibility: tests verify a stable callback failure outcome and that unsafe or malformed `next` inputs fall back to a known internal destination instead of an open redirect or raw callback URL.
- Redaction constraints: never log OAuth `code`, tokens, cookies, or secret env values; diagnostics may expose only sanitized route, boolean phase/outcome, and stable error reason identifiers.

## Integration Closure

- Upstream surfaces consumed: `src/routes/logg-inn/+page.svelte`, `src/routes/registrer/+page.svelte`, `src/routes/auth/callback/+server.ts`, `src/hooks.server.ts`, `supabase/config.toml`, `README.md`, `playwright.config.ts`, existing auth test harness.
- New wiring introduced in this slice: aligned local Supabase redirect allow-list for actual runtime origins, callback-route-centered success exchange proof, and browser/test wiring that asserts the callback contract at the app boundary.
- What remains before the milestone is truly usable end-to-end: S02 must move exchange failures back to `/logg-inn` with a retryable error state and harden shared login/registration entrypoints; S03 must broaden regression coverage for success and failure routing together.

## Tasks

- [ ] **T01: Add failing callback-contract tests for OAuth success routing** `est:45m`
  - Why: Verification must exist before implementation so S01 closes on the real callback boundary instead of static code edits.
  - Files: `tests/auth-oauth-callback.spec.ts`, `tests/helpers/auth.ts`, `package.json`
  - Do: Add a focused automated test file for the callback route contract that exercises `code`, safe vs unsafe `next`, successful vs failed exchange behavior, and a stable diagnostic/failure signal; reuse existing auth test conventions where possible and only add the minimum runner support needed if the current harness cannot invoke the route directly.
  - Verify: `npm test -- tests/auth-oauth-callback.spec.ts`
  - Done when: The new callback-contract suite exists, names the expected success and failure assertions, and fails against the current unrepaired slice state for the reasons the slice intends to fix.
- [ ] **T02: Repair callback runtime wiring and local redirect allow-lists** `est:1h`
  - Why: The slice goal depends on real runtime composition: the callback route must receive valid provider returns and complete session exchange with safe redirects.
  - Files: `src/routes/auth/callback/+server.ts`, `supabase/config.toml`, `README.md`, `src/routes/logg-inn/+page.svelte`, `src/routes/registrer/+page.svelte`
  - Do: Align local Supabase auth redirect configuration with the actual dev/test origins used by the app, keep `/auth/callback` as the success exchange boundary, factor or harden safe internal `next` handling as needed, and ensure login/registration initiation points still build the same callback contract without drift.
  - Verify: `npm test -- tests/auth-oauth-callback.spec.ts`
  - Done when: The callback suite passes, the route still owns `exchangeCodeForSession(code)`, and local config/docs no longer contradict the app’s actual callback origins.
- [ ] **T03: Prove the repaired contract through the browser harness and capture diagnostics** `est:45m`
  - Why: S01 claims integration proof, so a local browser-facing check must confirm the repaired app boundary is what the user actually hits.
  - Files: `tests/auth.spec.ts`, `playwright.config.ts`, `.gsd/milestones/M002/slices/S01/S01-PLAN.md`
  - Do: Add or extend a Playwright scenario that verifies the Google auth entrypoint uses the `/auth/callback` contract at runtime, the browser does not remain on a raw `/?code=` URL after the app-side callback boundary is exercised, and any callback diagnostic/failure surface is inspectable enough to localize future regressions.
  - Verify: `npx playwright test tests/auth.spec.ts --grep "Google OAuth"`
  - Done when: Browser verification passes against the repaired flow and provides enough observable state to distinguish callback-contract regressions from unrelated login-page failures.

## Files Likely Touched

- `src/routes/auth/callback/+server.ts`
- `src/routes/logg-inn/+page.svelte`
- `src/routes/registrer/+page.svelte`
- `supabase/config.toml`
- `README.md`
- `tests/auth-oauth-callback.spec.ts`
- `tests/auth.spec.ts`
- `tests/helpers/auth.ts`
- `package.json`
- `playwright.config.ts`
