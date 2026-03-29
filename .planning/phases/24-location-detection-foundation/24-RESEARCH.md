# Phase 24: Location Detection Foundation - Research

**Researched:** 2026-03-29
**Domain:** Foreground geolocation in a SvelteKit PWA, including iPhone installed-web-app behavior
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Permission entry point
- The location flow starts from the shopping list page, not from app load, layout mount, or admin/settings surfaces.
- First interaction shows an explanation/confirmation step on the list page; the browser permission prompt is requested only after a second explicit tap.
- The primary message should emphasize the outcome: automatic store selection.
- Once permission is granted, location detection starts immediately for the rest of the current foreground session.

### Manual picker behavior
- The existing manual store picker remains always visible in Phase 24.
- Auto-detection can preselect and replace the current manual choice when a store is detected; detected store takes precedence over manual selection.
- The no-store/manual label should use action wording: `Velg butikk manuelt`.
- If the user manually chooses a store first and later grants location permission, detection takes over immediately.

### Status and recovery UX
- While locating, show a compact inline status above the picker rather than a blocking overlay or large card.
- If permission is denied, show a short inline recovery state with retry affordance plus Settings guidance when the browser will not re-prompt.
- If location is unavailable despite permission being granted, the message should emphasize that the app could not find the user's position right now and should point to manual store selection.
- Recovery messaging stays persistently visible inline until detection succeeds.

### Detection cadence
- Foreground polling cadence should be approximately every 60 seconds during normal operation.
- On foreground return, the app should perform an immediate location check before resuming the regular interval.
- Temporary failures should trigger one quicker retry after roughly 10-15 seconds, then return to the normal cadence.
- If a valid location is obtained but no nearby saved store is found, the UI stays quiet beyond the normal picker and subtle status state; do not auto-open the picker or show a prominent "no nearby store" message.

### Claude's Discretion
- Exact Norwegian copy for the confirmation step, retry state, and Settings hint.
- Whether the two-step permission flow is rendered as an inline card, compact expandable panel, or bottom-sheet style prompt on the list page.
- Exact failure taxonomy for denied vs dismissed vs unavailable, as long as the user-facing recovery behavior matches the decisions above.
- The specific timer inside the agreed quick-retry window (`10-15` seconds).
- The exact mechanism for pausing/resuming polling across tab visibility and app foreground transitions.

### Deferred Ideas (OUT OF SCOPE)
- Shopping-mode banner, branded in-store UI, and store-arrival presentation belong to Phase 25.
- Dwell timing / geofence confidence rules for entering shopping mode belong to Phase 25.
- Check-off behavior changes based on store/home context belong to Phases 25 and 26.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOCATE-01 | App detects the user's proximity to saved stores while the app is in the foreground using battery-safe geolocation polling | Use a chained `getCurrentPosition()` poller with `enableHighAccuracy: false`, visibility pause/resume, and client-side nearest-store matching against Phase 23 coordinates. |
| LOCATE-02 | App requests geolocation permission with a clear explanation of why it's needed | Use a two-step list-page UI where the second tap calls geolocation directly inside the button handler to preserve WebKit user activation. |
| LOCATE-03 | When geolocation is unavailable or denied, the user can manually select a store to enter shopping mode | Keep `StoreSelector` always visible; location errors only add inline status/recovery UI and never gate manual selection. |
</phase_requirements>

## Summary

Phase 24 should use the browser's native Geolocation API, not a new package. The correct shape for this app is a foreground-only, one-shot polling loop built on `navigator.geolocation.getCurrentPosition()`, not `watchPosition()`. A chained `setTimeout()` scheduler gives explicit control over the normal 60-second cadence, the one quick retry after temporary failures, and cleanup when the page becomes hidden. This matches the v2.2 roadmap decision, the current codebase's existing `visibilitychange` pattern, and the requirement that background behavior is out of scope for PWAs.

The permission flow must be designed around WebKit constraints, not just generic browser docs. On Safari/WebKit, transient user activation can expire if the geolocation call is delayed behind extra async work, and current WebKit behavior means `navigator.permissions.query({ name: 'geolocation' })` is not a reliable source of truth for denied vs prompt states. Plan the UI so the second explicit tap on the list page calls `getCurrentPosition()` immediately. Treat the actual geolocation result or `GeolocationPositionError.code` as authoritative, and treat `navigator.permissions.query()` as optional hinting only.

The manual store picker should remain the stable backbone of the flow. Location detection is an enhancement layered above the existing `selectedStoreId` list-page behavior, not a replacement for it. That means the location session can live in a reusable client module, but the list page should continue owning the permission CTA, inline status, and `selectedStoreId` updates. Also note an integration bug already present in the list page: it still reads `store.name`, while Phase 23 store rows now expose `chain` and `location_name`. Phase 24 should correct that first so detected store names and history context stay coherent.

**Primary recommendation:** Build a list-page-triggered location session around one-shot `getCurrentPosition()` polling plus `visibilitychange` pause/resume, and never rely on the Geolocation Permissions API alone to decide iPhone/WebKit recovery UX.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Geolocation API | Web standard | Foreground position checks | Native browser API; supports one-shot checks, secure-context gating, and explicit error codes. |
| Page Visibility API | Web standard | Pause/resume location polling | Native lifecycle signal for visible vs hidden documents; better than `focus`/`blur` proxies. |
| Svelte | 5.51.0 in repo, 5.55.0 latest verified 2026-03-23 | Component/state layer | Matches the repo's runes-based component model; no upgrade needed for this phase. |
| `@tanstack/svelte-query` | 6.1.0 in repo, 6.1.10 latest verified 2026-03-23 | Store data source for saved store coordinates | Already powers `createStoresQuery()` and keeps the phase inside existing fetch/cache patterns. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Permissions API | Web standard | Optional permission hinting only | Use only for non-authoritative UI hints after page load; do not drive core state from it on WebKit. |
| Playwright | 1.58.2 in repo and latest verified 2026-03-29 | Geolocation E2E coverage | Use `grantPermissions()` and `setGeolocation()` for browser-level test coverage of the list-page flow. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Chained `getCurrentPosition()` | `watchPosition()` | `watchPosition()` is harder to cadence-control and easier to leave running; the phase explicitly wants battery-safe polling. |
| Shared location session module + page-owned UI | All logic inline in `+page.svelte` | Inline-only logic is faster to start but will become messy once Phase 25 consumes the same session state. |
| Error/result-based recovery | `navigator.permissions.query()` as the main state machine | This breaks on WebKit geolocation because `prompt` can be reported in denied or not-yet-used cases. |

**Installation:**
```bash
# No new npm packages are recommended for Phase 24.
```

**Version verification:**
- `npm view svelte version time.modified` → `5.55.0`, modified `2026-03-23T14:10:09.309Z`
- `npm view @sveltejs/kit version time.modified` → `2.55.0`, modified `2026-03-12T22:01:52.580Z`
- `npm view @tanstack/svelte-query version time.modified` → `6.1.10`, modified `2026-03-23T15:35:40.936Z`
- `npm view @playwright/test version time.modified` → `1.58.2`, modified `2026-03-29T05:45:36.948Z`

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── lib/location/
│   ├── geolocation.ts          # Promise wrapper + error classification
│   ├── proximity.ts            # Haversine distance + nearest-store match
│   └── session.svelte.ts       # Foreground poller, timers, visibility lifecycle
├── lib/components/stores/
│   └── LocationPermissionCard.svelte  # Inline two-step CTA/recovery UI above picker
└── routes/(protected)/lister/[id]/
    └── +page.svelte            # Owns CTA, inline status, manual picker, selectedStoreId wiring
```

### Pattern 1: User-Activation-First Permission Request
**What:** The first tap opens the explanation step. The second tap calls `navigator.geolocation.getCurrentPosition()` immediately inside that click handler.
**When to use:** Initial permission request and any retry path that should re-open the browser prompt.
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
// Source: https://webkit.org/blog/13862/the-user-activation-api/
export function getCurrentLocation(options: PositionOptions = {}) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('geolocation-unavailable'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 30_000,
      timeout: 10_000,
      ...options,
    })
  })
}

async function handleConfirmAutomaticStore() {
  locating = true

  try {
    const position = await getCurrentLocation()
    locationSession.acceptSample(position)
  } catch (error) {
    locationSession.handleRequestError(error)
  }
}
```

### Pattern 2: Chained Foreground Poller
**What:** Use one in-flight location request at a time and schedule the next attempt with `setTimeout()`, not `setInterval()`.
**When to use:** After permission has been granted for the current foreground session.
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
const NORMAL_POLL_MS = 60_000
const RETRY_POLL_MS = 12_000

let timer: ReturnType<typeof setTimeout> | null = null
let inFlight = false

async function tick(delay = 0) {
  if (timer) clearTimeout(timer)

  timer = setTimeout(async () => {
    if (document.visibilityState !== 'visible' || inFlight) return

    inFlight = true
    try {
      const position = await getCurrentLocation()
      acceptSample(position)
      tick(NORMAL_POLL_MS)
    } catch (error) {
      const retryable = isTemporaryLocationFailure(error)
      handleRequestError(error)
      tick(retryable ? RETRY_POLL_MS : NORMAL_POLL_MS)
    } finally {
      inFlight = false
    }
  }, delay)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    tick(0)
    return
  }

  if (timer) clearTimeout(timer)
  timer = null
}
```

### Pattern 3: Shared Session State, Page-Owned UX
**What:** Keep the location engine in a reusable client module, but keep the list page responsible for the inline CTA/status and for writing `selectedStoreId`.
**When to use:** The list page remains the only Phase 24 surface, but Phase 25 will need the same session result.
**Example:**
```typescript
// Source: repo pattern in src/lib/stores/offline.svelte.ts and src/routes/(protected)/lister/[id]/+page.svelte
type LocationSessionState =
  | { kind: 'idle' }
  | { kind: 'explaining' }
  | { kind: 'locating' }
  | { kind: 'granted'; detectedStoreId: string | null }
  | { kind: 'denied'; canRetry: boolean }
  | { kind: 'unavailable'; canRetry: boolean }

export const locationSession = $state<{
  state: LocationSessionState
  lastPosition: GeolocationPosition | null
}>({
  state: { kind: 'idle' },
  lastPosition: null,
})
```

### Anti-Patterns to Avoid
- **Request-on-mount:** Do not call geolocation from app load, layout mount, or route load. It violates the locked decision and increases iPhone PWA risk.
- **`setInterval()` polling:** It can overlap requests when a location lookup stalls. Use chained `setTimeout()` instead.
- **Permissions-API-first recovery logic:** On WebKit geolocation, `prompt` does not reliably mean "not denied".
- **Hidden manual picker:** `StoreSelector` is required fallback, not secondary recovery UI.
- **Ad hoc store naming:** Do not revive `store.name`; use `storeDisplayName(chain, location_name)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Battery-safe foreground tracking | Continuous GPS watcher | One-shot `getCurrentPosition()` poll loop | Explicit cadence control, simpler cleanup, better alignment with Phase 24 acceptance criteria. |
| Permission-state truth on Safari/iOS | Custom state machine driven by `navigator.permissions.query()` | Actual geolocation attempt + `GeolocationPositionError.code` + retry outcome | WebKit intentionally reports `prompt` in some denied/not-yet-used cases. |
| Manual fallback UX | New settings-first flow or modal-only fallback | Existing `StoreSelector` kept always visible | Requirement says manual selection must always be available, not only on failure. |
| Lifecycle detection | `window.focus` / `window.blur` heuristics | `document.visibilityState` + `visibilitychange` | Focus is not the same as visible; background timers are throttled. |
| Store display labels | Reconstructing names inline | `storeDisplayName()` from `src/lib/utils/stores.ts` | Phase 23 already centralized store naming; reusing it avoids drift. |

**Key insight:** The deceptively hard part of this phase is not distance math. It is browser lifecycle and permission behavior on WebKit. Keep the custom code small and deterministic: one-shot requests, one session store, one inline CTA, one always-visible manual picker.

## Common Pitfalls

### Pitfall 1: Losing WebKit User Activation Before the Prompt
**What goes wrong:** The confirm button opens UI, waits on another async action, and only then calls geolocation; on iPhone PWA the prompt may not appear correctly.
**Why it happens:** WebKit ties privileged API access to transient user activation that can expire quickly.
**How to avoid:** Make the second explicit tap call `getCurrentPosition()` directly in the handler. Do not insert modal transitions, route navigation, or extra awaited work before that call.
**Warning signs:** Works in desktop Chrome but prompt silently fails or appears behind the wrong surface on installed iPhone PWA.

### Pitfall 2: Treating `navigator.permissions.query({ name: 'geolocation' })` as Authoritative
**What goes wrong:** Recovery UI shows the wrong state because WebKit reports `prompt` when the site is effectively denied or before geolocation has been used since page load.
**Why it happens:** Current WebKit geolocation permission behavior is intentionally privacy-preserving and differs from generic assumptions.
**How to avoid:** Use permission query only as a hint. Base the real state on geolocation request results and retry outcomes.
**Warning signs:** Query says `prompt`, but the browser never re-prompts or the user is effectively blocked until Settings.

### Pitfall 3: Overlapping Timers and Stale Pollers
**What goes wrong:** Multiple location requests run at once, or polling continues after the page is hidden or route is left.
**Why it happens:** `setInterval()` and untracked event listeners are easy to leak.
**How to avoid:** Centralize polling in one session module, guard against concurrent requests, and clear the timer on `visibilitychange` and teardown.
**Warning signs:** Duplicate status updates, excess battery drain, or logs showing multiple active requests after navigation.

### Pitfall 4: Misclassifying Temporary Failures as Permanent Denial
**What goes wrong:** The app tells the user to open Settings when the real issue is temporary location unavailability or timeout.
**Why it happens:** Geolocation has three distinct error codes and only one is permission denial.
**How to avoid:** Treat `PERMISSION_DENIED` as the only permanent-denial signal. Map `POSITION_UNAVAILABLE` and `TIMEOUT` to the inline unavailable state and quick retry.
**Warning signs:** Settings guidance appears even when Location Services are on and a retry later succeeds.

### Pitfall 5: Carrying Forward the Old `store.name` Assumption
**What goes wrong:** Detected store labels or history context become `null` or stale because the list page still references `store.name`.
**Why it happens:** Phase 23 changed stores to `chain` + `location_name`, but the list page still has a leftover derived name.
**How to avoid:** Update the list page to use `storeDisplayName()` before Phase 24 depends on detected names.
**Warning signs:** `selectedStoreName` is empty even when a store is selected or detected.

## Code Examples

Verified patterns from official sources:

### One-Shot Geolocation Request With Explicit Options
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log(position.coords.latitude, position.coords.longitude)
  },
  (error) => {
    console.error(error.code)
  },
  {
    enableHighAccuracy: false,
    maximumAge: 30_000,
    timeout: 10_000,
  }
)
```

### Visibility-Based Poll Pause/Resume
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resumeLocationPolling()
  } else {
    pauseLocationPolling()
  }
})
```

### Playwright Geolocation Control
```typescript
// Source: https://playwright.dev/docs/api/class-browsercontext
test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({
    latitude: 59.9139,
    longitude: 10.7522,
    accuracy: 25,
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Request permission on page load or app mount | Show benefit explanation, then request location on explicit confirm tap | Locked decision on 2026-03-29, reinforced by WebKit User Activation API (2023-02-15) | Better UX and higher reliability on iPhone installed PWAs. |
| Treat `navigator.permissions.query('geolocation')` as truth | Treat it as hint only; actual geolocation attempt is the source of truth | WebKit bugs in 2025 made the limitation explicit | Avoids wrong denied/prompt branching on Safari/iOS. |
| Continuous `watchPosition()` listener | One-shot `getCurrentPosition()` scheduler with visibility pause/resume | v2.2 roadmap decision on 2026-03-28 | Keeps battery use and lifecycle behavior predictable. |
| `focus` / `blur` lifecycle proxies | `visibilitychange` with `document.visibilityState` | Standard current web guidance | Correctly handles hidden tabs, minimized windows, and screen-off states. |

**Deprecated/outdated:**
- `navigator.permissions.query({ name: 'geolocation' })` as the main recovery-state driver on WebKit: outdated for this phase; keep it non-authoritative.
- `window.onfocus` / `window.onblur` as the only polling lifecycle signal: outdated proxy; use visibility state.

## Open Questions

1. **What physical iPhone matrix is available for manual validation?**
   - What we know: Phase 24 must be tested on a real iPhone installed to the home screen, and simulator/browser-mode validation is insufficient.
   - What's unclear: Which iOS versions the team can practically validate before Phase 24 is closed.
   - Recommendation: Make one current stable iPhone the minimum gate, and add one older supported device if the team has it.

2. **Where should the reusable session be initialized?**
   - What we know: Permission entry must start from the list page, and `src/routes/(protected)/+layout.svelte` already hosts app-wide client lifecycle code.
   - What's unclear: Whether the first implementation should mount listeners from the page or from a shared session module called by the page.
   - Recommendation: Put listeners and timers in `src/lib/location/session.svelte.ts`, but start and stop the session from the list page in Phase 24.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/location-detection.spec.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOCATE-01 | Foreground poller runs on grant, pauses when hidden, resumes immediately when visible, and updates store selection from nearby coordinates | e2e with mocked geolocation provider and visibility changes | `npx playwright test tests/location-detection.spec.ts -g "foreground poller"` | ❌ Wave 0 |
| LOCATE-02 | Explanation appears before any browser prompt; second explicit tap triggers location request; denied and unavailable paths show the correct inline recovery UI | e2e plus manual physical-device validation for installed iPhone PWA | `npx playwright test tests/location-detection.spec.ts -g "permission flow"` | ❌ Wave 0 |
| LOCATE-03 | Manual picker remains visible and usable when location is denied, unavailable, or not yet granted | e2e | `npx playwright test tests/location-detection.spec.ts -g "manual picker fallback"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/location-detection.spec.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green plus manual physical-iPhone installed-PWA validation before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/location-detection.spec.ts` — primary Phase 24 browser coverage for LOCATE-01, LOCATE-02, and LOCATE-03
- [ ] `tests/helpers/location.ts` — geolocation mocking, permission-state setup, and seeded nearby-store helpers
- [ ] Manual validation checklist artifact for installed iPhone PWA flow — explicit steps for first prompt, deny, retry, unavailable, background/resume

## Sources

### Primary (HIGH confidence)
- WebKit User Activation API - https://webkit.org/blog/13862/the-user-activation-api/ - verified transient user activation behavior and why the confirm tap must call geolocation directly.
- WebKit bug 289664 - https://bugs.webkit.org/show_bug.cgi?id=289664 - verified that WebKit may report geolocation permission as `prompt` instead of `denied` for privacy reasons.
- WebKit bug 293089 - https://bugs.webkit.org/show_bug.cgi?id=293089 - verified that geolocation permission state is only fully reported after the API has been used since page load, and that `change` event support is incomplete.
- Playwright BrowserContext docs - https://playwright.dev/docs/api/class-browsercontext - verified `grantPermissions()` and `setGeolocation()` for automated testing.

### Secondary (MEDIUM confidence)
- MDN Geolocation - https://developer.mozilla.org/en-US/docs/Web/API/Geolocation - checked secure-context requirement, permission gating, and API surface.
- MDN Using the Geolocation API - https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API - checked one-shot vs watch behavior and option semantics.
- MDN Permissions.query - https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query - checked geolocation permission query usage and rejection behavior for unsupported permissions.
- MDN Page Visibility API - https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API - checked visibility semantics and background timer throttling guidance.

### Tertiary (LOW confidence)
- Apple Developer Forums thread 694999 - https://developer.apple.com/forums/thread/694999 - user report of location prompt not opening correctly in standalone PWA on iPhone; useful as supporting evidence, but it is forum content and still requires physical-device validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native browser APIs plus existing repo dependencies are sufficient; no package choice ambiguity remains.
- Architecture: MEDIUM - The architecture is clear, but exact iPhone installed-PWA prompt behavior still requires physical validation.
- Pitfalls: HIGH - The main risks are backed by current WebKit bugs, WebKit docs, and direct repo inspection.

**Research date:** 2026-03-29
**Valid until:** 2026-04-05
