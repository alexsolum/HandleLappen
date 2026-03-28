# Pitfalls Research

**Domain:** Location-aware features in an existing PWA grocery app (geolocation, geofencing, home-location privacy)
**Researched:** 2026-03-28
**Confidence:** HIGH (iOS Safari standalone geolocation prompt bug confirmed via Apple Developer Forums thread/694999 and WebKit bug tracker; navigator.permissions inconsistency confirmed via multiple Apple Developer Forums threads; battery drain patterns from MDN and Metova engineering; geofence accuracy from Radar.com engineering blog; GDPR location data requirements from GDPR Local 2025 and web.dev permissions guidance)

---

## Critical Pitfalls

### Pitfall 1: iOS Safari Standalone Mode Swallows the Geolocation Permission Prompt

**What goes wrong:**
When HandleAppen is installed to the iOS home screen (standalone PWA, display mode: standalone) and calls `navigator.geolocation.getCurrentPosition()`, the system location permission dialog either does not appear at all, or appears in the Safari browser process — not in the standalone shell. The user never sees the prompt. The request silently fails with a `PERMISSION_DENIED` error. Shopping mode never activates. The feature looks completely broken on the most important target device.

**Why it happens:**
WebKit's standalone PWA context runs in a separate process from Safari. The system location permission alert is directed at the Safari process, not the standalone shell. This is a documented WebKit issue (Apple Developer Forums thread/694999: "Location Alert does not open in PWA") that affects standalone display mode specifically. Browser mode and minimal-ui do not have this problem. Developers who only test in Safari's URL bar never reproduce it.

**How to avoid:**
- Always test geolocation on a physical iPhone with the app installed to the home screen — not just accessed via Safari URL bar.
- Trigger the native request only from a user gesture (button tap), never on page load. Show a pre-permission explainer card first: "HandleAppen needs your location to detect which store you are in. Tap below to enable." The gesture context gives the dialog the best chance of surfacing in the correct process.
- Implement a complete fallback for `PERMISSION_DENIED` (error code 1): show a "Select store manually" store picker. The feature must be fully usable without GPS.
- After permission is granted or denied, do not rely on `navigator.permissions.query({name: 'geolocation'})` to verify the state on iOS — it returns incorrect values (see warning signs below). Use try/catch around `getCurrentPosition` instead.

**Warning signs:**
- Geolocation works in Safari browser mode but fails immediately when the app is opened from the home screen.
- Error code is `PERMISSION_DENIED` (code 1) even though no dialog was shown.
- `navigator.permissions.query({name: 'geolocation'})` returns `"prompt"` even after the user has previously granted or denied in iOS Settings — this is the documented iOS Safari bug where the Permissions API does not reflect the actual system setting.
- Testing only in the iOS Simulator (which does not replicate standalone PWA permission behavior accurately).

**Phase to address:**
Location detection foundation — the geolocation acquisition and fallback must be verified on a physical iPhone before any dependent features (shopping mode activation, history recording) are built on top of it.

---

### Pitfall 2: Continuous `watchPosition` Drains Battery During Every Shopping Trip

**What goes wrong:**
Using `navigator.geolocation.watchPosition()` with `enableHighAccuracy: true` and no update-rate control runs the GPS chip continuously. On a modern iPhone this drains approximately 15–25% battery per hour. A family member with the app open during a 45-minute shopping session loses noticeable battery. Users associate the drain with "that grocery app" and either stop using the feature or stop keeping the app open — both defeat the purpose of location-aware shopping mode.

**Why it happens:**
`watchPosition` is the obvious tool for proximity detection. Developers add `enableHighAccuracy: true` because the geofence is 100–200m and precision seems important. The result is a continuous GPS radio wake even when the user has not moved 10 meters in the last minute. The grocery use case does not need sub-second updates — it only needs to confirm entry and exit of a store zone once per trip.

**How to avoid:**
Use interval polling with `getCurrentPosition` rather than a persistent `watchPosition` watcher:
- Poll every 30–60 seconds while the page is visible using `setInterval` + `getCurrentPosition`.
- Use `enableHighAccuracy: false` for background polling. Wi-Fi/cell triangulation accuracy (15–50m) is sufficient to detect proximity to a 200m geofence.
- Only switch to `enableHighAccuracy: true` for a single confirmation call when the polling result suggests the user may be within 250m of a known store (two-phase detection: coarse polling → precise confirmation).
- Stop all location work when `document.visibilityState === 'hidden'` (user switched apps or locked screen). Resume on `visibilitychange` to `'visible'` with an immediate single-shot `getCurrentPosition` to re-establish state.
- Always clean up: call `clearWatch()` if any watcher is used, and `clearInterval()` on component unmount or route change. A leaked watcher or interval continues running silently.

**Warning signs:**
- A persistent `watchPosition` ID is assigned to a module-level variable with no corresponding `clearWatch`.
- `enableHighAccuracy: true` is applied unconditionally at initialization rather than conditionally for close-range confirmation.
- No `visibilitychange` listener pausing location work when the page is hidden.
- No battery test step in the phase verification checklist.

**Phase to address:**
Location detection foundation — establish the two-phase polling pattern (coarse + precise confirmation) before any UI reacts to location state. Include a 30-minute battery benchmark on a real device in the phase acceptance criteria.

---

### Pitfall 3: 100m Geofence Is Too Small for Urban GPS Accuracy

**What goes wrong:**
The PROJECT.md specifies a 100m geofence radius for store detection. In urban Norway (Oslo, suburban high-rise clusters), GPS accuracy on a phone degrades to 15–50m under good outdoor conditions and 50–150m inside or near covered buildings, parking structures, and dense blocks. With a 100m geofence and 50–100m GPS error, shopping mode either triggers 100m before the store entrance (false early activation) or fails to trigger at all when the user is already inside (missed detection). Both experiences destroy trust in the feature.

**Why it happens:**
100m was chosen conceptually. Urban GPS multipath interference — signal bouncing off building facades before reaching the antenna — is a well-documented accuracy degrader. The effective reliable detection radius is `geofence_radius - GPS_error_margin`. With a 100m fence and up to 100m error, the reliable detection band collapses to near zero.

**How to avoid:**
- Use a 150–200m geofence radius for automatic detection. Norwegian supermarkets in a retail cluster (e.g., a Rema 1000 next to a Kiwi) are typically 200–400m apart, so a 200m fence does not create ambiguity between adjacent stores.
- Implement a dwell timer: only confirm shopping mode if the device has been inside the geofence for 90+ consecutive seconds. This eliminates drive-by and walk-past false triggers.
- Check `GeolocationPosition.coords.accuracy` on every position reading. If `accuracy > 100`, treat the reading as too imprecise to make a geofence decision — display a "Locating..." state and retry the next poll cycle. Do not trigger mode changes on low-quality readings.
- Cache the last high-quality position (accuracy < 80m) for up to 90 seconds and use it to supplement low-accuracy readings from the next poll.

**Warning signs:**
- Geofence radius is set to exactly 100m with no accuracy guard.
- Testing was only done in open parking lots or clear outdoor spaces where GPS accuracy is clean.
- Shopping mode activates/deactivates erratically (flickering) during a normal trip.
- No dwell timer logic exists — mode switches on the first position reading inside the fence.

**Phase to address:**
Geofence logic and mode transition — dwell timer and accuracy guard must be part of the core proximity algorithm, not patched on afterward. Test specifically inside and near (but outside) the target store.

---

### Pitfall 4: Storing Home Coordinates as Plain Data Violates Privacy and GDPR

**What goes wrong:**
A `{lat, lng}` pair in a Supabase column is effectively a home address. Under GDPR (applicable in Norway), home location is sensitive personal data requiring explicit purpose disclosure — it cannot be collected without informing the user exactly what it is used for and cannot be repurposed. If RLS is misconfigured, if a shared household query accidentally JOINs the user settings table, or if the coordinates appear in a Supabase Realtime broadcast, it becomes a data exposure incident. Even without a breach, an app that collects home coordinates without a visible deletion path fails the GDPR right to erasure requirement.

**Why it happens:**
Developers treat coordinates as numbers, not addresses. The "set home location once in settings" requirement looks like a simple settings row. Privacy review does not happen until after the schema and queries are already built.

**How to avoid:**
- Apply strict RLS on the `user_settings` (or equivalent) table: `USING (auth.uid() = user_id)`. Users may only read and write their own row. This must be tested explicitly with a second test account.
- Do not expose home coordinates through household-scoped queries. Home location is individual — it must never appear in any query that returns rows for multiple users or the entire household.
- Do not broadcast home coordinates through Supabase Realtime channels. Location is a private setting; it has no reason to propagate to other family members' clients.
- Store coordinates with reduced precision: 4 decimal places (approximately 11m resolution) rather than the full 7-decimal GPS output. This is more than sufficient for a 200m geofence decision but meaningfully reduces the ability to map coordinates back to a street address.
- Add explicit in-app copy: "Your home location is used only to distinguish between shopping and at-home list changes. It is stored only on your account and is never shared with other household members."
- Provide a "Remove home location" control on the same screen as "Set home location." GDPR right to erasure applies. Verify the deletion removes the database row, not just clears a UI field.
- Do not log coordinates in application error tracking (Sentry, etc.) — scrub lat/lng fields from error payloads before they leave the client.

**Warning signs:**
- No RLS policy exists on the table storing home coordinates (Supabase defaults to denying all access without a policy, but policy gaps in complex multi-table queries are easy to introduce).
- Home coordinates are returned by a JOIN in any query that selects household members or shared list data.
- `supabase.channel().on(...)` anywhere in the app includes location fields in its payload.
- There is no UI control to delete home location.
- Privacy copy on the home location setting screen does not explain the specific purpose.

**Phase to address:**
Home location settings — RLS and the deletion control must be in the initial implementation. This is not retrofittable without a data audit; treat it as a foundation requirement.

---

### Pitfall 5: No Offline / No-GPS Fallback Breaks the App During the Exact Moment It Matters

**What goes wrong:**
The app depends on geolocation to determine context (shopping mode vs. at-home mode). When GPS is unavailable — which happens in underground parking structures, covered markets, inside large concrete stores, or when the user has denied permission — the app either shows a blank state, silently defaults to "at home" mode, or worse: treats every check-off as a deletion because the context is unknown. The user loses shopping history for items checked off during the GPS outage.

**Why it happens:**
Geolocation is implemented as a happy-path feature. The `POSITION_UNAVAILABLE` (code 2) and `TIMEOUT` (code 3) error cases from the Geolocation API are handled with a generic catch that does nothing visible, leaving the app in an indeterminate context state.

**How to avoid:**
Define a location state machine with four explicit states:
- `unknown` — initial state, no reading yet
- `near-store` — inside a store geofence for the required dwell period
- `at-home` — near home location
- `unavailable` — GPS unavailable or permission denied

In `unavailable` state: show a manual store picker. The user selects which store they are in. This explicit selection must be sufficient to activate shopping mode.

Handle each Geolocation error code separately:
- Code 1 (`PERMISSION_DENIED`): enter `unavailable`, show store picker with an explanation and a link to iOS Settings → HandleAppen → Location.
- Code 2 (`POSITION_UNAVAILABLE`): enter `unavailable`, show store picker with "Can't get location right now — select your store."
- Code 3 (`TIMEOUT`): retry once, then enter `unavailable`.

Once shopping mode is confirmed (either by GPS or manual selection), lock the session context: GPS loss mid-session must not flip the context back to `at-home`. The user's explicit start of a shopping trip (entering a store) is stronger signal than a momentary GPS dropout.

Cache the active store context in `sessionStorage` so a brief signal loss or page navigation within the PWA does not reset it.

**Warning signs:**
- The geolocation error handler is `(err) => console.error(err)` with no UI update.
- No manual store selection UI exists anywhere in the app.
- Check-off behavior differs between "GPS available" and "GPS unavailable" in a way the user cannot control.
- Testing only in environments with reliable outdoor GPS — no in-store or parking structure tests.

**Phase to address:**
Location detection foundation AND shopping mode UI — the state machine must be designed before the UI is built. Manual fallback must ship in the same phase as auto-detection, not deferred.

---

### Pitfall 6: iOS Stops Location Updates When the Screen Locks or the App Is Backgrounded

**What goes wrong:**
iOS suspends PWA processes when the user locks the screen or switches to another app. On resumption, a `watchPosition` subscription silently stops delivering updates (confirmed in iOS 14+ Cordova geolocation bug reports; behavior persists in iOS 17+). The app resumes showing the last known location state, which may be 10+ minutes stale — displaying "Shopping at Rema 1000" when the user has long since returned home, causing items checked off at home to be misclassified as shopping history.

**Why it happens:**
iOS does not grant PWAs the background location entitlement available to native apps. When the PWA is suspended, the `watchPosition` subscription is frozen and does not recover automatically on resume. Developers test in the foreground and never notice the issue.

**How to avoid:**
- Register a `visibilitychange` listener. On `hidden`: clear all watchers and intervals. On `visible`: restart location polling from scratch and immediately call `getCurrentPosition` (single shot) to get a fresh fix.
- During the re-acquisition period after becoming visible, display a "Checking location..." indicator rather than showing a potentially stale mode state.
- Apply a maximum staleness threshold: if the last confirmed location fix is older than 3 minutes when the app becomes visible, force the state to `unknown` and re-evaluate — do not continue displaying a stale "shopping mode" from before the screen lock.

**Warning signs:**
- No `visibilitychange` listener in the location service module.
- The shopping mode banner shows a store name after returning from a 10-minute background period without any re-check.
- Testing only covers the foreground use case with no lock/unlock or app-switch test cases.

**Phase to address:**
Location detection foundation — the visibility lifecycle must be part of the initial location service design. Add a test case: lock phone for 5 minutes, unlock, verify state is re-evaluated rather than carried forward stale.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `enableHighAccuracy: true` always on | Simpler code, single code path | 15–25% extra battery drain per hour of use; users notice and blame the app | Never for persistent polling; acceptable only for a single one-shot confirmation when already within 250m of a store |
| Storing full 7-decimal GPS coordinates for home location | No precision loss | Home address is effectively recoverable; higher GDPR risk; unnecessary precision for a 200m geofence | Never — truncate to 4 decimal places |
| Single persistent `watchPosition` watcher for all location needs | Simple mental model | Stops delivering updates on iOS screen lock; no control over update rate; cannot be paused during background | Never — use interval-based `getCurrentPosition` polling with visibility gating |
| Skipping manual store selection fallback | Faster initial implementation | App is completely non-functional for users who deny location, have poor GPS signal, or shop in covered stores | Never — manual fallback must ship alongside auto-detection |
| Requesting location permission on app load | One fewer interaction step | 40% lower permission grant rate (documented); may not surface the dialog on iOS standalone mode (confirmed bug) | Never — always gate behind a user gesture and an explainer |
| Using `navigator.permissions.query` to detect iOS location state | Works correctly on Android Chrome | Returns incorrect state on iOS Safari — always "prompt" regardless of actual system setting | Never rely on it for iOS logic; use try/catch around `getCurrentPosition` as the authoritative check |
| Recording GPS coordinates in application error tracking | Easier debugging of location issues | Home or current coordinates leak into external log retention (Sentry, etc.) | Never — scrub coordinates from all error payloads |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Geolocation API on iOS Safari standalone | Calling `getCurrentPosition` on page load or component mount | Gate behind a button tap after showing an explainer; show manual store selection as the primary option for users who deny |
| Geolocation error codes | Single generic error handler for all failures | Handle code 1 (permission denied), code 2 (position unavailable), and code 3 (timeout) separately — each requires a different UX response |
| Supabase RLS on home location table | Creating `user_settings` without an explicit policy (Supabase new tables default to no access — but gaps in multi-table JOIN queries are easy to create) | Explicitly write and test `USING (auth.uid() = user_id)` — verify it blocks cross-user reads with a second test account |
| Supabase Realtime with location data | Including `home_lat`/`home_lng` fields in realtime broadcast payloads | Never broadcast location data through realtime channels; location is a private per-user setting, not a household-shared value |
| `visibilitychange` and watcher restart on iOS | Calling `watchPosition` again on `visibilitychange` without clearing the previous watcher | Always call `clearWatch()` on the previous ID before starting a new watcher; stacking watchers multiplies battery drain and callback frequency |
| Geofence check on position update | Running proximity check for all saved stores on every GPS reading | Debounce: only re-run proximity checks if the user moved more than 20m since the last check; cache store distances between significant movements |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Continuous `watchPosition` with high accuracy | Noticeable battery drain during a 30-minute trip; device gets warm | Interval-based polling at 30–60s, `enableHighAccuracy: false` for polling, high accuracy only for the close-range confirmation | Immediately — any user who keeps the app open while shopping |
| Re-requesting position on every Supabase Realtime event or list re-render | Excessive GPS requests; OS may throttle after repeated rapid calls | Memoize last position; request only on timer tick or explicit user navigation — never on data events | As soon as list has reactive Realtime updates |
| Writing location state changes to Supabase on every GPS tick | Rapid write volume; Supabase billing impact; write contention | Only write on state transitions (entered store, left store, session ended) — not on every position update | At family scale, billing risk is low but correctness of state transitions is a real concern |
| Running proximity check against all stores on every position update | CPU overhead, battery drain from repeated comparisons | Cache store positions; only re-evaluate stores within a 2km bounding box of current position | Not critical with 3–5 stores; becomes measurable with 15+ stores |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No RLS on home location column/table | Any authenticated user in the household can read any other user's home address via a query | Scope RLS strictly to `auth.uid() = user_id`; home location is individual, never household-shared |
| Returning home coordinates in household or shared list queries | A JOIN that touches user settings accidentally exposes home coordinates to all household members | Keep home location in a table separate from household-scoped data; never JOIN it into household queries |
| Logging GPS coordinates in error tracking | Home or current location leaks into Sentry/external log retention with long data lifetimes | Scrub lat/lng fields from all error payloads before sending to external services |
| Trusting client-provided location context for history classification | Client reports `context: "near_store"` and server records shopping history without verifying | Location context classification must be computed server-side from coordinates or the server must verify the claimed context matches stored store coordinates — do not trust raw client-asserted proximity |
| Broadcasting location in Supabase Realtime events | Home or current location propagates to all household members' connected clients | Never include location fields in Realtime channel payloads; they are personal data |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Permission prompt with no context ("Allow HandleAppen to use your location?") | 40% lower grant rate; users confused why a grocery list app needs location | Show an explainer card first: "We use your location to detect which store you're in and sort your list by the store layout. We never track your movements." |
| Immediate mode switch with no transition feedback | Shopping mode banner appears/disappears unexpectedly while browsing items | Show a brief "Detected: Rema 1000 — entering shopping mode" toast before switching; include a "Wrong store?" tap target |
| No manual store override in shopping mode | User is at Meny but GPS places them in the adjacent Rema 1000 — list sorts for wrong store | Always show a "Wrong store?" / "Change store" tap target in the shopping mode banner |
| Home location setting buried in settings with no onboarding prompt | Users never find it; the at-home vs. shopping distinction never works | Add a contextual prompt after the user first checks off an item: "Set your home location so we know when you're managing your list at home vs. actually shopping" |
| No feedback when location is unavailable | User doesn't know why shopping mode never activated | Show an explicit "Location unavailable" state with a manual store selection option and a link to iOS Settings |
| Check-off context resetting on GPS dropout mid-session | User loses shopping history for items checked off during brief GPS loss | Lock session context once shopping mode activates; GPS dropout mid-session must not flip context back to "at home" |
| Asking for location permission before the user has seen any value from the app | User denies; once denied on iOS it requires going to Settings to re-grant | Show the location prompt only after the user opens a shopping list, so they can see the benefit it would provide |

---

## "Looks Done But Isn't" Checklist

- [ ] **Geolocation on iOS standalone:** Tested on a physical iPhone with the app installed to the home screen — the permission prompt must visibly appear on device (not just in Safari browser mode).
- [ ] **Permission denied path:** Tested by disabling location for HandleAppen in iOS Settings → Privacy → Location Services — the app must show a manual store picker with instructions, not a broken or blank state.
- [ ] **Battery benchmark:** App open and polling for 30 minutes on a real device — battery consumption must be less than 8% (comparable to passive navigation apps at low-frequency polling).
- [ ] **Visibility lifecycle:** App backgrounded for 5 minutes then foregrounded — location state must re-check and update rather than display the pre-background state.
- [ ] **Dwell timer:** A drive-by simulation (approach geofence, then leave within 60 seconds) must not trigger shopping mode.
- [ ] **GPS accuracy guard:** When `coords.accuracy > 100`, no geofence decision is made — verify by mocking a low-accuracy position response.
- [ ] **Home location RLS:** A second test account in the same household must receive no rows (not masked rows — zero rows) when querying the first account's home location via any Supabase client query.
- [ ] **Home location deletion:** "Remove home location" must delete the database row — verify in Supabase dashboard, not just that the UI field clears.
- [ ] **Coordinates precision:** Home coordinates stored in the database are truncated to 4 decimal places — verify the stored value directly in Supabase.
- [ ] **Check-off context in GPS-unavailable state:** Check-offs made after manually selecting a store (no GPS) must record as shopping history, not deletions.
- [ ] **Mid-session GPS dropout:** Disable airplane mode mid-shopping session — active shopping mode must remain active for at least 3 minutes before entering an unavailable state, and must not immediately reclassify subsequent check-offs as deletions.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| iOS permission prompt silently fails — users report feature doesn't work | MEDIUM | Ship a "Select store manually" path as the primary interaction, with auto-detection as an enhancement; add in-app instructions linking to iOS Settings → HandleAppen → Location; this is a UX fix, not an architecture change |
| Battery drain complaints after release | MEDIUM | Switch from `watchPosition` to interval-based polling via a configuration flag; deploy as a PWA update (no reinstall required); immediately reduces battery impact |
| Home location data exposed in a query bug | HIGH | Audit all Supabase queries that touch the settings table; remove any cross-user exposure; rotate or anonymize exposed coordinates; notify affected users per GDPR requirements; add encryption via Supabase Vault going forward |
| Geofence triggering wrong store in an urban cluster | LOW | Increase geofence radius to 200–250m and increase dwell time to 120s — both are configuration values, no structural rework needed; deploy without user-visible change |
| Shopping history incorrectly recorded as deletions due to GPS dropout mid-session | MEDIUM | Backfill is not possible without the shopping event data; fix session context locking in next release; document the affected timeframe for users who notice missing history |
| `navigator.permissions` returning wrong state causes permission re-request loops | LOW | Replace all `navigator.permissions.query` checks for geolocation with try/catch around `getCurrentPosition`; this is a localized code change |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| iOS standalone permission prompt failure | Location detection foundation | Manual test on physical iPhone: install to home screen, open app, tap "Enable location" — confirm dialog appears in the PWA window |
| Battery drain from continuous watching | Location detection foundation | 30-minute battery benchmark on real device; drain must be < 8% |
| Geofence too small / no accuracy guard | Geofence logic and dwell timer | Field test: stand at store entrance, measure activation distance; drive-by simulation must not trigger mode |
| Home location privacy / GDPR | Home location settings | RLS cross-user test with second account; confirm deletion removes DB row; confirm coordinates are 4-decimal precision |
| No offline/GPS fallback | Location detection foundation + Shopping mode UI | Disable GPS mid-session; verify manual store picker appears; verify check-offs record as history when a store is manually selected |
| iOS watchPosition stops after screen lock | Location detection foundation | Lock phone for 5 minutes, unlock, verify location state is re-evaluated and mode updates correctly |
| Permission UX — explain before asking | Location settings / onboarding | New-install test with no prior permission: confirm explainer card appears before native dialog; confirm manual alternative is offered if permission is denied |
| Mid-session GPS dropout reclassifying check-offs | Geofence logic / session context | Airplane mode mid-session: confirm shopping mode persists for grace period; confirm check-offs remain classified as history |

---

## Sources

- Apple Developer Forums thread/694999 — "Location Alert does not open in PWA": documented WebKit bug where geolocation prompt targets Safari process in standalone mode
- Apple Developer Forums thread/751189 — "HTML Geolocation API does not work": `navigator.permissions` returns incorrect state on iOS Safari
- [MagicBell — PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide): geolocation partially works, needs permission each session, less reliable than Android
- [MDN — Geolocation.watchPosition()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition): battery implications of continuous watching, `clearWatch` requirement
- [Metova — Geolocation without battery drain](https://metova.com/how-to-implement-geolocation-without-draining-your-users-battery/): interval-based `getCurrentPosition` pattern vs. continuous watching
- [Radar.com — How accurate is geofencing?](https://radar.com/blog/how-accurate-is-geofencing): urban GPS accuracy 5–50m, multipath interference, dwell time recommendations for reducing false triggers
- [web.dev — Permissions best practices](https://web.dev/articles/permissions-best-practices): explain-before-asking pattern, user gesture requirement
- [Chrome for Developers / Lighthouse](https://developer.chrome.com/docs/lighthouse/best-practices/geolocation-on-start): geolocation on page load is a Lighthouse best-practices violation
- [GDPR Local — GDPR compliance for apps 2025](https://gdprlocal.com/gdpr-compliance-for-apps/): location data as personal data, explicit purpose disclosure, right to erasure
- [Supabase Docs — Securing your data](https://supabase.com/docs/guides/database/secure-data): RLS patterns for sensitive data
- [Supabase Vault](https://supabase.com/docs/guides/database/vault): application-level encryption for sensitive fields
- WebKit Bug 268643: iOS 17.4 EU PWA regression (standalone PWAs forced to open in Safari in EU)
- Cordova geolocation plugin issue #224: iOS 14+ `watchPosition` stops after app suspend/resume cycle
- Ionic Forum — "PWA Geolocation watchPosition pauses": confirms watchPosition unreliability in backgrounded PWA on iOS

---
*Pitfalls research for: Location-aware shopping mode — HandleAppen PWA (Milestone v2.2)*
*Researched: 2026-03-28*
