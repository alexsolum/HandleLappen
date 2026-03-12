---
phase: 11-household-item-memory-and-suggestions
plan: 02
subsystem: ui
tags: [svelte, mobile, suggestions, tanstack-query, playwright]
requires:
  - phase: 11-household-item-memory-and-suggestions
    provides: remembered-item search RPC, mutation invalidation seam, category memory contract
provides:
  - inline remembered-suggestion dropdown inside the fixed add bar
  - list-page orchestration for live remembered queries and immediate add
  - recurring-item UI evidence for narrowing and mobile containment
affects: [11-03, list-add-flow, mobile-layout]
tech-stack:
  added: []
  patterns: [page-owned suggestion state, contained inline mobile dropdown]
key-files:
  created: []
  modified:
    - src/lib/components/items/ItemInput.svelte
    - src/routes/(protected)/lister/[id]/+page.svelte
    - tests/item-memory.spec.ts
    - tests/mobile-layout.spec.ts
key-decisions:
  - "Kept the typed add path and remembered add path separate so suggestion taps can add immediately without pretending to be plain text submits."
  - "Rendered suggestions inside the existing add-bar card instead of opening a sheet so the recurring-item path stays fast and mobile-safe."
patterns-established:
  - "Remembered suggestion search state lives on the list page while ItemInput stays responsible for presentation and local input reset behavior."
  - "Mobile suggestion regressions are covered alongside the broader mobile layout suite, not only in feature-specific tests."
requirements-completed: [SUGG-01, SUGG-02]
duration: 13min
completed: 2026-03-12
---

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
