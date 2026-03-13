---
phase: 12-navigation-restructure
plan: 02
subsystem: ui
tags: [svelte, navigation, bottom-nav, routing, stub-pages, heroicons]

# Dependency graph
requires:
  - phase: 12-01
    provides: "Playwright navigation test scaffold (8 failing tests) defining the NAV-01/NAV-02 contract"
provides:
  - "Updated BottomNav.svelte with four new tabs (Handleliste, Oppskrifter, Anbefalinger, Admin), book/gear Heroicons v2 SVGs, and prefix-based isActive"
  - "Stub route /oppskrifter with heading and 'Kommer snart' placeholder"
  - "Admin hub /admin with 5 disabled rows (Butikker, Husstand, Historikk, Items, Brukerinnstillinger)"
  - "Title-only stubs /admin/husstand and /admin/butikker as redirect targets"
affects:
  - 12-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prefix-based isActive: Admin and Oppskrifter tabs use startsWith(tab.href + '/') for sub-route highlighting"
    - "Handleliste uses exact '/' OR startsWith('/lister/'); Anbefalinger uses exact match only"
    - "Tab icon selection via Svelte snippet with 'book' and 'gear' branches using Heroicons v2 outline paths"
    - "Stub pages under (protected) layout inherit auth from parent — no +page.server.ts needed"

key-files:
  created:
    - src/routes/(protected)/oppskrifter/+page.svelte
    - src/routes/(protected)/admin/+page.svelte
    - src/routes/(protected)/admin/husstand/+page.svelte
    - src/routes/(protected)/admin/butikker/+page.svelte
  modified:
    - src/lib/components/lists/BottomNav.svelte

key-decisions:
  - "isActive uses tab.href === '/anbefalinger' (not tab.label) for consistency with other href-based checks"
  - "Admin sub-pages are non-interactive divs (not <a> or <button>) in Phase 12 — Phase 13 activates them"
  - "Offline badge logic uses tab.href === '/' which remains valid after renaming the tab label from 'Lister' to 'Handleliste'"

patterns-established:
  - "Sub-route active detection: path === tab.href || path.startsWith(tab.href + '/') covers /admin, /admin/husstand, /admin/butikker"

requirements-completed: [NAV-01]

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 12 Plan 02: Navigation Restructure Summary

**BottomNav rewritten with four new tabs (Handleliste, Oppskrifter, Anbefalinger, Admin) using Heroicons v2 book/gear SVGs and prefix-based isActive, plus five stub route pages under (protected) layout**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-13T11:46:28Z
- **Completed:** 2026-03-13T11:57:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Rewrote BottomNav.svelte: four new tabs, two new icon types (book/gear from Heroicons v2), and prefix-based isActive replacing exact-match for all tabs except Anbefalinger
- Created /oppskrifter stub page with correct heading and "Kommer snart" placeholder text
- Created /admin hub skeleton with 5 disabled rows and chevrons (Phase 13 will activate them)
- Created /admin/husstand and /admin/butikker title-only stubs as redirect targets for Plan 03
- Playwright tests advance from 0/8 to 6/8 passing; remaining 2 failures are redirect tests (NAV-02) planned for Plan 03

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite BottomNav.svelte — new tabs, icons, isActive** - `f7c6929` (feat)
2. **Task 2: Create stub route pages for /oppskrifter and /admin** - `7e3f11d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/components/lists/BottomNav.svelte` - Four new tabs, book/gear SVG icons, prefix-based isActive, href-based Anbefalinger check
- `src/routes/(protected)/oppskrifter/+page.svelte` - Stub: "Oppskrifter" heading + "Kommer snart" text
- `src/routes/(protected)/admin/+page.svelte` - Admin hub with 5 disabled rows and right-pointing chevrons
- `src/routes/(protected)/admin/husstand/+page.svelte` - Title-only stub (redirect target from /husstand)
- `src/routes/(protected)/admin/butikker/+page.svelte` - Title-only stub (redirect target from /butikker)

## Decisions Made
- Used `tab.href === '/anbefalinger'` instead of `tab.label === 'Anbefalinger'` in both the isActive function and the recommendationHref conditional for consistency
- Admin rows are non-interactive divs (not links/buttons) — Phase 13 wires up the navigation
- Offline badge check `tab.href === '/'` needed no update since the href remains `/` even though the label changed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - BottomNav compiled without TypeScript errors. Build succeeded. Pre-existing TypeScript errors in `src/lib/barcode/scanner.ts` and `tests/item-memory.spec.ts` are out of scope and not introduced by these changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 6/8 navigation tests passing: all tab label, active-state, and stub-page-load tests green
- Remaining 2 failures are redirect tests (Test 7: /husstand → /admin/husstand, Test 8: /butikker → /admin/butikker)
- Plan 03 implements the 301 redirects from /husstand and /butikker to their new /admin/* destinations
- After Plan 03, all 8 tests should pass (full green)

---
*Phase: 12-navigation-restructure*
*Completed: 2026-03-13*

## Self-Check: PASSED

- FOUND: src/lib/components/lists/BottomNav.svelte
- FOUND: src/routes/(protected)/oppskrifter/+page.svelte
- FOUND: src/routes/(protected)/admin/+page.svelte
- FOUND: src/routes/(protected)/admin/husstand/+page.svelte
- FOUND: src/routes/(protected)/admin/butikker/+page.svelte
- FOUND: .planning/phases/12-navigation-restructure/12-02-SUMMARY.md
- FOUND commit: f7c6929 (Task 1 — BottomNav rewrite)
- FOUND commit: 7e3f11d (Task 2 — stub route pages)
