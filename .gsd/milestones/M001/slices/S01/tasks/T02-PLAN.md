# T02: Plan 02

**Slice:** S01 — **Milestone:** M001

## Description

Build the authentication layer: server hooks with safeGetSession (getUser()-based), root layout files for SSR session passing and auth state change handling, the /logg-inn and /registrer screens in Norwegian with green brand palette using shadcn-svelte components, the /auth/callback PKCE handler for Google OAuth, and the protected route guard that enforces both authentication and household membership.

Purpose: These files are the security backbone. The safeGetSession pattern (using getUser() not getSession()) is critical for server-side security. The protected route guard pattern established here is copied by every future phase.

Output: Working email/password auth flow, Google OAuth flow wired (manual verification required), session persisting across reloads, protected routes enforcing auth + household guards.
