# T01: Plan 01

**Slice:** S06 — **Milestone:** M001

## Description

Create the Phase 6 history foundation: durable history metadata, grouped household history queries, and the initial protected history surface that satisfies HIST-02.

Purpose: recommendations depend on history being queryable and displayable first. The user decisions require compact, date-grouped sessions with store-first headers where possible, but current history rows do not yet capture stable store context.

Output: migration for history snapshot metadata, history query module, protected `/anbefalinger` page rendering compact grouped history, and Wave 0/plan-level Playwright coverage in `tests/history.spec.ts`.
