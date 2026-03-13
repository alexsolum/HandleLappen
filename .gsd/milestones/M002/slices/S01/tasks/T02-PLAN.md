---
estimated_steps: 4
estimated_files: 5
---

# T02: Repair callback runtime wiring and local redirect allow-lists

**Slice:** M002/S01 — Google OAuth Callback Path Repair
**Milestone:** M002

## Description

Implement the real runtime repair behind S01: make sure local Supabase auth is allowed to return to the app origins actually used in development and Playwright, keep the server callback route as the authoritative success exchange boundary, and preserve internal-only redirect safety so the repaired path is both functional and safe.

## Steps

1. Update `supabase/config.toml` so `site_url` and redirect allow-lists cover the real local origins used by the app and Playwright, including both `localhost` and `127.0.0.1` variants where required.
2. Harden `src/routes/auth/callback/+server.ts` so safe internal `next` handling is explicit and testable while `exchangeCodeForSession(code)` remains inside the callback route using the existing SSR cookie path.
3. Verify `/logg-inn` and `/registrer` still initiate Google OAuth through the same `/auth/callback` contract and only adjust them if needed to remove drift or share extracted contract-building logic.
4. Align `README.md` guidance with the repaired local callback contract so docs, app code, and Supabase config no longer disagree.

## Must-Haves

- [ ] Local Supabase redirect settings match the real runtime/test origins that must be allowed to hit `/auth/callback`.
- [ ] The callback route still owns the session exchange and safe internal redirect contract rather than pushing OAuth completion back into client-side code.

## Verification

- `npm test -- tests/auth-oauth-callback.spec.ts`
- Manual code inspection confirms `src/routes/auth/callback/+server.ts` still performs `exchangeCodeForSession(code)` and redirects only to sanitized internal destinations.

## Observability Impact

- Signals added/changed: Stable callback success/failure handling and any structured outcome surface required by T01 tests.
- How a future agent inspects this: Read `supabase/config.toml`, inspect callback route behavior, and rerun the callback-contract suite.
- Failure state exposed: Mismatch between allowed callback origins, redirect sanitization, and exchange outcome becomes detectable through targeted tests instead of only live provider behavior.

## Inputs

- `tests/auth-oauth-callback.spec.ts` — Failing contract cases that define the required runtime repair.
- `supabase/config.toml` / `README.md` / login and registration entrypoints — Existing sources of callback-contract drift identified in research.

## Expected Output

- `supabase/config.toml` — Repaired local auth redirect configuration for actual dev/test callback origins.
- `src/routes/auth/callback/+server.ts` — Hardened callback handler that passes the new contract tests.
- `README.md` — Updated local setup guidance matching the real callback contract.
- `src/routes/logg-inn/+page.svelte` and/or `src/routes/registrer/+page.svelte` — Any minimal alignment changes needed to keep the Google entrypoints on one callback contract.
