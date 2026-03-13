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
| D005 | 2026-03-13 | M002/S01 | Verification strategy | Define S01 around a failing callback-contract test first, then runtime repair, then browser-level contract proof | The slice must prove the callback boundary, not just edit config or route code without executable evidence | No |
| D006 | 2026-03-13 | M002/S01 | Local OAuth config contract | Treat local Supabase redirect allow-list alignment as part of S01 runtime wiring, including actual dev and Playwright origins | Research showed config drift is the strongest explanation for the raw `/?code=` landing and must be fixed in the slice, not deferred | Yes — if runtime origin conventions change later |
| D007 | 2026-03-13 | M002/S01 | Diagnostics strategy | Require a stable, non-secret callback outcome signal in tests/browser checks so future agents can distinguish exchange failure, unsafe `next`, and wrong redirect destination | OAuth issues are hard to localize from browser state alone; the slice should leave an inspectable diagnostic surface without exposing codes or tokens | Yes — if a better structured diagnostic surface emerges during implementation |
| D008 | 2026-03-13 | M002/S01 | Browser OAuth observability | Expose the runtime-built sanitized Google callback target as a browser-visible attribute on the login entrypoint | This gives browser harnesses and future agents a deterministic, non-secret way to verify callback routing without brittle provider automation | Yes — if the app later adds a more formal test/diagnostic surface |
