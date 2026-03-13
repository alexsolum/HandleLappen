# Project

## What This Is

HandleAppen is an installable family grocery shopping web app for shared household shopping. It already supports household accounts, synced shopping lists, category/store ordering, barcode-assisted entry, history, recommendations, offline guardrails, and remembered item suggestions. The current planning focus is tightening authentication reliability so Google sign-in behaves like the rest of the polished mobile flow.

## Core Value

A household can keep one shared grocery workflow that is fast to use in the store, always in sync, and friction-light when adding or returning to common items.

## Current State

M001 is complete. The core shopping experience is built and verified across auth, household onboarding, list CRUD, realtime sync, category/store ordering, barcode lookup and scanner UI, PWA installability, offline queue guardrails, history/recommendations, mobile layout hardening, inline quantity controls, and household item memory. A focused auth bug remains: Google OAuth sign-in can land on a raw `/?code=...` URL instead of completing the callback exchange and establishing a real session.

## Architecture / Key Patterns

- SvelteKit app with Supabase for auth, database, realtime, and edge functions.
- Server-side auth wiring uses `@supabase/ssr` in `src/hooks.server.ts` and route-level redirects for protected pages.
- OAuth entry points live in `/logg-inn` and `/registrer`; callback handling lives in `src/routes/auth/callback/+server.ts`.
- Playwright runs against a dedicated local dev server on port `4173`, with targeted suites used as the main proof surface.
- The codebase prefers thin route orchestration, shared query helpers, and user-visible flows verified end to end rather than only by unit tests.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Migration — Mobile-safe shopping flow, inline quantity editing, and remembered household item entry.
- [ ] M002: Google OAuth Callback Repair — Fix Google login so callback exchange, failure routing, and regression coverage are reliable.
