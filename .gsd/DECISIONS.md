# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M002 | scope | Milestone shape | Keep M002 as a focused Google OAuth repair milestone | The reported problem is a single broken auth entry path, not a broad auth redesign | Yes — if deeper auth faults surface during execution |
| D002 | M002 | convention | OAuth failure destination | Return callback exchange failures to `/logg-inn` with a retryable error state | User explicitly chose `/logg-inn` as the recovery surface instead of a detached auth error page | Yes — if route constraints make inline login error handling impossible |
| D003 | M002 | pattern | Regression proof strategy | Prefer app-boundary callback tests plus local browser checks over full live Google automation | Real third-party Google automation is likely brittle locally, but the callback contract still needs strong automated proof | Yes — if reliable provider-backed automation becomes practical |
| D004 | M002 | integration | Shared Google callback contract | Keep `/logg-inn` and `/registrer` aligned on one callback initiation contract | Both entry points already use the same Supabase OAuth mechanism and should not drift | No |
