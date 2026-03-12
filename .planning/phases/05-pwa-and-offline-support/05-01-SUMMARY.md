---
phase: 05-pwa-and-offline-support
plan: 01
subsystem: pwa
tags: [pwa, service-worker, workbox, manifest, playwright]
requires: []
provides:
  - Android-installable manifest and icon set
  - Workbox-powered service worker with precache and Supabase GET caching
  - Root layout registration for the Vite PWA runtime
  - Playwright smoke coverage for manifest presence and manifest fields
affects: [05-02, 05-03, offline-readiness]
tech-stack:
  added: [@vite-pwa/sveltekit, idb-keyval]
  patterns: [injectManifest service worker, root-layout registration, dev-mode manifest serving]
key-files:
  created:
    - src/service-worker.ts
    - src/vite-pwa.d.ts
    - tests/pwa.spec.ts
    - tests/offline.spec.ts
    - static/icons/icon-192.png
    - static/icons/icon-512.png
    - static/icons/icon-512-maskable.png
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - svelte.config.js
    - src/routes/+layout.svelte
key-decisions:
  - "The PWA manifest is served in dev mode so Playwright can validate installability prerequisites without switching to preview."
  - "Service worker registration stays in the root layout via virtual:pwa-register while SvelteKit's built-in registration remains disabled."
patterns-established:
  - "PWA runtime wiring lives in root layout and Vite config, not in protected routes."
  - "Playwright PWA smoke tests validate manifest behavior on the dev server and leave service-worker activation to preview mode."
requirements-completed: [PWAF-01]
duration: 25 min
completed: 2026-03-11
---

# Phase 5 Plan 1: PWA Installability Foundation Summary

**Installable PWA foundation with manifest, service worker, static icons, and smoke-test coverage for the installability contract**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-03-11
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added `@vite-pwa/sveltekit` and `idb-keyval`, generated the required icon assets, and created the Phase 05 Playwright scaffold files.
- Wired a custom inject-manifest service worker with app-shell precaching, Supabase REST `NetworkFirst` caching, and root-layout registration.
- Enabled the manifest in dev mode so Playwright can verify the manifest link and manifest payload on the repo's current local setup.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 - test stubs, icons, and dependencies** - `839289f` (feat)
2. **Task 2: PWA plugin config, service worker, and root layout wiring** - `8ad1f77` (feat)

## Files Created/Modified

- `package.json` - Adds the PWA plugin and IndexedDB queue dependency needed by later offline plans.
- `package-lock.json` - Locks the new dependency graph for reproducible installs.
- `static/icons/icon-192.png` - Adds the 192px install icon.
- `static/icons/icon-512.png` - Adds the 512px install icon.
- `static/icons/icon-512-maskable.png` - Adds the maskable icon variant.
- `tests/pwa.spec.ts` - Covers manifest link and manifest payload on dev, with preview-only service-worker registration verification.
- `tests/offline.spec.ts` - Adds the plan stub so later offline tests have an anchored file.
- `vite.config.ts` - Configures `SvelteKitPWA` with inject-manifest strategy, manifest metadata, and dev manifest serving.
- `svelte.config.js` - Disables SvelteKit's built-in service-worker registration to avoid double registration.
- `src/routes/+layout.svelte` - Registers the Vite PWA runtime and injects the manifest link and theme color.
- `src/service-worker.ts` - Implements Workbox precache, navigation caching, and Supabase REST `NetworkFirst` caching.
- `src/vite-pwa.d.ts` - Adds the Vite PWA client type declarations.

## Decisions Made

- Enabled `devOptions` in the PWA plugin because this repo's Playwright setup runs against `npm run dev`, and the manifest smoke tests need a real manifest URL in that mode.
- Kept the service-worker smoke test preview-only through `PW_SW_MODE` instead of forcing service-worker activation during normal dev test runs.

## Deviations from Plan

### Auto-fixed Issues

**1. Added dev-mode manifest serving**
- **Found during:** PWA Playwright verification
- **Issue:** `/manifest.webmanifest` returned `404` on the dev server even though the production build emitted the manifest correctly.
- **Fix:** Enabled `devOptions` in `vite.config.ts` for the PWA plugin.
- **Files modified:** `vite.config.ts`
- **Verification:** `npm run test:e2e -- tests/pwa.spec.ts`
- **Committed in:** `8ad1f77`

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** Kept the authored smoke-test contract intact without changing the repo's Playwright server mode.

## Issues Encountered

- `npm run check` still reports pre-existing TypeScript issues in the barcode and store-layout areas that were already present before this plan. The new PWA files build successfully and the PWA smoke tests pass in the actual local Playwright setup.
- The plan's example Playwright command uses `--project=chromium`, but this repo currently defines no Playwright projects, so verification had to run as `npm run test:e2e -- tests/pwa.spec.ts`.

## User Setup Required

None.

## Next Phase Readiness

- Plan `05-02` can now rely on cached app-shell and Supabase GET responses when the browser goes offline.
- Preview-mode verification remains available for manual service-worker inspection in browser devtools.

## Self-Check: PASSED

- Found `.planning/phases/05-pwa-and-offline-support/05-01-SUMMARY.md`
- Found commit `839289f`
- Found commit `8ad1f77`

---
*Phase: 05-pwa-and-offline-support*
*Completed: 2026-03-11*
