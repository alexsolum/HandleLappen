# Phase 24: Location Detection Foundation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable reliable foreground location detection in the PWA so the app can determine the user's current position while the app is open, request geolocation only behind an explicit user action, and keep manual store selection available at all times. This phase establishes permission flow, polling behavior, and recovery UX. It does not add shopping-mode banner behavior, geofence dwell timing, branded in-store UI, or check-off branching.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 24 goal and success criteria, especially battery-safe 30-60 second polling, user-gesture permission requirement, iPhone PWA behavior, and always-available manual picker fallback.
- `.planning/REQUIREMENTS.md` — `LOCATE-01`, `LOCATE-02`, and `LOCATE-03` define the required proximity detection, permission explanation, and manual fallback behavior.
- `.planning/PROJECT.md` — v2.2 milestone intent, mobile/PWA constraints, and compatibility requirement for Mobile Safari and Android Chrome.

### Prior locked decisions
- `.planning/STATE.md` §Accumulated Context — foreground-only polling, pause-on-background/resume-on-foreground, iOS Safari standalone prompt caveat, and the decision that manual store picker ships in Phase 24 as a required fallback.
- `.planning/phases/23-store-location-foundation/23-CONTEXT.md` — store coordinates, chain/location naming, and existing store-management foundation that Phase 24 builds on.
- `.planning/phases/18-ios-scanner-black-screen-fix/18-CONTEXT.md` — existing pattern for permission recovery UX and iOS PWA-specific browser behavior handling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/stores/StoreSelector.svelte`: Existing manual picker UI that should remain always available and can absorb new status/auto-selection context.
- `src/lib/queries/stores.ts`: Stores query already exposes `chain`, `location_name`, `lat`, and `lng`, so Phase 24 can read store coordinates without new data plumbing.
- `src/lib/utils/stores.ts`: Centralized store naming utilities and chain options keep display naming consistent when location detection selects a store.
- `src/lib/components/barcode/BarcodeScannerSheet.svelte` and `src/lib/barcode/scanner.ts`: Existing compact recovery-state pattern for denied vs dismissed permission flows is a strong reference for location UX.

### Established Patterns
- `src/routes/(protected)/lister/[id]/+page.svelte`: The list page already owns `selectedStoreId`, the existing store picker, and the user-facing store-selection flow; this is the correct surface for the Phase 24 permission entry point and fallback UX.
- `src/routes/(protected)/+layout.svelte`: App-wide foreground lifecycle work already happens here (`onMount`, queue drain, online listeners), making it the likely home for shared location session lifecycle.
- `src/lib/stores/offline.svelte.ts`: Existing browser-state store pattern shows how the codebase handles global client-side state plus `visibilitychange`.

### Integration Points
- `selectedStoreId` in `src/routes/(protected)/lister/[id]/+page.svelte` is the immediate target for any successful auto-detection result.
- The current store picker flow is non-blocking and already works without location, which matches the Phase 24 requirement that manual fallback must always remain usable.
- There is no implemented user-settings route yet; `Brukerinnstillinger` is still a stub in `src/routes/(protected)/admin/+page.svelte`, so Phase 24 should not depend on settings-first UX.

</code_context>

<specifics>
## Specific Ideas

- The permission flow should feel like: location CTA on the list page -> confirmation step -> browser permission request.
- The explanation should sell the benefit first: automatic store selection.
- Manual fallback remains visible the whole time and should read `Velg butikk manuelt`.
- Recovery UX should stay lightweight and inline rather than turning Phase 24 into a full shopping-mode surface.

</specifics>

<deferred>
## Deferred Ideas

- Shopping-mode banner, branded in-store UI, and store-arrival presentation belong to Phase 25.
- Dwell timing / geofence confidence rules for entering shopping mode belong to Phase 25.
- Check-off behavior changes based on store/home context belong to Phases 25 and 26.

</deferred>

---

*Phase: 24-location-detection-foundation*
*Context gathered: 2026-03-29*
