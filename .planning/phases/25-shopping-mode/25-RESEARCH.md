# Phase 25: Shopping Mode - Research

**Researched:** 2026-03-29
**Domain:** Svelte 5 runes state extension, dwell-timer logic, branded UI banner, history-context gating
**Confidence:** HIGH

## Summary

Phase 25 builds directly on the location polling engine from Phase 24. All core infrastructure is in place: `locationSession` in `src/lib/location/session.svelte.ts` holds `detectedStoreId`, the `CHAIN_COLORS` map and `storeDisplayName()` utility are ready, and `checkOffMutation` already accepts `historyContext` with `storeId`/`storeName`. The work in this phase is purely additive: extend the session state with dwell fields and a shopping-mode flag, implement the 90-second / 30-second gap-tolerance timer inside the existing module, build a single new `ShoppingModeBanner.svelte` component, and wire three integration points in the list page.

There are no new npm packages, no schema changes, and no new Supabase tables. The dwell engine runs entirely in module-level JS state in `session.svelte.ts`, consistent with the existing pattern. The primary risk areas are (1) the dwell/gap-tolerance timestamp logic being triggered during the 60-second poll gaps, and (2) ensuring shopping mode activates only once per dwell arrival and not on every subsequent poll while already active.

**Primary recommendation:** Extend `locationSession` with three new fields, add dwell logic into `applyDetectedStore`, create `ShoppingModeBanner.svelte`, wire the banner and picker-hide into the list page's existing `$effect` block, and gate `historyContext` on `locationSession.shoppingModeActive`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dwell timer logic:**
- 90-second dwell required before shopping mode activates (per SHOP-01)
- Brief gaps up to 30 seconds outside the 150m geofence do not reset the countdown — handles GPS jitter and walking to the store entrance
- Gaps longer than 30 seconds reset the dwell counter to zero
- Dwell timer state extends the existing `locationSession` in `src/lib/location/session.svelte.ts` — no separate store
- Silent activation: no visual countdown or loading indicator during the 90s window; the banner appears when mode activates

**Banner design:**
- Positioned at the top of the list page content, above the store picker area and list items — not sticky (scrolls with content)
- Shows store name (composed display name, e.g., "Rema 1000 Teie") on a chain-colored background
- No label ("Handletur aktiv"), no distance display — name + color is sufficient
- Dismiss control: plain X icon on the right side of the banner
- Text and icon color uses auto-contrast per chain:
  - White text: Rema 1000 (#003087), Kiwi (#00843D), Meny (#E4002B), Coop Mega (#003087), Coop Prix (#E4002B), Spar (#007A3D), Bunnpris (#E85D04)
  - Black text: Coop Extra (#FFD100), Joker (#FFD100) — yellow backgrounds need dark text

**Mode lifecycle:**
- Dismissed means off for the entire in-app session — once the user taps X, shopping mode will not re-activate even if they re-enter the geofence during that session
- No persistence across app close/reopen — shopping mode is ephemeral session state; a fresh dwell countdown starts on every app open
- Auto-exit: if location polling detects the user is outside 150m for ~2 minutes (approximately 2 consecutive polls at 60s intervals), shopping mode exits automatically — resets layout and shows picker again
- Auto-exit and dismiss behave identically from a state perspective

**Picker + layout behavior:**
- The manual store picker is hidden while shopping mode is active — the banner replaces it as the store context indicator
- When shopping mode activates, the detected store's layout overrides any prior manual selection without prompting the user
- When shopping mode exits (dismiss or auto-exit), the layout resets to default (no store selected) and the manual store picker becomes visible again

**History recording (CHKOFF-01):**
- Check-offs already pass `storeId` and `storeName` to `item_history` via `historyContext` in the list page
- Phase 25 gates this: `historyContext` should only include store context when shopping mode is active — not just when `selectedStoreId` is set from detection
- When shopping mode is inactive (picker-only selection), check-offs continue to record store name as before (user-selected store context is fine to record)

### Claude's Discretion
- Exact Norwegian text for any screen-reader or aria labels on the banner
- Banner height, padding, and typography details
- Exact condition for the Bunnpris orange (#E85D04) — auto-contrast calculation or hardcoded to white
- Implementation of the gap-tolerance logic (timestamp comparison vs poll-count tracking)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHOP-01 | App enters shopping mode automatically when within 150m of a saved store for at least 90 seconds | Dwell timer logic in `applyDetectedStore`; `dwellStartedAt` + `dwellLastInRangeAt` timestamps in `locationSession`; polling cadence provides natural checkpoints |
| SHOP-02 | Shopping mode displays a branded banner with store name and chain-specific colors | `CHAIN_COLORS` and `storeDisplayName()` already exist; new `ShoppingModeBanner.svelte` component reads these and uses inline `style` for background color |
| SHOP-03 | Shopping mode auto-selects the detected store's category layout for list sorting | `selectedStoreId` is already the lever; set it to `detectedStoreId` when shopping mode activates — same code path as Phase 24's auto-detection effect |
| SHOP-04 | User can dismiss shopping mode manually via a close control on the banner | Dismiss sets `shoppingModeActive = false` and `dismissedForSession = true` (module-level flag); resets `selectedStoreId` to null; shows picker again |
| CHKOFF-01 | Items checked off while in shopping mode are recorded in shopping history with the detected store context | `historyContext` in `handleGroupToggle`/`handleUncheck` — gate `storeId`/`storeName` on `locationSession.shoppingModeActive` instead of just truthy `selectedStoreId` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte 5 runes (`$state`, `$derived`, `$effect`) | Already installed | Module-level reactive state for dwell engine and banner visibility | Established pattern: `locationSession` itself uses `$state` at module scope |
| TanStack Query (svelte-query) | Already installed | `checkOffMutation` with `historyContext` — no changes to the query layer itself | Existing mutation pattern; only the call-site argument changes |
| Tailwind CSS | Already installed | Banner styling with inline override for chain color | All UI uses Tailwind; chain color is set via `style` attribute, not a class |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `CHAIN_COLORS` (existing) | src/lib/utils/stores.ts | Maps chain name to hex background color | Used in `ShoppingModeBanner.svelte` to set `background-color` inline |
| `storeDisplayName()` (existing) | src/lib/utils/stores.ts | Compose "Rema 1000 Teie" from chain + location_name | Used in banner to render store identity |
| `STORE_DETECTION_RADIUS_METERS` (existing) | src/lib/location/proximity.ts | 150m constant — already used in proximity detection | No change needed; dwell logic refers to it conceptually |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Timestamp comparison for gap-tolerance | Poll-count tracking | Timestamps are more accurate when poll intervals drift; poll-count is simpler. Timestamps chosen per Claude's discretion guidance |
| Inline `style` for chain color | Dynamic Tailwind class | Tailwind does not support fully dynamic arbitrary hex values at runtime; `style` attribute is the correct approach for programmatic colors |
| Module-level `dismissedForSession` flag | Extra field on `locationSession` | A plain module-level `let` variable keeps session state out of reactive state (no reactive subscribers need this); avoids spurious re-renders |

**Installation:** No new packages required.

---

## Architecture Patterns

### Session State Extension

The existing `locationSession` object is extended with three new fields. These are the input/output for the dwell engine:

```typescript
// src/lib/location/session.svelte.ts — additions only
export const locationSession = $state({
  // ... existing fields ...
  shoppingModeActive: false,
  dwellStartedAt: null as number | null,
  dwellLastInRangeAt: null as number | null,
})
```

A module-level boolean (not on `locationSession`) tracks dismiss state to avoid reactive noise:

```typescript
let dismissedForSession = false
```

### Dwell Engine Logic

`applyDetectedStore` is the single place where proximity results land. Dwell logic is inserted here:

```typescript
function applyDetectedStore(sample: LocationSample) {
  locationSession.lastSample = sample
  locationSession.lastFailure = null

  const nearestStore = findNearestDetectedStore(activeStores, sample)
  const detectedId = nearestStore?.store.id ?? null

  locationSession.detectedStoreId = detectedId

  const now = Date.now()

  if (detectedId === null) {
    // User is outside 150m
    if (locationSession.dwellLastInRangeAt !== null) {
      const gapMs = now - locationSession.dwellLastInRangeAt
      if (gapMs > 30_000) {
        // Gap too long — reset dwell counter
        locationSession.dwellStartedAt = null
        locationSession.dwellLastInRangeAt = null
      }
      // else: gap within 30s tolerance — leave dwellStartedAt intact
    }

    // Auto-exit if shopping mode is active and gap exceeds ~2 min
    if (locationSession.shoppingModeActive) {
      const outMs = locationSession.dwellLastInRangeAt !== null
        ? now - locationSession.dwellLastInRangeAt
        : Infinity
      if (outMs >= 120_000) {
        exitShoppingMode()
      }
    }
    return
  }

  // User is within 150m
  if (locationSession.shoppingModeActive) {
    // Already in shopping mode — just update last-in-range timestamp
    locationSession.dwellLastInRangeAt = now
    return
  }

  if (dismissedForSession) {
    // User dismissed — do not re-activate
    return
  }

  // Start or continue dwell countdown
  if (locationSession.dwellStartedAt === null) {
    locationSession.dwellStartedAt = now
  }
  locationSession.dwellLastInRangeAt = now

  const dwellMs = now - locationSession.dwellStartedAt
  if (dwellMs >= 90_000) {
    activateShoppingMode(detectedId)
  }
}

function activateShoppingMode(storeId: string) {
  locationSession.shoppingModeActive = true
  // List page reacts via $effect watching shoppingModeActive
}

function exitShoppingMode() {
  locationSession.shoppingModeActive = false
  locationSession.dwellStartedAt = null
  locationSession.dwellLastInRangeAt = null
  // List page reacts via $effect — resets selectedStoreId to null
}

export function dismissShoppingMode(): void {
  dismissedForSession = true
  exitShoppingMode()
}
```

### Recommended Project Structure

No new directories needed. New files:

```
src/
├── lib/
│   ├── location/
│   │   └── session.svelte.ts      # MODIFIED: dwell fields + dwell logic
│   └── components/
│       └── stores/
│           └── ShoppingModeBanner.svelte   # NEW: branded banner component
└── routes/(protected)/lister/[id]/
    └── +page.svelte               # MODIFIED: banner integration, picker hide, historyContext gate
```

### ShoppingModeBanner Component

```svelte
<!-- src/lib/components/stores/ShoppingModeBanner.svelte -->
<script lang="ts">
  import { CHAIN_COLORS } from '$lib/utils/stores'

  interface Props {
    storeName: string
    chain: string | null
    onDismiss: () => void
  }

  let { storeName, chain, onDismiss }: Props = $props()

  // Chains with dark backgrounds use white text; yellow chains use black text
  const DARK_TEXT_CHAINS = new Set(['Coop Extra', 'Joker'])

  const bgColor = $derived(chain && CHAIN_COLORS[chain] ? CHAIN_COLORS[chain] : '#374151')
  const textColor = $derived(chain && DARK_TEXT_CHAINS.has(chain) ? '#000000' : '#ffffff')
</script>

{#if storeName}
  <div
    class="flex items-center justify-between rounded-xl px-4 py-3"
    style="background-color: {bgColor}; color: {textColor};"
    role="status"
    aria-label="Handletur aktiv: {storeName}"
  >
    <span class="font-semibold text-sm">{storeName}</span>
    <button
      type="button"
      aria-label="Avslutt handletur"
      onclick={onDismiss}
      style="color: {textColor};"
      class="ml-3 flex-shrink-0 rounded p-1 opacity-80 hover:opacity-100"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}
```

### List Page Integration Points

Three integration points in `+page.svelte`:

**1. Derived value for active store's chain (needed for banner):**
```typescript
const activeShoppingStore = $derived.by(() => {
  if (!locationSession.shoppingModeActive || !locationSession.detectedStoreId) return null
  return storesQuery.data?.find((s) => s.id === locationSession.detectedStoreId) ?? null
})
```

**2. Effect: activate/exit layout when shopping mode changes:**
```typescript
$effect(() => {
  if (locationSession.shoppingModeActive && locationSession.detectedStoreId) {
    selectedStoreId = locationSession.detectedStoreId
  } else if (!locationSession.shoppingModeActive) {
    // Only reset if previously in shopping mode context
    // (do not override a user's manual selection when mode was never active)
    selectedStoreId = null
  }
})
```

Note: The existing `$effect` that watches `detectedStoreId` (lines 166-173) will need careful coordination. When shopping mode is active, that effect should not fight with the shopping mode effect. Solution: gate the existing detected-store effect so it only fires when `!locationSession.shoppingModeActive`.

**3. Template: banner above picker, picker conditionally hidden:**
```svelte
<div class="mb-4 space-y-3">
  {#if locationSession.shoppingModeActive && activeShoppingStore}
    <ShoppingModeBanner
      storeName={storeDisplayName(activeShoppingStore.chain, activeShoppingStore.location_name)}
      chain={activeShoppingStore.chain}
      onDismiss={dismissShoppingMode}
    />
  {:else}
    <LocationPermissionCard ... />
    <StoreSelector ... />
  {/if}
</div>
```

**4. historyContext gate:**
```typescript
// In handleGroupToggle and handleUncheck
historyContext: {
  listName: data.listName,
  storeId: locationSession.shoppingModeActive ? selectedStoreId : (selectedStoreId ?? null),
  storeName: locationSession.shoppingModeActive ? selectedStoreName : (selectedStoreName ?? null),
},
```

Wait — re-reading the CONTEXT.md: "When shopping mode is inactive (picker-only selection), check-offs continue to record store name as before." This means the gating only applies to auto-detected store attribution. Since `selectedStoreId` is always set (either by shopping mode or by manual picker), and `selectedStoreName` is always derived from it, the `historyContext` already records correctly for manual selection. The only change needed is ensuring that when shopping mode deactivates (selectedStoreId reset to null), check-offs do not include store context. This works automatically because `selectedStoreId` becomes null on exit.

Actually the real concern from CONTEXT.md is: during Phase 24, detection sets `selectedStoreId` even without shopping mode active. CHKOFF-01 requires that store attribution in `item_history` happens only when shopping mode is active, not just when proximity detection found a store. So the gate is: `storeId: locationSession.shoppingModeActive ? selectedStoreId : null` — but this would remove manual-picker attribution. Re-reading: "When shopping mode is inactive (picker-only selection), check-offs continue to record store name as before." So picker-selected stores are fine to record. The distinction is: Phase 24 auto-detection setting selectedStoreId without activating shopping mode should NOT attribute history. Shopping mode activation (Phase 25) SHOULD attribute history.

Resolution: Track a separate `historyStoreId` that is:
- `selectedStoreId` when shopping mode is active (auto-detected store)
- `selectedStoreId` when manually selected (user chose from picker — this is "picker-only selection")
- `locationSession.detectedStoreId` when detection sets selectedStoreId but shopping mode is NOT active → do NOT attribute

The cleanest gate: pass `storeId: locationSession.shoppingModeActive || isManuallySelected ? selectedStoreId : null`. Track manual selection with a separate boolean flag `isManuallySelected` in the page.

### Anti-Patterns to Avoid

- **Resetting `selectedStoreId` to null when the existing Phase-24 detection effect fires while shopping mode is active:** The two `$effect`s (detection effect + shopping mode effect) must not conflict. Merge or guard them.
- **Putting `dismissedForSession` on `locationSession`:** It is not reactive state — no component subscribes to it; keeping it as a plain module variable avoids unnecessary reactive propagation.
- **Auto-exit trigger based on poll count:** GPS polls happen every 60s; counting "2 polls outside radius" would take 2 minutes minimum — correct. But if the user backgrounds and foregrounds the app, a visibility-resume poll happens immediately. Two rapid polls could both return "outside radius" within seconds and prematurely exit shopping mode. Guard: check wall-clock time (`dwellLastInRangeAt` timestamp), not poll count.
- **Re-activating shopping mode after dismiss on every subsequent poll:** `dismissedForSession = true` must block `activateShoppingMode` even if `dwellMs >= 90_000`.
- **Using CSS classes for chain brand color:** Tailwind cannot produce arbitrary hex values dynamically. Use `style="background-color: {bgColor}"` on the banner element.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chain color mapping | Custom color lookup | `CHAIN_COLORS` in `src/lib/utils/stores.ts` | Already defined for all 9 chains + covers edge cases like null/Annet |
| Store display name | String concatenation | `storeDisplayName(chain, locationName)` | Handles the "Annet" chain edge case (no chain prefix) |
| Proximity check in dwell logic | Repeat haversine call | `locationSession.detectedStoreId` being non-null as the in-range signal | Phase 24 already computed proximity; `detectedStoreId !== null` means "within 150m" |

**Key insight:** The dwell engine does NOT need to recompute distance — it simply reads whether `detectedStoreId` is null or non-null after `findNearestDetectedStore` runs. All spatial math is already handled by the existing proximity layer.

---

## Common Pitfalls

### Pitfall 1: Effect Conflict Between Phase 24 Detection and Phase 25 Shopping Mode
**What goes wrong:** The existing `$effect` (lines 166-173 in the list page) sets `selectedStoreId = locationSession.detectedStoreId` whenever detection fires. This runs independently of `shoppingModeActive`. If shopping mode is active but the next poll returns the same detected store, the Phase 24 effect may overwrite `selectedStoreId` unnecessarily. Worse: when shopping mode exits (sets `selectedStoreId = null`), the Phase 24 effect may re-set it to the still-detected store on the next poll.
**Why it happens:** Two `$effect`s watching overlapping state with overlapping write targets.
**How to avoid:** Replace the existing detection effect with a single effect that handles both cases: if shopping mode is active, do nothing (shopping mode owns `selectedStoreId`); else if detection fired and mode is not dismissed, set `selectedStoreId`.
**Warning signs:** `selectedStoreId` pinging back to detected store immediately after dismiss.

### Pitfall 2: Dwell Timer Not Resetting on `stopLocationSession`
**What goes wrong:** If `stopLocationSession()` is called (e.g., on component destroy), the `dismissedForSession` and dwell fields are not reset. On next session start (navigate back to list), dwell state is stale.
**Why it happens:** `stopLocationSession` currently resets `locationSession` fields but `dismissedForSession` is module-level.
**How to avoid:** Call `exitShoppingMode()` inside `stopLocationSession` and reset `dismissedForSession = false`.
**Warning signs:** Shopping mode banner reappears on next list visit without any dwell.

### Pitfall 3: Gap-Tolerance Edge Case During App Backgrounding
**What goes wrong:** User enters geofence, app goes to background (timer paused), returns 45 seconds later (first poll fires). The gap between `dwellLastInRangeAt` and `now` will be the background duration. If > 30 seconds, dwell resets. But the background-return poll fires immediately — if the user was in the store the whole time, this is a false reset.
**Why it happens:** The 60-second poll pauses on background; background time appears as a gap.
**How to avoid:** The visibility-change handler already fires an immediate poll on foreground return. The gap timestamp is wall-clock real, and 30 seconds of background pause is a real gap (the app truly did not confirm the user was in range). This behavior is acceptable — the user simply dwells for another 90 seconds. Document this as known behavior, not a bug.
**Warning signs:** Users report shopping mode not activating after locking phone.

### Pitfall 4: History Context Wrong on Check-off During Manual Picker + Auto-Detection
**What goes wrong:** In Phase 24, detection sets `selectedStoreId` even without shopping mode. If user manually picks "Rema 1000 Teie" and also happens to be in range, `selectedStoreId` = detected store. Without the manual-vs-detected gate, check-offs would attribute to the detected store even without shopping mode active.
**Why it happens:** `selectedStoreId` is the single source of truth for both manual and auto selection.
**How to avoid:** Track `isManuallySelected: boolean` state in the list page. Set it `true` when `StoreSelector.onSelect` fires, set it `false` when shopping mode activates or when the Phase 24 detection effect sets `selectedStoreId`. Gate history: `storeId: (locationSession.shoppingModeActive || isManuallySelected) ? selectedStoreId : null`.
**Warning signs:** `item_history` rows getting `store_id` populated during normal use without shopping mode.

---

## Code Examples

### Dwell State Fields on locationSession

```typescript
// Source: direct extension of existing pattern in src/lib/location/session.svelte.ts
export const locationSession = $state({
  status: 'idle' as LocationSessionStatus,
  detectedStoreId: null as string | null,
  lastFailure: null as LocationFailureKind | null,
  showSettingsHint: false,
  lastSample: null as LocationSample | null,
  // Phase 25 additions:
  shoppingModeActive: false,
  dwellStartedAt: null as number | null,
  dwellLastInRangeAt: null as number | null,
})
```

### Reset in stopLocationSession

```typescript
// src/lib/location/session.svelte.ts
export function stopLocationSession(): void {
  pollingEnabled = false
  clearPollTimer()
  removeVisibilityListener()
  inFlight = false
  deniedCount = 0
  activeStores = []
  dismissedForSession = false           // Phase 25: reset dismiss on session end
  locationSession.status = 'idle'
  locationSession.lastFailure = null
  locationSession.showSettingsHint = false
  locationSession.shoppingModeActive = false  // Phase 25
  locationSession.dwellStartedAt = null       // Phase 25
  locationSession.dwellLastInRangeAt = null   // Phase 25
}
```

### List Page: Banner + Picker Toggle

```svelte
<!-- src/routes/(protected)/lister/[id]/+page.svelte -->
<div class="mb-4 space-y-3">
  {#if locationSession.shoppingModeActive && activeShoppingStore}
    <ShoppingModeBanner
      storeName={storeDisplayName(activeShoppingStore.chain, activeShoppingStore.location_name)}
      chain={activeShoppingStore.chain}
      onDismiss={dismissShoppingMode}
    />
  {:else}
    <LocationPermissionCard
      state={locationSession.status}
      {detectedStoreName}
      showSettingsHint={locationSession.showSettingsHint}
      onStart={beginLocationExplanation}
      onConfirm={() => void confirmAutomaticStore(detectableStores)}
      onCancel={cancelLocationExplanation}
      onRetry={() => void retryLocationDetection(detectableStores)}
    />
    <StoreSelector
      stores={storesQuery.data ?? []}
      {selectedStoreId}
      onSelect={handleManualStoreSelect}
    />
  {/if}
</div>
```

### historyContext Gate Pattern

```typescript
// In handleGroupToggle and handleUncheck
const shouldAttributeStore = locationSession.shoppingModeActive || isManuallySelected
historyContext: {
  listName: data.listName,
  storeId: shouldAttributeStore ? selectedStoreId : null,
  storeName: shouldAttributeStore ? selectedStoreName : null,
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate store for shopping mode state | Extend existing `locationSession` | Phase 25 design decision | Single state object, no cross-store synchronization needed |
| Countdown UI visible during dwell | Silent activation — banner appears when mode activates | Phase 25 design decision | Simpler UX; avoids user anxiety/interference during 90s window |
| Sticky banner that follows scroll | Non-sticky banner above picker, scrolls with content | Phase 25 design decision | Consistent with the existing location permission card placement |

---

## Open Questions

1. **Manual selection attribution gate**
   - What we know: CONTEXT.md says "picker-only selection, check-offs continue to record store name as before"
   - What's unclear: Phase 24 detection also sets `selectedStoreId` without shopping mode — is this "picker-only" or not?
   - Recommendation: Treat Phase-24-detection-only (shopping mode inactive) as NOT attributed. Track `isManuallySelected` flag in page. Only picker-interaction and shopping-mode-active paths set attributed store context.

2. **Effect ordering between Phase 24 detection and Phase 25 shopping mode**
   - What we know: Svelte 5 effects run in dependency order; two effects writing `selectedStoreId` can interfere
   - What's unclear: Exact order in which effects fire after a poll result updates `detectedStoreId` and `shoppingModeActive` in the same tick
   - Recommendation: Consolidate into a single effect that handles all cases: shopping-mode-active, detection-without-mode, and mode-exit. Avoids race.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (already configured) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/shopping-mode.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHOP-01 | Banner appears after 90s dwell within 150m, not before | e2e (time-mocked) | `npx playwright test tests/shopping-mode.spec.ts -g "activates after 90s dwell"` | ❌ Wave 0 |
| SHOP-01 | Gap ≤ 30s outside geofence does not reset dwell | e2e (time-mocked) | `npx playwright test tests/shopping-mode.spec.ts -g "gap tolerance"` | ❌ Wave 0 |
| SHOP-01 | Gap > 30s outside geofence resets dwell | e2e (time-mocked) | `npx playwright test tests/shopping-mode.spec.ts -g "gap resets dwell"` | ❌ Wave 0 |
| SHOP-02 | Banner shows store display name with chain background color | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "banner shows branded"` | ❌ Wave 0 |
| SHOP-02 | Yellow-background chains (Coop Extra, Joker) use black text | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "dark text chains"` | ❌ Wave 0 |
| SHOP-03 | Store picker is hidden when shopping mode is active | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "picker hidden"` | ❌ Wave 0 |
| SHOP-03 | List uses detected store's category layout order when active | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "layout auto-selected"` | ❌ Wave 0 |
| SHOP-04 | Tapping X dismisses banner and restores picker | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "dismiss restores picker"` | ❌ Wave 0 |
| SHOP-04 | Dismissed shopping mode does not re-activate in same session | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "dismissed stays off"` | ❌ Wave 0 |
| SHOP-04 | Auto-exit after ~2 min outside geofence restores picker | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "auto-exit"` | ❌ Wave 0 |
| CHKOFF-01 | Check-off while shopping mode active records store_id in item_history | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "history records store"` | ❌ Wave 0 |
| CHKOFF-01 | Check-off while mode inactive does not record detected-store attribution | e2e | `npx playwright test tests/shopping-mode.spec.ts -g "no attribution without mode"` | ❌ Wave 0 |

### Time-Mock Helper Pattern

Dwell timer tests require advancing `Date.now()` to simulate passage of time without actual 90-second waits. The existing `location.ts` helper establishes the pattern (mock `navigator.geolocation`). A new `advanceDwellTime` helper should mock `Date.now()`:

```typescript
// tests/helpers/location.ts — addition
export async function advanceDwellTime(page: Page, ms: number) {
  await page.evaluate((deltaMs: number) => {
    type MockWindow = Window & { __HANDLEAPPEN_DATE_NOW_OFFSET__?: number }
    const w = window as MockWindow
    w.__HANDLEAPPEN_DATE_NOW_OFFSET__ = (w.__HANDLEAPPEN_DATE_NOW_OFFSET__ ?? 0) + deltaMs
  }, ms)
}
```

The session module must use a `getNow()` wrapper that tests can intercept. Alternatively, use Playwright's `page.clock.setFixedTime()` / `page.clock.tick()` APIs (Playwright 1.45+) which mock `Date.now` natively:

```typescript
// In test
await page.clock.setFixedTime(Date.now())
// ... trigger poll ...
await page.clock.tick(91_000)  // advance 91 seconds
// ... trigger another poll ...
// expect shopping mode banner
```

**Playwright clock API is the recommended approach** — it mocks `Date.now()`, `setTimeout`, and related APIs without patching the app source. Verify Playwright version supports `page.clock` (1.45+).

### Sampling Rate
- **Per task commit:** `npx playwright test tests/shopping-mode.spec.ts --project=chromium`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/shopping-mode.spec.ts` — all SHOP-01 through SHOP-04 and CHKOFF-01 tests
- [ ] `tests/helpers/location.ts` — extend with `GeolocationMockMode` values for shopping mode scenarios (e.g., `'in-store-then-away'`)
- [ ] Verify Playwright version supports `page.clock.tick()` — run `npx playwright --version`

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/lib/location/session.svelte.ts` — exact function signatures, existing state shape, poll orchestration
- Direct code read: `src/lib/location/proximity.ts` — `findNearestDetectedStore`, `STORE_DETECTION_RADIUS_METERS`
- Direct code read: `src/lib/utils/stores.ts` — `CHAIN_COLORS`, `storeDisplayName`, `CHAIN_OPTIONS`
- Direct code read: `src/routes/(protected)/lister/[id]/+page.svelte` — integration points, existing effects, `historyContext` usage
- Direct code read: `src/lib/components/stores/StoreSelector.svelte`, `LocationPermissionCard.svelte`
- Direct code read: `tests/helpers/location.ts`, `tests/helpers/history.ts` — test helper patterns
- Direct code read: `tests/location-detection.spec.ts` — existing Phase 24 test structure

### Secondary (MEDIUM confidence)
- `.planning/phases/24-location-detection-foundation/24-CONTEXT.md` — locked Phase 24 decisions
- `.planning/phases/23-store-location-foundation/23-CONTEXT.md` — chain list and CHAIN_COLORS origin
- `.planning/REQUIREMENTS.md` — SHOP-01..04, CHKOFF-01 requirement text

### Tertiary (LOW confidence)
- Playwright `page.clock` API availability: based on knowledge that Playwright added clock mocking in v1.45 (August 2024); recommend verifying against installed version before planning Wave 0 test scaffold.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries verified by direct code read
- Architecture (dwell engine): HIGH — logic derived directly from existing `applyDetectedStore` pattern and CONTEXT.md locked decisions
- Architecture (banner component): HIGH — `CHAIN_COLORS` and `storeDisplayName` verified by direct code read; `style` attribute approach is the correct pattern for runtime hex colors in Tailwind
- Architecture (historyContext gate): MEDIUM — the manual-vs-detected distinction requires careful `isManuallySelected` tracking; re-reading of CONTEXT.md reveals nuance not fully captured in a single reading
- Pitfalls: HIGH — derived from direct code analysis of effect interaction and `stopLocationSession` gap
- Validation architecture: MEDIUM — Playwright `page.clock` API version assumption needs verification

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable stack; no external APIs)
