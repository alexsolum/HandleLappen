# GSD State

**Active Milestone:** M002 — Google OAuth Callback Repair
**Active Slice:** S01 — Google OAuth Callback Path Repair
**Phase:** executing
**Requirements Status:** 4 active · 9 validated · 0 deferred · 2 out of scope

## Milestone Registry
- ✅ **M001:** Migration
- 🔄 **M002:** Google OAuth Callback Repair

## Recent Decisions
- Centralized OAuth callback URL construction and internal-only `next` sanitization in `src/lib/auth/oauth.ts` so login, registration, and callback handling share one contract.

## Blockers
- None

## Next Action
Execute T03: Prove the repaired contract through the browser harness and capture diagnostics in slice S01.
