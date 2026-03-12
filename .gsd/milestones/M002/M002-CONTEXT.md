# M002: Google OAuth Callback Repair — Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

## Project Description

This milestone fixes a focused authentication defect in an otherwise working HandleAppen codebase. Google sign-in from `/logg-inn` currently redirects the browser to a raw `/?code=...` URL and leaves the user logged out, which means the OAuth callback exchange is not completing through the intended app callback route.

## Why This Milestone

The app already has a substantial signed-in shopping flow, so a broken Google entry path is disproportionately harmful: it breaks a real front-door login option even though the rest of the app works. This needs to be fixed now because it blocks a supported user-visible entry path and undermines trust in auth reliability.

## User-Visible Outcome

### When this milestone is complete, the user can:

- choose Google sign-in from `/logg-inn` and land in the signed-in app instead of on a raw callback URL
- retry cleanly from `/logg-inn` if the OAuth callback exchange fails

### Entry point / environment

- Entry point: `/logg-inn` Google sign-in button
- Environment: local dev browser flow with Supabase auth
- Live dependencies involved: Supabase Auth, Google OAuth provider, SvelteKit server callback route

## Completion Class

- Contract complete means: the callback route, redirect contract, and failure destination are explicit in code and covered by automated tests
- Integration complete means: the Google login entry path uses the intended callback route and produces a real signed-in session on success
- Operational complete means: the callback failure path remains recoverable and returns the user to a retryable login state

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Google sign-in initiated from `/logg-inn` no longer strands the browser on `/?code=...`
- a callback exchange failure returns the user to `/logg-inn` with a clear retryable error state
- the shared callback contract used by login and related registration entry points is covered by automated regression evidence

## Risks and Unknowns

- Supabase or local provider configuration may be overriding the intended callback URL — that matters because the app code may be correct in one place but bypassed in real flow
- Browser-test automation may not be able to drive a real Google provider flow locally — that matters because regression proof may need to target the app callback contract and redirect behavior without real third-party auth

## Existing Codebase / Prior Art

- `src/routes/logg-inn/+page.svelte` — initiates Google OAuth with `redirectTo` aimed at `/auth/callback`
- `src/routes/registrer/+page.svelte` — uses the same Google OAuth initiation pattern and should be kept aligned
- `src/routes/auth/callback/+server.ts` — current server callback route that exchanges `code` for a session and redirects onward
- `src/routes/auth/error/+page.svelte` — existing auth error surface that may be replaced or simplified depending on chosen failure routing
- `src/hooks.server.ts` — server-side Supabase SSR client and session extraction pattern already used across protected routes
- `playwright.config.ts` — dedicated local E2E harness on port `4173`

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — repair the success path so Google login completes session exchange
- R002 — return failures to `/logg-inn` with a retryable error state
- R003 — add regression proof for the repaired callback contract
- R004 — keep shared Google entry points aligned on one callback contract

## Scope

### In Scope

- diagnosis and repair of the Google OAuth callback/session exchange path
- failure routing back to `/logg-inn`
- consistency check and alignment for related Google auth entry points
- automated regression coverage for the repaired contract

### Out of Scope / Non-Goals

- redesigning email/password auth or broader account UX
- adding new OAuth providers
- large Supabase auth architecture changes beyond what is needed to repair this flow

## Technical Constraints

- Must fit the existing SvelteKit + Supabase SSR auth pattern already used in the app
- Must preserve safe redirect handling (`next` must stay internal-only)
- Verification should prefer the local automated harness and route-level contract proof where real Google automation is impractical

## Integration Points

- Supabase Auth — initiates Google OAuth and exchanges callback code into a session
- Google OAuth provider — external login provider whose callback target must align with app expectations
- SvelteKit server routing — owns callback handling and post-auth redirects
- Playwright — regression verification surface for callback routing and failure behavior

## Open Questions

- Is the current bug caused by app callback code, local Supabase redirect configuration, or both? — first slice should retire this by reproducing and repairing the actual callback path
- What is the strongest practical automated proof in the local environment? — likely a mix of route-level tests and browser checks rather than full live Google automation
