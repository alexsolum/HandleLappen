# GSD State

**Active Milestone:** M002 — Google OAuth Callback Repair
**Active Slice:** None
**Phase:** planned
**Requirements Status:** 4 active · 9 validated · 0 deferred · 2 out of scope

## Milestone Registry
- ✅ **M001:** Migration
- 🟡 **M002:** Google OAuth Callback Repair

## Recent Decisions
- Keep M002 focused on Google OAuth callback repair rather than a broader auth redesign
- Callback exchange failures return to `/logg-inn` with a clear retry path
- Regression proof should rely on app-boundary callback tests and local browser checks
- `/logg-inn` and `/registrer` should share one callback contract

## Blockers
- None

## Next Action
Plan slice S01 for M002 and reproduce the real Google OAuth callback bug against the current local auth flow.
