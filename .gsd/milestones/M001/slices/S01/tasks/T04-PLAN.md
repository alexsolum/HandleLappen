# T04: Plan 04

**Slice:** S01 — **Milestone:** M001

## Description

Close the Phase 1 UAT gap by adding a visible sign-out path to the authenticated experience, wiring it to `supabase.auth.signOut()`, and verifying that protected routes redirect correctly once the session is cleared.

Purpose: The route guard itself already exists, but the user could not exercise it because no logout path was implemented. This plan makes the signed-out state reachable and testable.

Output: Authenticated pages expose a logout control, logout clears the session, and sign-out behavior is covered by smoke-level auth tests.
