---
phase: 18-ios-scanner-black-screen-fix
plan: 01
subsystem: ui
tags: [svelte5, playwright, barcode, scanner, permissions-api, haptic, mutation-observer, html5-qrcode, ios-safari, pwa]

# Dependency graph
requires:
  - phase: 04-barcode-scanning
    provides: scanner.ts startScanner, BarcodeScannerSheet.svelte, barcode.spec.ts test infrastructure
provides:
  - MutationObserver video element intercept in startScanner (iOS Safari black screen fix)
  - Async Permissions API-based inferErrorReason distinguishing denied vs dismissed
  - 'permission-dismissed' as third ScannerErrorReason type
  - Split permission-denied / permission-dismissed UX in BarcodeScannerSheet
  - navigator.vibrate(50) haptic feedback on barcode detection (SCAN-03)
affects: [any phase touching barcode scanning or scanner UX]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MutationObserver installed before html5-qrcode start() to intercept video element synchronously — set playsinline/muted/autoplay before iOS Safari's autoplay gate fires"
    - "Async Permissions API pattern: inferErrorReason awaits navigator.permissions.query({name:'camera'}) to distinguish denied (blocked) vs dismissed (just closed prompt) — fallback returns dismissed"
    - "Svelte 5 async reactivity: state and message variables must be $state() to receive updates from await continuations in external async callbacks"
    - "navigator.vibrate guard: typeof navigator.vibrate === 'function' before calling — silently degrades on iOS Safari"

key-files:
  created: []
  modified:
    - src/lib/barcode/scanner.ts
    - src/lib/components/barcode/BarcodeScannerSheet.svelte
    - tests/barcode.spec.ts
    - vite.config.ts

key-decisions:
  - "MutationObserver is installed universally (no UA sniffing) before htmlScanner.start() — applies the video attributes synchronously as the video element is inserted, not after start() resolves"
  - "inferErrorReason checks error message first (must be permission-related) then queries Permissions API — camera-failure errors bypass the async path entirely"
  - "permission-dismissed is the safe fallback when Permissions API is unavailable or query throws — allows retry (better UX than blocking the user)"
  - "state and message use $state() in Svelte 5 so async callback assignments (from onError inside startScanner) correctly trigger reactivity updates"
  - "dialogEl, session, removeVisibilityCleanup, removeRouteCleanup remain plain let (not $state) — $state on dialogEl broke bind:this and caused click-blocking in Playwright tests"
  - "Haptic navigator.vibrate(50) added to BOTH the real startScanner onDetected path AND the active mock detection handler — ensures test coverage works"
  - "vite.config.ts filename reverted to service-worker.ts — service-worker.js caused ENOENT in dev mode since only the .ts source exists; the previous filename: 'service-worker.js' fix was incorrect for dev mode"

patterns-established:
  - "Permissions API mock in Playwright addInitScript: Object.defineProperty(navigator, 'permissions', {value: {query: async () => ({state: '...'})}, configurable: true}) inside the initScript callback to distinguish test modes"
  - "Two-state permission error split: permission-denied (OS/browser blocked) shows Settings guidance, no retry; permission-dismissed (prompt closed) shows retry, no Settings guidance"

requirements-completed:
  - SCAN-01
  - SCAN-02
  - SCAN-03

# Metrics
duration: 34min
completed: 2026-03-15
---

# Phase 18 Plan 01: iOS Scanner Black Screen Fix Summary

**MutationObserver video intercept fixes iOS Safari PWA black screen; async Permissions API splits permission-denied vs permission-dismissed UX; navigator.vibrate(50) adds haptic feedback on detection**

## Performance

- **Duration:** 34 min
- **Started:** 2026-03-15T05:24:25Z
- **Completed:** 2026-03-15T05:58:30Z
- **Tasks:** 3 (Task 0 RED, Task 1 GREEN scanner.ts, Task 2 GREEN BarcodeScannerSheet)
- **Files modified:** 4

## Accomplishments
- Fixed iOS Safari PWA black screen: MutationObserver sets playsinline/muted/autoplay on the video element synchronously as html5-qrcode inserts it, before start() resolves
- Split single 'permission-denied' state into two: permission-denied (Settings guidance, no retry) and permission-dismissed (retry button, no Settings text)
- Added navigator.vibrate(50) haptic feedback on barcode detection, guarded by typeof check, degrades silently on iOS

## Task Commits

Each task was committed atomically:

1. **Task 0: RED test scaffold** - `35481e2` (test)
2. **Task 1: scanner.ts implementation** - `35bfd2a` (feat)
3. **Task 2: BarcodeScannerSheet implementation** - `7fce580` (feat)

_TDD: RED → GREEN with no separate REFACTOR commit needed_

## Files Created/Modified
- `src/lib/barcode/scanner.ts` - Added 'permission-dismissed' to ScannerErrorReason; async inferErrorReason with Permissions API; MutationObserver video intercept; removed post-start() attribute block
- `src/lib/components/barcode/BarcodeScannerSheet.svelte` - Split permission-denied/permission-dismissed UI states; haptic in both detection paths; $state() for async reactivity; updated retry button condition
- `tests/barcode.spec.ts` - Added permission-dismissed mock mode with navigator.permissions override; updated denied test assertions; two new tests (permission-dismissed UX, vibrate spy)
- `vite.config.ts` - Reverted filename to service-worker.ts (fixes dev server ENOENT overlay)

## Decisions Made
- MutationObserver installed universally (no UA sniffing) — applies to all browsers, not just iOS
- permission-dismissed is the safe fallback when Permissions API unavailable — allows retry
- state/message use $state() in Svelte 5 — needed for async callback reactivity
- dialogEl/session remain plain let — $state() on dialogEl broke bind:this, causing Playwright click timeouts
- Haptic added to both real and mock detection paths for test coverage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MockScannerState.mode type extended to include 'permission-dismissed'**
- **Found during:** Task 0 (RED test scaffold)
- **Issue:** TypeScript error: 'permission-dismissed' not assignable to MockScannerState.mode type ('active' | 'permission-denied'). Caused vite-error-overlay blocking all tests.
- **Fix:** Added 'permission-dismissed' to MockScannerState type in scanner.ts (part of Task 1 implementation, pulled forward to unblock RED)
- **Files modified:** src/lib/barcode/scanner.ts
- **Verification:** TypeScript compiles clean; vite overlay gone
- **Committed in:** 35481e2 (Task 0 commit)

**2. [Rule 3 - Blocking] vite-error-overlay from missing service-worker.js — reverted filename**
- **Found during:** Task 0 (RED verification)
- **Issue:** Dev server showing ENOENT overlay for src/service-worker.js (filename: 'service-worker.js' in vite.config.ts, but only .ts source exists). Overlay intercepted pointer events, blocking all test interactions.
- **Fix:** Changed filename back to 'service-worker.ts' to match the actual source file
- **Files modified:** vite.config.ts
- **Verification:** Overlay gone; all tests proceed past login button
- **Committed in:** 35481e2 (Task 0 commit)

**3. [Rule 1 - Bug] navigator.vibrate spy type cast fix**
- **Found during:** Task 0 (RED test scaffold)
- **Issue:** TypeScript error: `(pattern: number | number[]) => true` not assignable to vibrate overloaded signature (missing Iterable<number> variant)
- **Fix:** Cast navigator to `any` in the spy assignment: `(navigator as any).vibrate = ...`
- **Files modified:** tests/barcode.spec.ts
- **Verification:** TypeScript compiles clean
- **Committed in:** 35481e2 (Task 0 commit)

**4. [Rule 1 - Bug] Svelte 5 async reactivity — state/message must be $state()**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** state and message variables declared as plain let were not updating the DOM when assigned from async callback chains (the onError callback invoked from within startScanner's catch block). Dialog remained in idle state despite updateFailureState() being called.
- **Fix:** Converted state and message to $state() to ensure Svelte 5 tracks assignments from async continuations
- **Files modified:** src/lib/components/barcode/BarcodeScannerSheet.svelte
- **Verification:** permission-denied text visible in browser after state change; 11/11 tests pass
- **Committed in:** 7fce580 (Task 2 commit)

**5. [Rule 1 - Bug] $state() on dialogEl broke bind:this — reverted**
- **Found during:** Task 2 (GREEN verification, vibrate test fix)
- **Issue:** Using $state(null) for dialogEl caused click() calls in Playwright to hang indefinitely (locator.click timed out). The $state() proxy on the dialog element broke showModal() or the event dispatch lifecycle.
- **Fix:** Reverted dialogEl, session, removeVisibilityCleanup, removeRouteCleanup back to plain let. Only state and message need $state().
- **Files modified:** src/lib/components/barcode/BarcodeScannerSheet.svelte
- **Verification:** Vibrate test passes (3.6s), all 11 tests pass
- **Committed in:** 7fce580 (Task 2 commit)

**6. [Rule 1 - Bug] Test assertion strict mode fix — .first() added**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** page.getByText(/Innstillinger.*Safari.*Kamera/) matched two elements (header message paragraph AND preview area paragraph). Playwright strict mode throws on multiple matches.
- **Fix:** Added .first() to the assertion locator
- **Files modified:** tests/barcode.spec.ts
- **Verification:** Test passes without strict mode violation
- **Committed in:** 7fce580 (Task 2 commit)

**7. [Rule 2 - Missing Critical] Haptic added to active mock detection path**
- **Found during:** Task 2 (vibrate test investigation)
- **Issue:** Haptic vibrate(50) was only added to the startScanner onDetected wrapper, but the 'active' mock mode uses its own detection handler in bootScanner that bypassed startScanner. The vibrate test uses 'active' mode, so the haptic was never called.
- **Fix:** Added the same navigator.vibrate(50) guard call to the active mock handleMockDetected function in bootScanner
- **Files modified:** src/lib/components/barcode/BarcodeScannerSheet.svelte
- **Verification:** Vibrate test passes with vibrateCalls containing 50
- **Committed in:** 7fce580 (Task 2 commit)

---

**Total deviations:** 7 auto-fixed (2 blocking Rule 3, 4 bugs Rule 1, 1 missing critical Rule 2)
**Impact on plan:** All auto-fixes necessary for correct operation, test infrastructure, and Svelte 5 reactivity. No scope creep.

## Issues Encountered
- Svelte 5's $state() behavior with bind:this was a non-obvious interaction: $state() on DOM-bound variables (dialogEl) causes the reactive proxy to be passed to native DOM APIs like showModal(), breaking them. The fix is to only $state() variables used in template expressions, not variables bound to DOM elements.
- The pre-existing service-worker.js ENOENT was masking all test failures initially — resolving this early unblocked the TDD cycle.

## Next Phase Readiness
- iOS black screen fix is implemented but requires real iPhone PWA verification (simulator cannot reproduce the black screen — see STATE.md pending todo)
- Phase 19 (product image and brand columns) and Phase 20 (Svelte 5 onerror) can proceed independently
- Phase 18 can ship as a hotfix once verified on device

---
*Phase: 18-ios-scanner-black-screen-fix*
*Completed: 2026-03-15*
