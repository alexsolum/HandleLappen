# S01: Auth And Household Foundation

**Goal:** Scaffold the SvelteKit project with full Supabase wiring, apply the Phase 1 database migration (households + profiles tables, my_household_id() SECURITY DEFINER function, invite-code generator, all RLS policies), and install Playwright with test stubs so every subsequent task has an automated verify command available.
**Demo:** Scaffold the SvelteKit project with full Supabase wiring, apply the Phase 1 database migration (households + profiles tables, my_household_id() SECURITY DEFINER function, invite-code generator, all RLS policies), and install Playwright with test stubs so every subsequent task has an automated verify command available.

## Must-Haves


## Tasks

- [x] **T01: Plan 01**
  - Scaffold the SvelteKit project with full Supabase wiring, apply the Phase 1 database migration (households + profiles tables, my_household_id() SECURITY DEFINER function, invite-code generator, all RLS policies), and install Playwright with test stubs so every subsequent task has an automated verify command available.

Purpose: This plan is the load-bearing foundation. Every downstream plan in this phase and every downstream phase depends on the database schema (especially my_household_id()) and the Supabase client setup being correct before auth or household code is built.

Output: Running SvelteKit dev server, Supabase local stack with migrations applied, typed Supabase clients, Playwright configured, test stub files in place.
- [x] **T02: Plan 02**
  - Build the authentication layer: server hooks with safeGetSession (getUser()-based), root layout files for SSR session passing and auth state change handling, the /logg-inn and /registrer screens in Norwegian with green brand palette using shadcn-svelte components, the /auth/callback PKCE handler for Google OAuth, and the protected route guard that enforces both authentication and household membership.

Purpose: These files are the security backbone. The safeGetSession pattern (using getUser() not getSession()) is critical for server-side security. The protected route guard pattern established here is copied by every future phase.

Output: Working email/password auth flow, Google OAuth flow wired (manual verification required), session persisting across reloads, protected routes enforcing auth + household guards.
- [x] **T03: Plan 03**
  - Build the household onboarding screen (/velkommen) with two server actions (create household / join via invite code), the household members view (/husstand) showing all members and the shareable invite code, and a placeholder home screen. This completes Phase 1 — after this plan, any family member can register, onboard into a household, and see who else is in their household.

Purpose: HOUS-01 and HOUS-02. The /velkommen screen is the first thing new users see after signup. The members view is where the invite code lives — the sharing mechanism for v1.

Output: Full onboarding flow, household members view with invite code, placeholder home screen that Phase 2 will fill.
- [x] **T04: Plan 04**
  - Close the Phase 1 UAT gap by adding a visible sign-out path to the authenticated experience, wiring it to `supabase.auth.signOut()`, and verifying that protected routes redirect correctly once the session is cleared.

Purpose: The route guard itself already exists, but the user could not exercise it because no logout path was implemented. This plan makes the signed-out state reachable and testable.

Output: Authenticated pages expose a logout control, logout clears the session, and sign-out behavior is covered by smoke-level auth tests.

## Files Likely Touched

