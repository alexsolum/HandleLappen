# S06: History View And Recommendations

**Goal:** Create the Phase 6 history foundation: durable history metadata, grouped household history queries, and the initial protected history surface that satisfies HIST-02.
**Demo:** Create the Phase 6 history foundation: durable history metadata, grouped household history queries, and the initial protected history surface that satisfies HIST-02.

## Must-Haves


## Tasks

- [x] **T01: Plan 01**
  - Create the Phase 6 history foundation: durable history metadata, grouped household history queries, and the initial protected history surface that satisfies HIST-02.

Purpose: recommendations depend on history being queryable and displayable first. The user decisions require compact, date-grouped sessions with store-first headers where possible, but current history rows do not yet capture stable store context.

Output: migration for history snapshot metadata, history query module, protected `/anbefalinger` page rendering compact grouped history, and Wave 0/plan-level Playwright coverage in `tests/history.spec.ts`.
- [x] **T02: Plan 02**
  - Implement recommendation data and presentation for the `Anbefalinger` surface: household frequency recommendations, active-list co-purchase suggestions, and the explicit cold-start gate.

Purpose: Phase 6 is recommendation-led. After history exists, the user should see one practical blended list, not separate dashboards or placeholder cards.

Output: recommendation SQL/migration artifacts, query module, blended recommendation section on `/anbefalinger`, and automated coverage for frequency, co-purchase, and cold-start behaviors.
- [x] **T03: Plan 03**
  - Finish the Phase 6 user loop by activating the `Anbefalinger` tab and implementing add-back actions from history/recommendations into shopping lists.

Purpose: the phase is not done until users can act on what they see. This plan turns the Phase 6 surface from read-only insight into a practical shopping shortcut.

Output: active bottom-nav route, current-list targeting heuristic + chooser fallback, quantity-increment dedup behavior, subtle success toast, and end-to-end tests for add-back behavior.
- [x] **T04: Plan 04**
  - Close the Phase 6 UAT gap where add-back can attach to an already checked item row, causing the restored item to appear in the done section instead of the active shopping list.

Purpose: the Phase 6 browsing loop is only correct if add-back restores actionable unchecked items. Quantity increment should apply to an existing active row, not resurrect a checked row as still checked.

Output: corrected add-back mutation behavior, no regression in chooser/toast flow, and targeted E2E coverage for unchecked restoration.

## Files Likely Touched

