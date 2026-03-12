# M002: Google OAuth Callback Repair

**Vision:** Fix the Google login path so HandleAppen completes the OAuth callback exchange, lands the user in the signed-in app instead of a raw `?code=` URL, and fails back to `/logg-inn` in a clear retryable way with regression protection.

## Success Criteria

- User can start Google sign-in from `/logg-inn`, complete the callback path, and land signed in on `/` instead of `/?code=...`
- If callback exchange fails, the user is returned to `/logg-inn` with a clear retryable error state
- Shared Google auth entry points use the same valid callback contract and are covered by automated regression evidence

## Key Risks / Unknowns

- The real redirect may be bypassing `/auth/callback` due to local Supabase or provider configuration — if true, fixing only one UI call site will not retire the bug
- Full live Google automation may be impractical in local Playwright — verification must still prove the repaired app-side callback contract strongly enough to prevent regression

## Proof Strategy

- Redirect/callback path ambiguity → retire in S01 by proving where the real flow lands, repairing the callback contract, and exercising the fixed success path at the app boundary
- Failure-handling ambiguity → retire in S02 by proving callback exchange failures route back to `/logg-inn` with a user-visible retry path and aligned entry-point wiring
- Regression-proof strength → retire in S03 by adding automated tests for the repaired success and failure routing contract

## Verification Classes

- Contract verification: targeted tests for callback route behavior, safe redirect handling, and shared Google entry-point configuration
- Integration verification: local browser flow and/or app-boundary callback exercise through the SvelteKit auth route
- Operational verification: none beyond reliable retry behavior after callback failure
- UAT / human verification: optional local Google sign-in confirmation if external provider setup is needed for full live proof

## Milestone Definition of Done

This milestone is complete only when all are true:

- all slice deliverables are complete
- Google sign-in from `/logg-inn` no longer leaves the browser on a raw `?code=` URL
- the callback route, redirect contract, and failure path are actually wired together
- success criteria are re-checked against runnable behavior and automated evidence, not just static file edits
- the repaired OAuth path has regression coverage for both success and failure handling

## Requirement Coverage

- Covers: R001, R002, R003, R004
- Partially covers: none
- Leaves for later: O001, O002
- Orphan risks: none

## Slices

- [ ] **S01: Google OAuth Callback Path Repair** `risk:high` `depends:[]`
  > After this: Google sign-in from `/logg-inn` reaches the intended app callback path, exchanges code into session state, and no longer strands the browser on `/?code=...`.
- [ ] **S02: Failure Routing And Shared Entry-Point Hardening** `risk:medium` `depends:[S01]`
  > After this: callback exchange failures return the user to `/logg-inn` with a clear retry path, and login/registration Google entry points share the same callback contract.
- [ ] **S03: OAuth Regression Evidence** `risk:low` `depends:[S01,S02]`
  > After this: automated tests prove the repaired callback success path, failure fallback, and shared entry-point contract do not regress.

## Boundary Map

### S01 → S02

Produces:
- `src/routes/auth/callback/+server.ts` — authoritative callback route that accepts Supabase OAuth `code`, performs session exchange, and redirects to a safe internal destination
- Google auth success invariant — successful Google login from `/logg-inn` resolves through the app callback route and reaches `/` as an authenticated user
- callback contract diagnosis — clear understanding of whether any local redirect/config mismatch had to be corrected

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- stable success-path callback contract that tests can assert without guessing redirect behavior
- explicit safe-redirect invariant for `next` handling after callback exchange

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- failure redirect contract — callback exchange failure returns to `/logg-inn` with a user-visible retryable error state
- shared Google entry-point contract across `/logg-inn` and `/registrer`

Consumes from S01:
- `src/routes/auth/callback/+server.ts` success-path callback exchange behavior
- diagnosed callback URL contract and success redirect behavior
