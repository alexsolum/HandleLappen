---
id: T02
parent: S01
milestone: M002
provides:
  - Repaired local OAuth callback wiring so Supabase allow-lists, app entrypoints, and the server callback route now agree on dev and Playwright callback origins
key_files:
  - src/routes/auth/callback/+server.ts
  - src/lib/auth/oauth.ts
  - supabase/config.toml
  - README.md
  - src/routes/logg-inn/+page.svelte
  - src/routes/registrer/+page.svelte
key_decisions:
  - Centralized OAuth next-path sanitization and callback URL building in a shared helper so login, registration, and the callback route enforce the same internal-only redirect contract
  - Kept exchangeCodeForSession(code) inside the server callback route and limited docs/config changes to the real local origins used by Vite dev and Playwright
patterns_established:
  - OAuth entrypoints should build redirectTo values through shared callback helpers, while the callback route remains the sole session-exchange boundary
observability_surfaces:
  - Stable callback outcome contract exercised by tests/auth-oauth-callback.spec.ts and failure redirect reason oauth_callback_failed
duration: 35m
verification_result: passed
completed_at: 2026-03-13 07:00 GMT+1
blocker_discovered: false
---

# T02: Repair callback runtime wiring and local redirect allow-lists

**Repaired local OAuth callback configuration and hardened shared internal redirect handling without moving the session exchange out of `/auth/callback`.**

## What Happened

I updated `supabase/config.toml` so local auth now matches the origins the app actually uses in development and Playwright: `localhost` and `127.0.0.1` on ports `5173` and `4173`, all targeting `/auth/callback`.

I added `src/lib/auth/oauth.ts` to centralize two pieces of contract logic: sanitizing `next` to internal-only paths and building the callback URL used by Google OAuth initiation. Both `/logg-inn` and `/registrer` now use that helper, removing drift between the entrypoints while preserving the register page’s `/velkommen` fallback.

I hardened `src/routes/auth/callback/+server.ts` to use the shared sanitization helper, while keeping `exchangeCodeForSession(code)` inside the callback route on the existing SSR cookie path from `src/hooks.server.ts`.

I also aligned `README.md` with the repaired contract so docs no longer disagree with the app and Supabase local config.

## Verification

Passed:
- `npm test -- tests/auth-oauth-callback.spec.ts`
  - 5/5 callback contract tests passed
  - Confirmed success redirects to `/` by default
  - Confirmed safe internal `next` redirects still work
  - Confirmed unsafe `next` values sanitize back to `/`
  - Confirmed stable failure redirect remains `/auth/error?reason=oauth_callback_failed`
- Manual code inspection confirmed `src/routes/auth/callback/+server.ts` still performs `supabase.auth.exchangeCodeForSession(code)` and only redirects to a sanitized internal destination on success.
- Manual code inspection confirmed `/logg-inn` and `/registrer` still initiate Google OAuth to `/auth/callback`.

Slice-level checks run for status:
- `npm test -- tests/auth.spec.ts` — failed in pre-existing email/password auth flows unrelated to this callback repair (`page.waitForURL('/')` timeouts after password sign-in)
- `npx playwright test tests/auth.spec.ts --grep "Google OAuth"` — no matching test exists yet; this remains T03 work

## Diagnostics

Future inspection points:
- `supabase/config.toml` — local site URL and allow-listed callback URLs
- `src/lib/auth/oauth.ts` — shared internal-only next-path sanitization and callback URL builder
- `src/routes/auth/callback/+server.ts` — authoritative session exchange boundary
- `tests/auth-oauth-callback.spec.ts` — contract-level proof for success, sanitization, and stable failure behavior

## Deviations

None.

## Known Issues

- `tests/auth.spec.ts` still has unrelated email/password login failures and does not yet contain the planned Google OAuth browser proof; that broader browser-facing verification remains for T03.

## Files Created/Modified

- `src/lib/auth/oauth.ts` — added shared callback URL builder and internal-only `next` sanitizer
- `src/routes/auth/callback/+server.ts` — switched callback redirect handling to the shared sanitizer while preserving server-side session exchange
- `src/routes/logg-inn/+page.svelte` — updated Google OAuth initiation to use the shared callback contract helper
- `src/routes/registrer/+page.svelte` — updated Google OAuth initiation to use the shared callback contract helper with `/velkommen` fallback
- `supabase/config.toml` — aligned local site URL and callback allow-list with dev and Playwright origins
- `README.md` — documented the repaired local callback contract and required Supabase URL configuration
