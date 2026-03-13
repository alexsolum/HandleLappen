---
id: S11
parent: M001
milestone: M001
provides:
  - household-scoped remembered-item table with ranked search RPC
  - trigger-based memory refresh from list item inserts and category updates
  - reusable remembered-item query helpers for later list-page wiring
  - inline remembered-suggestion dropdown inside the fixed add bar
  - list-page orchestration for live remembered queries and immediate add
  - recurring-item UI evidence for narrowing and mobile containment
  - validated remembered-category reuse on suggestion selection
  - stale-memory fallback to the existing category picker
  - focused recurring-item verification for quantity, latest-category wins, and dropdown close behavior
requires: []
affects: []
key_files: []
key_decisions:
  - "Used a dedicated household_item_memory table instead of scanning item_history so category reuse and mobile typeahead stay cheap and deterministic."
  - "Kept remembered-item freshness server-side with list_items triggers so all add paths stay aligned without duplicating client sync logic."
  - "Kept the typed add path and remembered add path separate so suggestion taps can add immediately without pretending to be plain text submits."
  - "Rendered suggestions inside the existing add-bar card instead of opening a sheet so the recurring-item path stays fast and mobile-safe."
  - "Validated remembered category ids against the current household category list before reuse so corrupted memory falls back safely instead of attaching the wrong group."
  - "Closed the dropdown immediately on selection in both success and fallback paths so the recurring-item interaction stays one-step."
patterns_established:
  - "Remembered-item lookups use a pure search helper plus a thin Svelte Query wrapper so backend contract tests can run outside the browser bundle."
  - "List mutation surfaces invalidate remembered-item caches by list scope to keep future inline suggestions fresh."
  - "Remembered suggestion search state lives on the list page while ItemInput stays responsible for presentation and local input reset behavior."
  - "Mobile suggestion regressions are covered alongside the broader mobile layout suite, not only in feature-specific tests."
  - "Remembered-item fast paths should trust stored category ids only when they still belong to the current household snapshot."
  - "Recurring-item regression tests should assert both the happy path and the stale-memory fallback path."
observability_surfaces: []
drill_down_paths: []
duration: 7min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---
# S11: Household Item Memory And Suggestions

**# Phase 11 Plan 01: Household Item Memory and Suggestions Summary**

## What Happened

# Phase 11 Plan 01: Household Item Memory and Suggestions Summary

**Household-scoped remembered-item search now has a dedicated Supabase contract, automatic category memory refresh, and focused backend verification for ranking and isolation.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-12T18:00:00+01:00
- **Completed:** 2026-03-12T18:17:49+01:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `household_item_memory` with normalization, ranking metadata, RLS, and `search_household_item_memory`.
- Wired remembered-item freshness to `list_items` inserts and category/name updates through database triggers.
- Added reusable app-side remembered-item query helpers and focused Playwright coverage for household isolation, one-letter search, five-result cap, and remembered category return values.

## Task Commits

1. **Task 1: Add a household remembered-item source with ranked search and category memory** - `ebda95e` (feat)
2. **Task 2: Add a reusable app-side remembered-item query layer and mutation seam** - `3a5cbf4` (feat)

## Files Created/Modified
- `supabase/migrations/20260312190000_phase11_household_item_memory.sql` - Creates the remembered-item table, trigger sync, normalization helper, and ranked search RPC.
- `src/lib/queries/remembered-items-core.ts` - Holds the pure remembered-item normalization and RPC mapping logic.
- `src/lib/queries/remembered-items.ts` - Wraps remembered-item search in a Svelte Query factory for later UI wiring.
- `src/lib/queries/items.ts` - Adds optional category support to add-item mutations and invalidates remembered-item caches alongside list mutations.
- `src/lib/types/database.ts` - Extends generated Supabase types with the remembered-item table and functions.
- `tests/helpers/remembered-items.ts` - Seeds remembered-item rows and authenticated Supabase clients for Phase 11 tests.
- `tests/item-memory.spec.ts` - Verifies household isolation, first-letter search, five-result cap, narrowing, and category memory.

## Decisions Made

- Used database triggers to keep remembered-item memory synchronized with list-item writes.
- Split the remembered-item query surface into pure core logic and a UI-facing query wrapper to keep Playwright backend tests lightweight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Moved memory refresh into database triggers**
- **Found during:** Task 2 (Add a reusable app-side remembered-item query layer and mutation seam)
- **Issue:** Client-only refresh calls would have left remembered data inconsistent across barcode flows, item edits, and any future non-UI writes.
- **Fix:** Added trigger-backed sync on `list_items` insert and category/name update, then kept the client seam focused on query/invalidation behavior.
- **Files modified:** `supabase/migrations/20260312190000_phase11_household_item_memory.sql`, `src/lib/queries/items.ts`
- **Verification:** `npx playwright test tests/item-memory.spec.ts --workers=1`
- **Committed in:** `3a5cbf4` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The trigger-based sync tightened consistency without expanding scope beyond the remembered-item contract the plan required.

## Issues Encountered

- The local workspace did not have `supabase` or `psql` on PATH, so the migration had to be applied through the running Docker Postgres container before the new tests could execute.
- The executor subagent hit an environment-specific false block before file work began, so the plan was completed directly in the parent session.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The database and query contract are ready for the inline dropdown work in `11-02`.
- Future UI work can consume remembered suggestions without scanning raw household history in the browser.

---
*Phase: 11-household-item-memory-and-suggestions*
*Completed: 2026-03-12*

# Phase 11 Plan 02: Household Item Memory and Suggestions Summary

**The fixed add bar now shows household-specific remembered suggestions inline, narrows them as the user types, and adds remembered items in one tap without breaking the phone layout.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-12T18:17:49+01:00
- **Completed:** 2026-03-12T18:30:35+01:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Threaded remembered-item query text and results through the list page without moving mutation ownership into `ItemInput`.
- Added a compact inline suggestion dropdown to the fixed add bar with stable test IDs and immediate-add selection behavior.
- Added Playwright coverage for first-letter appearance, narrowing, remembered immediate add, and narrow-phone containment.

## Task Commits

1. **Task 1: Thread remembered search state through the list page and add flow** - `dc104b1` (feat)
2. **Task 2: Add the inline dropdown UI inside the fixed mobile add bar** - `74cc4f4` (test)

## Files Created/Modified
- `src/routes/(protected)/lister/[id]/+page.svelte` - Owns remembered query state, suggestion lookup, and immediate-add selection behavior.
- `src/lib/components/items/ItemInput.svelte` - Renders the inline suggestion dropdown and resets query state after submit or suggestion selection.
- `tests/item-memory.spec.ts` - Covers suggestion visibility, narrowing, and one-tap remembered add behavior.
- `tests/mobile-layout.spec.ts` - Verifies the remembered dropdown stays contained inside the add-bar shell on phone-sized viewports.

## Decisions Made

- Kept query execution in the page layer so the input component stays reusable and presentation-focused.
- Reused the existing fixed add-bar shell rather than introducing another mobile surface for recurring items.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

- None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The add flow now exposes remembered suggestions and immediate selection hooks for category-reuse finishing work in `11-03`.
- Mobile containment and narrowing behavior are covered, so the last plan can focus on remembered category reuse and fallback safety.

---
*Phase: 11-household-item-memory-and-suggestions*
*Completed: 2026-03-12*

# Phase 11 Plan 03: Household Item Memory and Suggestions Summary

**Remembered suggestions now reuse the latest valid household category automatically, fall back to the picker when memory is stale, and close the dropdown cleanly in both paths.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-12T18:30:35+01:00
- **Completed:** 2026-03-12T18:37:39+01:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added household-category validation before reusing remembered category ids during one-tap add.
- Preserved the fast path for valid remembered categories while routing stale category memory into the existing picker flow.
- Expanded recurring-item evidence to cover latest-category wins, default quantity `1`, picker fallback, and dropdown close behavior.

## Task Commits

1. **Task 1: Reuse remembered categories automatically and preserve fallback safety** - `db20198` (fix)
2. **Task 2: Close Phase 11 with focused recurring-item verification** - `7f31c79` (test)

## Files Created/Modified
- `src/routes/(protected)/lister/[id]/+page.svelte` - Validates remembered category ids against the household category set before deciding whether to reuse or fall back.
- `tests/item-memory.spec.ts` - Verifies latest-category reuse, default quantity, stale-memory fallback, and dropdown close behavior.

## Decisions Made

- Treated category ids as safe to reuse only when they still exist in the current household category query.
- Kept the fallback path on the same existing picker modal instead of inventing a second recovery UI.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

- None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 has focused automated evidence for backend ranking, inline suggestion behavior, remembered category reuse, and stale fallback handling.
- The phase is ready for verification and closeout.

---
*Phase: 11-household-item-memory-and-suggestions*
*Completed: 2026-03-12*
