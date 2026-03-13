---
phase: 12-navigation-restructure
plan: 03
subsystem: ui
tags: [svelteki, navigation, redirects, pwa, routing]

# Dependency graph
requires:
  - phase: 12-02
    provides: stub pages for /admin/husstand and /admin/butikker that redirect targets must exist
provides:
  - 301 permanent redirects from /husstand to /admin/husstand
  - 301 permanent redirects from /butikker to /admin/butikker
  - Human-verified complete Phase 12 navigation restructure
affects:
  - Phase 13 (admin navigation links)
  - Any phase touching /husstand or /butikker routing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side 301 redirect via throw redirect(301, ...) in +page.server.ts for permanent route moves"
    - "Minimal redirect-only load functions with no data fetching or await parent()"

key-files:
  created:
    - src/routes/(protected)/butikker/+page.server.ts
  modified:
    - src/routes/(protected)/husstand/+page.server.ts

key-decisions:
  - "301 (permanent) used instead of 303 for PWA back-history correctness — permanent redirects update PWA navigation history and bookmarks"
  - "Existing /husstand/+page.svelte left in place — server-side redirect fires before SvelteKit renders the page component"

patterns-established:
  - "Permanent route move pattern: replace +page.server.ts entirely with a single throw redirect(301, newPath) load function"

requirements-completed: [NAV-02]

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 12 Plan 03: Redirects and Final Verification Summary

**301 permanent redirects from legacy /husstand and /butikker routes to their new /admin/* destinations, completing Phase 12 navigation restructure with human approval**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-13
- **Completed:** 2026-03-13
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Replaced /husstand/+page.server.ts with a single-line 301 redirect to /admin/husstand, removing the previous full data-loading load function
- Created /butikker/+page.server.ts (new file) with a 301 redirect to /admin/butikker
- Human verified complete Phase 12 navigation restructure: four-tab BottomNav, Admin hub skeleton, prefix-based active detection, and backward-compatible redirects

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 301 redirects for /husstand and /butikker** - `0e71071` (feat)
2. **Task 2: Visual verification — human approved** — checkpoint, no commit

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/routes/(protected)/husstand/+page.server.ts` — Replaced full data-loading load function with a single throw redirect(301, '/admin/husstand')
- `src/routes/(protected)/butikker/+page.server.ts` — New file; throw redirect(301, '/admin/butikker')

## Decisions Made

- Used 301 (permanent) not 303 because these are permanent route moves. PWA clients cache 301 responses and update back-history so users are never routed to dead URLs again.
- Left the existing /husstand/+page.svelte in place — the server-side redirect fires before SvelteKit renders the page, so the .svelte file is never reached. Deleting it would be unnecessary churn.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 navigation restructure is fully complete and human-approved.
- Phase 13 can activate the greyed-out Admin sub-page rows as real navigation links now that the route structure and redirects are in place.

---
*Phase: 12-navigation-restructure*
*Completed: 2026-03-13*
