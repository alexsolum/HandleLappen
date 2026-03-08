# Phase 1: Auth and Household Foundation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Any family member can create an account, sign in, and belong to a household — and all downstream RLS policies can safely reference that household via `my_household_id()`. This phase also includes the v1 household joining mechanism (invite code) and the onboarding flow. Creating shopping lists, categories, and everything else is downstream.

</domain>

<decisions>
## Implementation Decisions

### Household joining (v1)
- Short alphanumeric invite code (e.g., KIWI-4821 — 8 chars, readable, typeable)
- Invite code is shown in the household members view (HOUS-02) so the creator can share it via SMS/WhatsApp
- Code is entered during onboarding only — no post-onboarding join flow
- A user belongs to exactly one household — simplifies RLS (`my_household_id()` returns a single value)

### UI scaffold
- Tailwind CSS for styling
- shadcn-svelte as the component library (components copied into codebase, no runtime dependency)
- Mobile-first layout — this is a grocery shopping app used in-store on a phone; desktop is secondary

### Auth screens
- Norwegian language from day 1 — "Logg inn", "Opprett konto", "Fortsett med Google"
- Separate screens: `/logg-inn` and `/registrer` (not a combined tab view)
- Lightly branded — app name/logo at top, brand color applied; not bare but not over-designed
- Green-based color palette (grocery theme — fits Rema 1000 / Kiwi context)

### Onboarding flow
- After signup: straight to `/velkommen` — a single screen with two sections: "Opprett husstand" (name input + create button) and "Bli med i husstand" (invite code input + join button), separated by "eller"
- Household name is user-chosen freeform (e.g., "Familie Hansen", "Hjemme")
- After completing onboarding → redirect to home/lists screen (Phase 2's landing screen)
- If an authenticated user has no household_id, always redirect to `/velkommen` onboarding — applies to sign-in too, not just signup

### Claude's Discretion
- Loading/error states on auth forms
- Exact button/input sizing and spacing
- Invite code generation algorithm (server-side, collision-resistant)
- Form validation error messages

</decisions>

<specifics>
## Specific Ideas

- The `/velkommen` onboarding screen should show both "Opprett husstand" and "Bli med i husstand" on a single screen (see mockup from discussion — two sections divided by "eller")
- Invite code shown in household members view so creator can copy/share it themselves — no email sending needed
- Green palette should feel like a grocery app (Kiwi, Rema 1000 reference) — not too dark, not too neon

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project, no existing components or hooks

### Established Patterns
- None yet — this phase establishes the patterns all downstream phases follow

### Integration Points
- Supabase Auth: email/password via `supabase.auth.signUp()` / `signInWithPassword()`, Google OAuth via `signInWithOAuth({ provider: 'google' })`
- SvelteKit hooks: `src/hooks.server.ts` for session validation and household_id injection into `locals`
- Protected route guards: check `locals.user` and `locals.household_id` in `+page.server.ts` load functions; redirect unauthenticated/unhouseholded users appropriately
- `my_household_id()` SECURITY DEFINER function is the RLS anchor — established here, used by every downstream table

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-auth-and-household-foundation*
*Context gathered: 2026-03-08*
