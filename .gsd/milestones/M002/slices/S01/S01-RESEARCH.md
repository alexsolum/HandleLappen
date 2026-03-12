# M002/S01 — Research

**Date:** 2026-03-12

## Summary

S01 directly owns **R001** and supports **R003**. Research should therefore focus on the success-path contract: whether Google sign-in actually returns through `src/routes/auth/callback/+server.ts`, whether that route can exchange the OAuth `code` into a Supabase session reliably, and what evidence can prove the repaired path without depending on brittle full-Google browser automation.

The repo already contains most of the intended app-side wiring. Both `/logg-inn` and `/registrer` build a `redirectTo` URL pointing at `/auth/callback` and pass it into `supabase.auth.signInWithOAuth(...)`. The callback route reads `code` and `next`, sanitizes `next` to an internal path, calls `supabase.auth.exchangeCodeForSession(code)`, and redirects on success. The main surprise is outside that route: local Supabase auth config is still set to `http://127.0.0.1:3000` with `https://127.0.0.1:3000` as the only additional redirect URL, while the app and Playwright harness run on `5173` and `4173`. That mismatch is the strongest current explanation for the reported `/?code=...` landing and makes config drift a first-class part of S01, not just UI code.

Because the codebase currently has Playwright E2E coverage but no route-level unit test harness, the strongest practical proof for S01 is likely: (1) repair the local redirect contract so Supabase accepts the app callback URL used at runtime, (2) keep success redirect handling in the server callback route, and (3) add app-boundary callback tests around extracted redirect/session-exchange logic or around the route handler itself. Full live Google automation remains optional and brittle; app-boundary proof matches D003 and the milestone proof strategy.

## Recommendation

Treat S01 as a **callback-contract repair**, not just a server-route bugfix.

Recommended implementation direction:

1. **Keep `src/routes/auth/callback/+server.ts` as the authoritative callback route** for OAuth success exchange.
2. **Repair local Supabase redirect configuration** so the OAuth provider and Supabase auth service are allowed to return to the real app origins used in development and Playwright (`5173` / `4173`, likely `localhost` and `127.0.0.1`).
3. **Preserve safe internal redirect handling** by continuing to sanitize `next` to same-origin internal paths only.
4. **Add regression proof at the app boundary** rather than trying to drive Google itself. The key contract to test is: `code + safe next + successful exchange => 303 to next`, and invalid/missing exchange should not leave the browser on a raw callback URL.

The repo already follows the Supabase SSR cookie pattern in `hooks.server.ts`, so the likely fix is configuration alignment plus small route hardening rather than an auth-architecture rewrite.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Supabase SSR session/cookie wiring | `@supabase/ssr` with `createServerClient` in `src/hooks.server.ts` | This already matches Supabase’s SSR cookie model and is the correct place for callback exchange cookies to be persisted |
| OAuth callback destination building | Existing `redirectTo` construction in `/logg-inn` and `/registrer` | Both entry points already share the same pattern; drift should be reduced by reusing one contract, not inventing a second flow |
| Safe post-auth redirects | Existing `next` sanitization in `src/routes/auth/callback/+server.ts` and protected-route redirects in `src/routes/(protected)/+layout.server.ts` | The app already uses internal-only `next` semantics; S01 should preserve that invariant |

## Existing Code and Patterns

- `src/routes/logg-inn/+page.svelte` — Starts Google OAuth with `signInWithOAuth({ provider: 'google', options: { redirectTo } })`, where `redirectTo` is built from `window.location.origin + /auth/callback` and carries a sanitized `next` query param.
- `src/routes/registrer/+page.svelte` — Uses the same Google OAuth initiation pattern as `/logg-inn`; this is the shared contract S02 will need to keep aligned.
- `src/routes/auth/callback/+server.ts` — Current success-path callback route. Reads `code`, sanitizes `next`, calls `supabase.auth.exchangeCodeForSession(code)`, redirects to `next` on success, and currently redirects failures to `/auth/error?reason=oauth_callback_failed`.
- `src/hooks.server.ts` — Creates the SSR Supabase server client and provides cookie `getAll` / `setAll`. This is the mechanism that allows `exchangeCodeForSession` to persist session cookies during callback handling.
- `src/routes/+layout.ts` — Recreates browser/server Supabase clients and loads session state. This is the surface that should reflect a successful callback exchange on subsequent navigation.
- `src/routes/(protected)/+layout.server.ts` — Existing protected-route redirect pattern using `/logg-inn?next=...`. This is relevant because the same internal-only redirect contract should remain true after OAuth success.
- `src/routes/auth/error/+page.svelte` — Existing OAuth failure surface. It is outside S01’s primary success-path target but matters because S01 currently depends on it for failed exchange handling.
- `supabase/config.toml` — **Critical finding:** `[auth] site_url = "http://127.0.0.1:3000"` and `additional_redirect_urls = ["https://127.0.0.1:3000"]`. These do not match app/runtime docs or Playwright.
- `README.md` — Documents `/auth/callback` as the app callback route and claims local callback setup should use `http://localhost:5173/auth/callback`. This currently disagrees with `supabase/config.toml`.
- `playwright.config.ts` — Runs the app on `http://127.0.0.1:4173`, which is also missing from Supabase auth redirect allow-lists.
- `tests/auth.spec.ts` — Contains email/password auth coverage and protected-route redirect assertions, but no callback-route/OAuth contract tests yet.
- `tests/helpers/auth.ts` — Provides seeded-user helpers via service-role admin client. Useful for auth-adjacent setup, but not enough by itself to prove the OAuth callback exchange path.

## Constraints

- Local Supabase auth redirect allow-lists must include the actual app origin used during development and test. Right now they do not.
- Supabase SSR callback exchange depends on cookie writes being available during the request. `hooks.server.ts` already supplies `setAll`, so S01 should avoid bypassing that path.
- The current app has Playwright E2E coverage only; there is no existing lightweight route-unit harness in `package.json`. S01 research should assume some new targeted test structure may be needed to support R003 later.
- Success-path redirect handling must remain internal-only. The current `next` sanitization allows only strings starting with `/` and rejects `//`.
- Browser automation against live Google is likely impractical in local CI-like conditions, so evidence should target the app/Supabase boundary, not Google’s UI.

## Common Pitfalls

- **Fixing only the callback route while leaving Supabase redirect config wrong** — The route can look correct in code and still never receive the real provider callback. Verify `supabase/config.toml`, README guidance, and runtime origins together.
- **Testing only `localhost` or only `127.0.0.1`** — This repo uses both forms across docs and Playwright. OAuth allow-lists are exact-match sensitive.
- **Assuming `getSession()` alone proves success** — Supabase SSR docs still treat `getUser()` as the verified auth check for authorization decisions. The app already follows that pattern in `safeGetSession`.
- **Breaking `next` safety while repairing the callback** — S01 needs a stronger success path, not a looser redirect surface.
- **Trying to prove everything through live Google automation** — That would add noise and brittleness without materially strengthening the callback contract proof.

## Open Risks

- The real provider flow may still be influenced by Supabase dashboard/provider settings outside the repo, so local config repair might not be sufficient by itself for every environment.
- The current failure route still points to `/auth/error`; S02 will change that contract to `/logg-inn`, so S01 should avoid over-coupling tests to the old failure destination when only success-path proof is needed.
- If `signInWithOAuth` or Supabase normalizes away the passed `redirectTo` when it is not allow-listed, the browser may fall back to `site_url`, which would explain the observed raw `/?code=` landing. This should be verified during implementation.
- If route-level tests are added hastily inside Playwright only, regression proof may stay slower and more brittle than necessary.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` | available via `npx skills add supabase/agent-skills@supabase-postgres-best-practices` — useful but more database-focused than this auth slice |
| Supabase auth patterns | `sickn33/antigravity-awesome-skills@nextjs-supabase-auth` | available via `npx skills add sickn33/antigravity-awesome-skills@nextjs-supabase-auth` — adjacent, but Next.js-specific |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` | available via `npx skills add spences10/svelte-skills-kit@sveltekit-structure` |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-data-flow` | available via `npx skills add spences10/svelte-skills-kit@sveltekit-data-flow` |
| Supabase / SvelteKit OAuth | none found that is both directly relevant and framework-correct | no strong install recommendation from the current catalogue |

## Sources

- Supabase SSR requires server-side cookie `getAll` / `setAll` handling for auth state changes, and `getUser()` is the verified user lookup path (source: Context7 `/supabase/ssr`, query: `SvelteKit OAuth callback route exchangeCodeForSession signInWithOAuth redirectTo cookies session SSR`).
- `src/routes/auth/callback/+server.ts` currently exchanges `code` for session and redirects success to sanitized `next`, else to `/auth/error?reason=oauth_callback_failed` (source: repo file `src/routes/auth/callback/+server.ts`).
- `/logg-inn` and `/registrer` both already send Google OAuth to `/auth/callback` with a `next` param built from `window.location.origin` (source: repo files `src/routes/logg-inn/+page.svelte`, `src/routes/registrer/+page.svelte`).
- Local Supabase auth config currently points at `127.0.0.1:3000` / `https://127.0.0.1:3000`, which conflicts with README and Playwright runtime origins (source: repo file `supabase/config.toml`).
- README documents `/auth/callback` as the app callback route and recommends `http://localhost:5173/auth/callback` in Supabase auth URL configuration (source: repo file `README.md`).
- Playwright runs the app on `http://127.0.0.1:4173`, which is not currently present in local Supabase auth redirect config (source: repo file `playwright.config.ts`).