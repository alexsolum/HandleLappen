# Phase 18: iOS Scanner Black Screen Fix - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the barcode scanner camera open reliably on iOS Safari in PWA standalone mode, distinguish camera permission denied vs dismissed with appropriate UX, and add haptic feedback on successful barcode detection. Creating, editing, or enriching scanned products is out of scope — that is Phase 19/20.

</domain>

<decisions>
## Implementation Decisions

### Haptic feedback
- Fire immediately on barcode detected — before the product lookup starts (instant tactile confirmation that the scan captured something)
- Duration: 50ms single pulse via `navigator.vibrate(50)`
- No visual companion — the scanner sheet closing and lookup sheet appearing is sufficient visual feedback
- Graceful degradation: call `navigator.vibrate()` only if the API exists; iOS Safari does not implement Vibration API so iOS users get no vibration (acceptable per SCAN-03: "devices that do not support it continue to work silently")

### Permission error UX (SCAN-02)
- Two distinct states are required:
  - **Denied** (permanent block): Show message directing user to iOS Settings — no alarming error UI, no red icons. Use `navigator.permissions.query({name: 'camera'})` to detect `state: 'denied'` where the Permissions API is available (iOS 16+, Chrome 74+). Fallback: treat repeated failures (after retry) as denied.
  - **Dismissed** (temporary — user tapped outside or pressed Cancel): Show "Prøv igjen" retry action
- User did not specify preference beyond the requirement — implement per SCAN-02 spec
- Existing `permission-denied` state in `BarcodeScannerSheet.svelte` handles only one case; needs splitting into `permission-denied` (→ Settings) and `permission-dismissed` (→ retry)

### iOS black screen fix (SCAN-01)
- Pre-decided in roadmap context: use MutationObserver to intercept the video element synchronously before html5-qrcode's `start()` callback fires, setting `playsinline`, `muted`, and `autoplay` attributes — based on WebKit bugs 185448, 252465 and html5-qrcode issues #890, #713
- Current code sets these attributes **after** `start()` resolves (scanner.ts lines 246–252) — too late for iOS Safari
- User notes: scanner appears to be opening on iOS already, but may be slow/requires steady aim — fix should ensure viewfinder is visible within 2 seconds
- Apply MutationObserver fix universally (not iOS-only) to avoid UA-sniffing fragility

### Claude's Discretion
- Exact text of iOS Settings guidance message (keep short, non-alarming — e.g. "Gå til Innstillinger → Safari → Kamera for å gi tilgang")
- Permissions API fallback strategy for older iOS (< 16)
- Whether to use `vibrate([50])` array form vs scalar `50` (both equivalent)

</decisions>

<specifics>
## Specific Ideas

- User noted the scanner works on iOS but needs "a bit of time and precision to catch the barcode" — this is acceptable scanning behavior (EAN codes require steady framing), not a bug to fix in this phase
- SCAN-02 requirement text is the specification: denied → Settings, dismissed → Prøv igjen
- The 2-second viewfinder window from SCAN-01 is the acceptance bar for the black screen fix

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/barcode/scanner.ts`: `startScanner()` — the MutationObserver fix goes here, before/during `htmlScanner.start()`, to intercept video element insertion
- `src/lib/components/barcode/BarcodeScannerSheet.svelte`: existing state machine (idle/loading/scanning/permission-denied/camera-failure) — needs a new `permission-dismissed` state and the haptic call wired into `onDetected`
- `inferErrorReason()` in scanner.ts: currently maps both denied and dismissed to `'permission-denied'` — needs update to distinguish them using Permissions API query

### Established Patterns
- `onDetected` callback in `startScanner()` is the injection point for haptic — fires once per confirmed barcode
- `ScannerErrorReason` type union — add `'permission-dismissed'` alongside existing `'permission-denied'` and `'camera-failure'`
- `updateFailureState()` in BarcodeScannerSheet — add branch for `permission-dismissed` showing retry action, keep existing `permission-denied` for Settings guidance

### Integration Points
- `BarcodeScannerSheet.svelte` → `scanner.ts` → `onDetected` callback chain: haptic fires in the `onDetected` wrapper inside `bootScanner()`
- No new npm packages needed — `navigator.vibrate` and `navigator.permissions` are browser-native APIs

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-ios-scanner-black-screen-fix*
*Context gathered: 2026-03-14*
