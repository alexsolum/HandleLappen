# GSD State

**Active Milestone:** M002 — Google OAuth Callback Repair
**Active Slice:** S01 — Google OAuth Callback Path Repair
**Phase:** planned
**Requirements Status:** 4 active · 9 validated · 0 deferred · 2 out of scope

## Milestone Registry
- ✅ **M001:** Migration
- 🔄 **M002:** Google OAuth Callback Repair

## Recent Decisions
- D005: Define S01 around a failing callback-contract test first, then runtime repair, then browser-level contract proof.
- D006: Treat local Supabase redirect allow-list alignment as part of S01 runtime wiring, including actual dev and Playwright origins.
- D007: Require a stable, non-secret callback outcome signal in tests/browser checks so future agents can distinguish exchange failure, unsafe `next`, and wrong redirect destination.

## Blockers
- None

## Next Action
Execute T01 for M002/S01 by adding failing callback-contract tests for OAuth success routing.
