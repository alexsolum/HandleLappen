# Phase 25: Shopping Mode - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Geofence dwell engine, branded banner, store layout auto-selection, store-attributed check-off history recording, and user dismiss control. The user is automatically placed in shopping mode after dwelling within 150m of a store for 90 seconds. Shopping mode shows a chain-branded banner at the top of the list view, auto-applies the store's category layout, and tags check-offs with the store's ID. The user can exit via a dismiss control or by walking away. This phase does not add home location behavior (Phase 26) or any new store data management.

</domain>

<decisions>
## Implementation Decisions

### Dwell timer logic
- 90-second dwell required before shopping mode activates (per SHOP-01)
- Brief gaps up to 30 seconds outside the 150m geofence do not reset the countdown — handles GPS jitter and walking to the store entrance
- Gaps longer than 30 seconds reset the dwell counter to zero
- Dwell timer state extends the existing `locationSession` in `src/lib/location/session.svelte.ts` — no separate store
- Silent activation: no visual countdown or loading indicator during the 90s window; the banner appears when mode activates

### Banner design
- Positioned at the top of the list page content, above the store picker area and list items — not sticky (scrolls with content)
- Shows store name (composed display name, e.g., "Rema 1000 Teie") on a chain-colored background
- No label ("Handletur aktiv"), no distance display — name + color is sufficient
- Dismiss control: plain X icon on the right side of the banner
- Text and icon color uses auto-contrast per chain:
  - White text: Rema 1000 (#003087), Kiwi (#00843D), Meny (#E4002B), Coop Mega (#003087), Coop Prix (#E4002B), Spar (#007A3D), Bunnpris (#E85D04)
  - Black text: Coop Extra (#FFD100), Joker (#FFD100) — yellow backgrounds need dark text

### Mode lifecycle
- Dismissed means off for the entire in-app session — once the user taps X, shopping mode will not re-activate even if they re-enter the geofence during that session
- No persistence across app close/reopen — shopping mode is ephemeral session state; a fresh dwell countdown starts on every app open
- Auto-exit: if location polling detects the user is outside 150m for ~2 minutes (approximately 2 consecutive polls at 60s intervals), shopping mode exits automatically — resets layout and shows picker again
- Auto-exit and dismiss behave identically from a state perspective

### Picker + layout behavior
- The manual store picker is hidden while shopping mode is active — the banner replaces it as the store context indicator
- When shopping mode activates, the detected store's layout overrides any prior manual selection without prompting the user
- When shopping mode exits (dismiss or auto-exit), the layout resets to default (no store selected) and the manual store picker becomes visible again

### History recording (CHKOFF-01)
- Check-offs already pass `storeId` and `storeName` to `item_history` via `historyContext` in the list page
- Phase 25 gates this: `historyContext` should only include store context when shopping mode is active — not just when `selectedStoreId` is set from detection
- When shopping mode is inactive (picker-only selection), check-offs continue to record store name as before (user-selected store context is fine to record)

### Claude's Discretion
- Exact Norwegian text for any screen-reader or aria labels on the banner
- Banner height, padding, and typography details
- Exact condition for the Bunnpris orange (#E85D04) — auto-contrast calculation or hardcoded to white
- Implementation of the gap-tolerance logic (timestamp comparison vs poll-count tracking)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 25 goal and success criteria (SHOP-01 through SHOP-04, CHKOFF-01 with precise 90s/150m values)
- `.planning/REQUIREMENTS.md` — SHOP-01, SHOP-02, SHOP-03, SHOP-04, CHKOFF-01 requirement definitions

### Project constraints
- `.planning/PROJECT.md` — v2.2 milestone intent, mobile/PWA constraints, chain color spec (Rema 1000 blue, Kiwi green, Meny red, Coop Extra yellow/red)

### Prior locked decisions
- `.planning/phases/24-location-detection-foundation/24-CONTEXT.md` — location session architecture, polling cadence (60s normal / 12s retry), `detectedStoreId` state, foreground-only constraint, manual picker as permanent fallback
- `.planning/phases/23-store-location-foundation/23-CONTEXT.md` — chain list, CHAIN_COLORS, composed display name pattern, 150m detection radius

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/location/session.svelte.ts`: `locationSession` store — extend with `shoppingModeActive: boolean`, `dwellStartedAt: number | null`, `dwellLastInRangeAt: number | null`; this is where dwell logic and mode activation should live
- `src/lib/location/proximity.ts`: `STORE_DETECTION_RADIUS_METERS = 150` and `findNearestDetectedStore()` already handle the haversine math; Phase 25 adds time-based logic on top
- `src/lib/utils/stores.ts`: `CHAIN_COLORS` already maps all chains to hex colors; `storeDisplayName()` composes the display name — both ready to use for the banner
- `src/routes/(protected)/lister/[id]/+page.svelte`: `selectedStoreId` state, `StoreSelector` component, and `checkOffMutation` with `historyContext` are all the integration points for shopping mode activation, layout, and history

### Established Patterns
- `src/lib/location/session.svelte.ts`: Module-level state with visibility listener — extend the existing module rather than creating a new one
- `src/lib/stores/offline.svelte.ts`: Pattern for global client-side state with `visibilitychange` — confirms the session approach
- `src/routes/(protected)/lister/[id]/+page.svelte`: The existing `$effect` that watches `locationSession.detectedStoreId` (lines ~168-171) is where dwell-based shopping mode activation should be wired

### Integration Points
- `locationSession.detectedStoreId` → becomes the input to the dwell engine; `locationSession.shoppingModeActive` → becomes the output that drives banner visibility and picker hide/show
- `selectedStoreId` in list page → set to detected store when shopping mode activates, reset to null on exit
- `historyContext` in `checkOffMutation.mutate(...)` → store context should be gated on `locationSession.shoppingModeActive`, not just on `selectedStoreId`
- `StoreSelector.svelte` in list page → conditionally hidden (or replaced) when shopping mode banner is showing

</code_context>

<specifics>
## Specific Ideas

- The banner replaces the store picker visually — when mode is active, the banner is the store identity, not the picker
- Dismissed = off for the session is the intentional design: the user explicitly said "not now", so the app should not keep trying to re-engage them
- Auto-exit at ~2 minutes prevents the layout from staying in "Rema 1000 Teie mode" if the user leaves the store and opens a different list later in the day

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-shopping-mode*
*Context gathered: 2026-03-29*
