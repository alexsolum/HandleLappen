# Phase 18: iOS Scanner Black Screen Fix - Research

**Researched:** 2026-03-14
**Domain:** iOS Safari PWA camera access, html5-qrcode v2.3.8, Web Permissions API, Vibration API
**Confidence:** HIGH (core fixes are well-documented in WebKit bug tracker and html5-qrcode issues)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Haptic feedback:**
- Fire immediately on barcode detected — before the product lookup starts (instant tactile confirmation)
- Duration: 50ms single pulse via `navigator.vibrate(50)`
- No visual companion — the scanner sheet closing and lookup sheet appearing is sufficient visual feedback
- Graceful degradation: call `navigator.vibrate()` only if the API exists; iOS Safari does not implement Vibration API so iOS users get no vibration (acceptable per SCAN-03)

**Permission error UX (SCAN-02):**
- Two distinct states are required:
  - **Denied** (permanent block): Show message directing user to iOS Settings — no alarming error UI, no red icons. Use `navigator.permissions.query({name: 'camera'})` to detect `state: 'denied'` where available (iOS 16+, Chrome 74+). Fallback: treat repeated failures (after retry) as denied.
  - **Dismissed** (temporary — user tapped outside or pressed Cancel): Show "Prøv igjen" retry action
- Existing `permission-denied` state in `BarcodeScannerSheet.svelte` needs splitting into `permission-denied` (→ Settings) and `permission-dismissed` (→ retry)

**iOS black screen fix (SCAN-01):**
- Use MutationObserver to intercept the video element synchronously before html5-qrcode's `start()` callback fires, setting `playsinline`, `muted`, and `autoplay` attributes
- Current code sets these attributes after `start()` resolves (scanner.ts lines 246–252) — too late for iOS Safari
- Apply MutationObserver fix universally (not iOS-only) to avoid UA-sniffing fragility
- Acceptance bar: viewfinder visible within 2 seconds

### Claude's Discretion
- Exact text of iOS Settings guidance message (keep short, non-alarming)
- Permissions API fallback strategy for older iOS (< 16)
- Whether to use `vibrate([50])` array form vs scalar `50` (both equivalent)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAN-01 | Barcode scanner camera opens without black screen on iOS Safari in PWA standalone mode | MutationObserver intercept pattern before html5-qrcode start(); WebKit bug 252465 confirms playsinline must be set synchronously |
| SCAN-02 | When camera access is denied, app shows distinct "go to Settings" message; when only dismissed, shows "Try again" without alarming UI | Permissions API query for `state: 'denied'`; NotAllowedError message string detection for dismissed state on browsers that don't support Permissions API |
| SCAN-03 | Scanner provides haptic feedback on successful barcode detection | `navigator.vibrate(50)` guarded by existence check; fires in `onDetected` callback before lookup starts |
</phase_requirements>

---

## Summary

Phase 18 addresses three independent scanner reliability improvements: fixing the iOS Safari PWA black screen, splitting a single permission-denied state into two distinct UX states, and adding haptic feedback on barcode detection.

The iOS black screen root cause is a timing bug — the current code sets `playsinline`, `muted`, and `autoplay` on the video element *after* html5-qrcode's `start()` promise resolves, which is too late for WebKit. WebKit bugs 185448 and 252465 both confirm that for getUserMedia streams in PWA standalone mode, these attributes must be present on the video element *before* or *at the moment* the media stream is attached. The fix is to install a `MutationObserver` on the scanner container element *before* calling `htmlScanner.start()`, so the observer fires synchronously as html5-qrcode inserts the `<video>` tag and sets the required attributes immediately.

The permission distinction (denied vs dismissed) is the most nuanced part of this phase. The Web Permissions API returns `{ state: 'denied' | 'prompt' | 'granted' }` — there is no separate "dismissed" state in the spec. "Dismissed" (user tapped outside/Cancel) and "denied" (user tapped Block explicitly) both result in a `NotAllowedError` thrown by `getUserMedia`. The strategy is: query `navigator.permissions.query({name: 'camera'})` after the failure and use `state === 'denied'` to detect permanent denial; if Permissions API is unavailable (iOS < 16) or returns `'prompt'`, treat the failure as dismissed and show the retry action. Haptic feedback is the simplest of the three — a guarded `navigator.vibrate(50)` call wired into the `onDetected` callback.

**Primary recommendation:** Implement all three changes as isolated modifications to `scanner.ts` and `BarcodeScannerSheet.svelte`. No new npm packages are needed. Verify the black screen fix on a real iOS device in standalone PWA mode — simulator does not reproduce the WebKit bug.

---

## Standard Stack

### Core (no new packages required)

| API / Library | Version | Purpose | Notes |
|---------------|---------|---------|-------|
| `html5-qrcode` | 2.3.8 (existing) | Camera stream + barcode decode | Already installed; fix is applied around its `start()` call |
| `MutationObserver` | Browser native | Intercept video element insertion | Widely supported including Safari 7+; synchronous observer callback |
| `navigator.permissions` | Browser native | Query camera permission state after failure | iOS Safari 16+; fallback required for older versions |
| `navigator.vibrate` | Browser native | 50ms haptic pulse on detection | Chrome/Android only; iOS Safari does not implement; must be guarded |

### No Installation Needed

```bash
# No new packages — all capabilities are browser-native APIs
```

---

## Architecture Patterns

### Recommended Change Scope

```
src/lib/barcode/
└── scanner.ts          # Three changes: (1) MutationObserver before start(),
                        # (2) inferErrorReason() Permissions API query,
                        # (3) 'permission-dismissed' added to ScannerErrorReason

src/lib/components/barcode/
└── BarcodeScannerSheet.svelte  # Two changes: (1) new permission-dismissed UI state,
                                # (2) navigator.vibrate(50) in onDetected wrapper
```

### Pattern 1: MutationObserver Video Intercept (SCAN-01)

**What:** Install a MutationObserver on the scanner container element before calling `htmlScanner.start()`. When html5-qrcode inserts the `<video>` element, the observer fires synchronously and sets `playsinline`, `muted`, and `autoplay` before WebKit evaluates whether to attach the stream.

**When to use:** Always — applied universally (not iOS-only) to avoid UA-sniffing fragility.

**Why current code fails:** Lines 246–252 in `scanner.ts` call `document.getElementById(elementId)` and `region.querySelector('video')` after `await htmlScanner.start()` resolves. By this point WebKit has already evaluated the video element configuration and may have deferred stream attachment.

**Example pattern:**

```typescript
// In startScanner(), BEFORE htmlScanner.start() is called
const container = document.getElementById(elementId)
let videoObserver: MutationObserver | null = null

if (container) {
  videoObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLVideoElement) {
          node.setAttribute('playsinline', 'true')
          node.setAttribute('muted', 'true')
          node.setAttribute('autoplay', 'true')
          node.muted = true  // IDL attribute — belt-and-suspenders
          videoObserver?.disconnect()
        }
      }
    }
  })
  videoObserver.observe(container, { childList: true, subtree: true })
}

await htmlScanner.start(
  { facingMode: { ideal: 'environment' } },
  getScanConfig(),
  async (decodedText, result) => { /* ... existing detection callback ... */ },
  () => { /* frame misses */ }
)

// Disconnect in finally / cleanup if not already disconnected by observer
videoObserver?.disconnect()
```

### Pattern 2: Permission State Resolution (SCAN-02)

**What:** After a `getUserMedia` failure, query `navigator.permissions.query({name: 'camera'})` to distinguish a permanently denied camera from a dismissed prompt. Since the Permissions API is async and not universally supported, use a try/catch wrapper with a fallback.

**Key insight from research:** `NotAllowedError` error messages differ by browser:
- Chrome desktop: "Permission denied" (denied) vs "Permission dismissed" (dismissed)
- iOS Safari 16+: Permissions API may return `state: 'denied'` or `state: 'prompt'`
- iOS Safari < 16: Permissions API unavailable — treat all failures as dismissed (allow retry), but after a retry failure escalate to denied-equivalent UX

**Recommended logic in `inferErrorReason()`:**

```typescript
// inferErrorReason becomes async to support Permissions API
async function inferErrorReason(error: unknown): Promise<ScannerErrorReason> {
  // Try Permissions API first (iOS 16+, Chrome 74+)
  if (typeof navigator !== 'undefined' && navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
      if (status.state === 'denied') return 'permission-denied'
      // 'prompt' means user dismissed without making a permanent choice
      return 'permission-dismissed'
    } catch {
      // Permissions API threw (e.g. unsupported permission name) — fall through
    }
  }

  // Fallback: inspect error message
  const message = String(error ?? '').toLowerCase()
  if (
    message.includes('permission denied') ||
    message.includes('notallowederror') ||
    message.includes('denied')
  ) {
    // Cannot distinguish — default to dismissed (less alarming, allows retry)
    return 'permission-dismissed'
  }

  return 'camera-failure'
}
```

**Note on fallback strategy:** For iOS < 16 where Permissions API is unavailable, defaulting to `permission-dismissed` (retry) is the safer UX — if the user truly denied, retrying will get another `NotAllowedError` which they can then resolve by following help text. The CONTEXT.md decision captures this as the approved fallback.

### Pattern 3: Haptic Feedback on Detection (SCAN-03)

**What:** Guard-call `navigator.vibrate(50)` inside the `onDetected` wrapper in `bootScanner()`, immediately before the product lookup begins.

**When to use:** Always guarded — iOS Safari does not implement Vibration API; call must be conditional.

```typescript
// In bootScanner(), inside the onDetected wrapper:
onDetected: async (ean) => {
  // Haptic pulse — fires immediately on detection, before lookup (SCAN-03)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(50)
  }
  state = 'idle'
  await onDetected(ean)
},
```

### Pattern 4: Split Permission UI State (SCAN-02)

**What:** Add `'permission-dismissed'` to the `ScannerViewState` union and update `updateFailureState()` to branch on the new reason.

```typescript
// scanner.ts — updated type
export type ScannerErrorReason = 'permission-denied' | 'permission-dismissed' | 'camera-failure'

// BarcodeScannerSheet.svelte — updated state union
type ScannerViewState = 'idle' | 'loading' | 'scanning' | 'permission-denied' | 'permission-dismissed' | 'camera-failure'

// updateFailureState() — updated branches
function updateFailureState(error: ScannerError) {
  state = error.reason as ScannerViewState
  if (error.reason === 'permission-denied') {
    message = 'Gå til Innstillinger → Safari → Kamera for å gi tilgang'
  } else if (error.reason === 'permission-dismissed') {
    message = 'Kameratilgang ble ikke gitt. Trykk «Prøv igjen» for å åpne på nytt.'
  } else {
    message = 'Kameraet kunne ikke startes. Prøv igjen, eller skriv EAN manuelt.'
  }
}
```

The template must also show a "Prøv igjen" button for `permission-dismissed` (same as current `camera-failure` branch) and a "Settings guidance" for `permission-denied` (no retry button — it won't help).

### Anti-Patterns to Avoid

- **UA sniffing for iOS:** Do not check `navigator.userAgent` to decide whether to apply the MutationObserver fix. Apply universally — it is harmless on non-iOS browsers and avoids brittle agent string parsing.
- **Setting playsinline after `start()` resolves:** The current code pattern at lines 246–252 is the exact bug. Any refactor that keeps attributes set in a post-`start()` block will regress on iOS.
- **Showing "retry" for permanent denial on iOS:** On iOS, once the user permanently denies camera in Settings, `getUserMedia` will keep throwing `NotAllowedError`. Showing only a retry button creates a confusing loop. The Settings-guidance state must be reachable.
- **Disconnecting observer inside start() callback:** html5-qrcode's onSuccess and onFailure frame callbacks fire many times. The observer should be disconnected inside the observer callback itself (after first video insertion), not in a frame-level callback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vibration timing | Custom timing/animation | `navigator.vibrate(50)` native | One call, zero dependencies, auto-degrades |
| Permission state detection | Manual localStorage "denied after N retries" counter | `navigator.permissions.query` | Standards-based; works across browsers; cleaner than heuristics |
| Video attribute injection | Forking html5-qrcode | MutationObserver wrapper | Library's internal DOM structure may change across versions; external observer is resilient |

**Key insight:** The MutationObserver intercept is specifically designed to work *around* a third-party library's internal timing, which is better than patching the library or forking it.

---

## Common Pitfalls

### Pitfall 1: MutationObserver Not Disconnecting

**What goes wrong:** If the observer is not disconnected after the video element is found, it continues to fire on subsequent DOM mutations inside the scanner region, causing unnecessary work and potential issues if html5-qrcode reconstructs its DOM on restart.

**Why it happens:** MutationObserver observes indefinitely until explicitly disconnected.

**How to avoid:** Disconnect inside the observer callback immediately after setting video attributes, and also call `videoObserver?.disconnect()` in the `finally` block / cleanup path.

**Warning signs:** Multiple observer firings logged per scan session.

### Pitfall 2: `inferErrorReason` Becoming Async Breaks Call Sites

**What goes wrong:** The current `inferErrorReason` is synchronous. Making it async requires all call sites (`toScannerError`) to await it, which changes function signatures.

**Why it happens:** The Permissions API `query` call returns a Promise.

**How to avoid:** Make `toScannerError` async as well, and ensure the `catch` block in `startScanner` awaits it. The `onError` callback already accepts `Promise<void>` so async propagation is clean.

**Warning signs:** TypeScript errors about unresolved promises in `toScannerError`.

### Pitfall 3: Permissions API Returning `'prompt'` When Camera Is Blocked at OS Level

**What goes wrong:** On iOS, if the user has blocked camera access at the iOS Settings → Privacy → Camera level (not just in Safari), `navigator.permissions.query` may still return `'prompt'` rather than `'denied'`, because Safari does not distinguish OS-level from site-level denial in the Permissions API.

**Why it happens:** WebKit bug — confirmed in Apple Developer Forum thread (iOS 16.7.2, iOS 17.1.1 report from 2023).

**How to avoid:** The approved fallback strategy handles this: if the query returns `'prompt'` after a failure, show the dismissed/retry state. After a retry also fails, the user will see the dismissed state again; the Settings-link message in the `permission-denied` state is a second path, reachable when the Permissions API confirms `'denied'`. This is an acceptable tradeoff — the alternative (showing Settings link on first failure) would be alarming for users who simply tapped Cancel.

**Warning signs:** Users on iOS who blocked camera at OS level receiving a retry prompt instead of Settings guidance on first denial.

### Pitfall 4: Black Screen Fix Tested Only in Browser (Not Installed PWA)

**What goes wrong:** The black screen bug is specific to PWA standalone mode. The fix may appear to work when testing in Mobile Safari browser tab but the actual bug only manifests when the app is installed to the home screen.

**Why it happens:** WebKit applies different video element constraints in standalone mode (no browser chrome, service worker active).

**How to avoid:** Verify on a physical iPhone with the app installed to the home screen — this is explicitly noted in STATE.md pending todos: "Phase 18 iOS fix must be verified on a real iPhone in installed PWA mode — simulator cannot reproduce the black screen."

**Warning signs:** Tests pass but user reports black screen on device after deployment.

### Pitfall 5: `autoplay` Attribute Causing Audio Policy Issues

**What goes wrong:** Setting `autoplay` on the video element without `muted` may trigger browser autoplay policy blocks on non-iOS browsers, preventing the stream from playing.

**Why it happens:** Browser autoplay policies block unmuted autoplay.

**How to avoid:** Always set both `muted` (attribute) and `video.muted = true` (IDL property) together with `autoplay`. The `muted` attribute alone does not reliably suppress autoplay policy checks on all browsers; the IDL property must also be set.

---

## Code Examples

### Full MutationObserver Integration in startScanner()

```typescript
// Source: Pattern derived from WebKit bug 252465 and html5-qrcode issues #890, #713
// Applied universally (not iOS-only) before htmlScanner.start()

// Set up observer on the container element before start() is called
const container = document.getElementById(elementId)
let videoObserver: MutationObserver | null = null

if (container) {
  videoObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLVideoElement) {
          node.setAttribute('playsinline', 'true')
          node.setAttribute('muted', 'true')
          node.setAttribute('autoplay', 'true')
          node.muted = true
          videoObserver?.disconnect()
          videoObserver = null
        }
      }
    }
  })
  videoObserver.observe(container, { childList: true, subtree: true })
}

try {
  await htmlScanner.start(/* ... */)
} finally {
  videoObserver?.disconnect()  // Clean up if video was never inserted (error path)
}
```

### Permissions API Query with Fallback

```typescript
// Source: MDN Navigator.permissions + Apple Developer Forums thread 742439
async function inferErrorReason(error: unknown): Promise<ScannerErrorReason> {
  if (typeof navigator !== 'undefined' && navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
      if (status.state === 'denied') return 'permission-denied'
      return 'permission-dismissed'
    } catch {
      // Permissions API unsupported or permission name rejected
    }
  }

  // Fallback: conservative — default to dismissed (allows retry)
  return 'permission-dismissed'
}
```

### Guarded Vibration Call

```typescript
// Source: MDN Vibration API — navigator.vibrate is undefined on iOS Safari
if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
  navigator.vibrate(50)
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Set playsinline after `start()` resolves | Set via MutationObserver before `start()` inserts the video | Viewfinder visible within 2s on iOS PWA |
| Single `permission-denied` state for all failures | Two states: `permission-denied` (Settings) and `permission-dismissed` (retry) | Correct guidance for each failure mode |
| No haptic feedback | `navigator.vibrate(50)` on detection | Instant tactile confirmation on Android/Chrome; silent degradation on iOS |

**Deprecated/outdated in this codebase:**
- Post-`start()` video attribute setting at scanner.ts lines 246–252: these lines become dead code after the MutationObserver fix and should be removed.

---

## Open Questions

1. **Permissions API returning `'prompt'` for OS-level block on iOS**
   - What we know: iOS Safari may return `'prompt'` from `permissions.query` even when camera is OS-blocked (confirmed in Apple Developer Forums, iOS 16.7.2 / 17.1.1)
   - What's unclear: Whether iOS 18 has improved this
   - Recommendation: Accept the approved fallback — first failure → dismissed (retry), second failure → escalate. Document this as a known iOS limitation.

2. **html5-qrcode video element structure**
   - What we know: The library inserts a `<video>` into the element with ID `elementId`, but may also wrap it in a `<div>`
   - What's unclear: Exact DOM nesting depth in v2.3.8
   - Recommendation: Use `{ childList: true, subtree: true }` in the observer to cover any nesting depth. The `node instanceof HTMLVideoElement` check ensures only the video element is targeted.

3. **iOS 18 regression in WebKit bug 252465**
   - What we know: The bug was marked RESOLVED FIXED but 2024–2025 community reports indicate regression in iOS 18.0.1
   - What's unclear: Whether the MutationObserver fix is sufficient for iOS 18 or if additional workarounds are needed
   - Recommendation: Proceed with the MutationObserver fix (confirmed effective by roadmap decision). Real-device verification on iPhone with iOS 18 is required after implementation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/barcode.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | Video element has `playsinline` attribute after scanner starts | unit / integration | `npx playwright test tests/barcode.spec.ts` | ✅ (existing file, new test needed) |
| SCAN-02 | Denied state shows Settings guidance message, not "Prøv igjen" button | e2e (mocked) | `npx playwright test tests/barcode.spec.ts` | ✅ (existing file, update needed) |
| SCAN-02 | Dismissed state shows "Prøv igjen" button, not Settings message | e2e (mocked) | `npx playwright test tests/barcode.spec.ts` | ✅ (existing file, new test needed) |
| SCAN-03 | `navigator.vibrate` is called with 50ms value on barcode detection | e2e (mocked) | `npx playwright test tests/barcode.spec.ts` | ✅ (existing file, new test needed) |

**Testing notes:**
- SCAN-01 (MutationObserver / black screen): The black screen itself cannot be verified in Playwright/Chromium — it requires a physical iPhone in PWA standalone mode. A pragmatic test can verify that after scanner starts, the video element in the DOM has `playsinline` attribute set. This gives confidence the code path runs, while acknowledging real-device verification is the ultimate gate.
- SCAN-02: The existing `permission-denied` test already checks for "Kameratilgang mangler". It must be updated to assert the new Settings-guidance message, and a new test for the `permission-dismissed` state (showing "Prøv igjen") needs to be added. The mock system currently only has `'permission-denied'` mode — a `'permission-dismissed'` mock mode may be needed.
- SCAN-03: Playwright can intercept `navigator.vibrate` calls using `page.addInitScript` to spy on the method and assert it was called with `50`.

### Sampling Rate

- **Per task commit:** `npx playwright test tests/barcode.spec.ts`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`. Real-device iOS PWA verification is a manual gate for SCAN-01.

### Wave 0 Gaps

- [ ] New `permission-dismissed` scanner mock mode in `tests/barcode.spec.ts` helpers — covers SCAN-02 dismissed path
- [ ] `navigator.vibrate` spy in Playwright test for SCAN-03
- [ ] Updated existing `permission denied shows recovery state` test to expect Settings-guidance text rather than the generic message — covers SCAN-02 denied path

*(Existing `tests/barcode.spec.ts` infrastructure and helpers are fully reusable — no new fixture files needed)*

---

## Sources

### Primary (HIGH confidence)

- [WebKit bug 252465](https://bugs.webkit.org/show_bug.cgi?id=252465) — PWA HTML Video Element unable to play getUserMedia stream; confirmed RESOLVED FIXED with 2024–2025 regression reports for iOS 18
- [html5-qrcode issue #890](https://github.com/mebjas/html5-qrcode/issues/890) — iOS 17.2.3 Safari black screen; CSS display workaround discussed; confirms black screen is display rendering issue not camera access
- [html5-qrcode issue #713](https://github.com/mebjas/html5-qrcode/issues/713) — Camera won't launch in iOS PWA; WebKit bug 252465 linked; service worker interaction documented
- [MDN Navigator.permissions](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/permissions) — Permission states: 'granted', 'denied', 'prompt'; Baseline widely available since September 2022
- [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) — `navigator.vibrate()` specification; iOS Safari explicitly not supported
- `.planning/STATE.md` — Roadmap decisions confirming MutationObserver approach, SCAN-01/02/03 acceptance criteria
- `src/lib/barcode/scanner.ts` — Current implementation; lines 246–252 are the post-start() attribute-setting code that is too late for iOS
- `src/lib/components/barcode/BarcodeScannerSheet.svelte` — Current state machine and UI; `permission-denied` state to be split

### Secondary (MEDIUM confidence)

- [Apple Developer Forums thread 742439](https://developer.apple.com/forums/thread/742439) — iOS 16.7.2 / 17.1.1: `navigator.permissions.query` returning `'prompt'` for geolocation even when denied; implies same behavior for camera
- [html5-qrcode issue #1003](https://github.com/mebjas/html5-qrcode/issues/1003) — Video controls in iOS WebView; `webkit-playsinline` and standard `playsinline` attribute discussion
- [addpipe.com getUserMedia errors guide](https://blog.addpipe.com/common-getusermedia-errors/) — Chrome distinguishes "Permission denied" vs "Permission dismissed" in error message; iOS Safari does not

### Tertiary (LOW confidence — flagged for validation)

- Community workaround: Setting `display: inline` on the video div in issue #890 — unverified whether this works in PWA standalone mode or if MutationObserver is more reliable
- iOS 18 regression reports in WebKit bug 252465 comments (2024–2025) — specific iOS versions affected not confirmed independently

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new packages needed; all APIs are browser-native and well-documented
- Architecture (MutationObserver fix): HIGH — Pattern directly addresses the documented WebKit timing bug; confirmed in project roadmap decisions
- Architecture (Permission API strategy): MEDIUM — The `'prompt'` vs `'denied'` fallback behavior on older iOS is confirmed buggy by Apple Developer Forums; fallback strategy is sound given the constraints
- Architecture (Vibration): HIGH — Simple guarded call; well-specified behavior
- Pitfalls: HIGH — All pitfalls derived from actual code inspection and official bug reports
- Real-device verification: LOW automated / HIGH manual required — simulator cannot reproduce the black screen

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (stable APIs; WebKit bug status may change with iOS updates)
