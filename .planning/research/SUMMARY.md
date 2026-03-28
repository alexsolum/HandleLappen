# Project Research Summary

**Project:** HandleAppen v2.2 — Location-aware shopping mode
**Domain:** Geolocation and geofencing features for an existing family grocery PWA
**Researched:** 2026-03-28
**Confidence:** HIGH (stack and architecture read directly from codebase and official docs; pitfalls confirmed via Apple Developer Forums, MDN, and GDPR sources)

## Executive Summary

HandleAppen v2.2 adds location-awareness to an already-shipped SvelteKit + Supabase grocery PWA. The feature is well-scoped: detect when a user is physically near a store (100–200m geofence), auto-activate a branded shopping mode, auto-select that store's layout, and adjust check-off behavior so only items bought in-store record shopping history. The implementation is additive — no existing feature is rewritten, and the two new Svelte stores (`location.svelte.ts`, `shopping-mode.svelte.ts`) follow exactly the same `$state` singleton pattern already used for offline detection. The only new package is `leaflet@^1.9.4` for the admin map pin widget.

The recommended approach avoids over-engineering. Geofencing runs client-side via a haversine function (not PostGIS) on store coordinates already in memory, map rendering uses raw Leaflet with a dynamic import inside `onMount` to sidestep SvelteKit SSR, and reverse geocoding calls Nominatim directly via `fetch`. The feature has a clear dependency chain: store coordinates must exist before any proximity detection can work, so admin store-location management ships first and gates everything else.

The primary risks are iOS-specific and battery-related, both well-understood. iOS Safari standalone PWAs have a documented WebKit bug where the geolocation permission prompt may not surface correctly — the mitigation is to always gate the permission call behind a user gesture, show a manual store-picker as the primary fallback, and test exclusively on a physical iPhone installed to the home screen. Battery drain from continuous GPS polling is mitigated by using interval-based `getCurrentPosition` (not persistent `watchPosition`), defaulting to low-accuracy polling, and pausing all location work on `visibilitychange` to hidden. Home location (a GDPR-sensitive field) must have strict RLS and a deletion control in its first implementation — this is not retrofittable.

---

## Key Findings

### Recommended Stack

The v2.2 stack is minimal. The existing SvelteKit 2 / Svelte 5 / Supabase / TanStack Query foundation handles all new needs. All geolocation logic uses the browser's `navigator.geolocation` API directly — no wrapper library. Geofencing runs client-side with a haversine formula, keeping the dependency graph flat and eliminating the PostGIS setup step that STACK.md initially considered. Reverse geocoding uses Nominatim via `fetch`. The only npm addition is Leaflet for the admin map widget.

**Core technologies:**
- `navigator.geolocation` (browser API): proximity polling and geofence detection — no package needed, 15-line implementation, Svelte 5 `$state` singleton
- `leaflet@^1.9.4`: admin store location map widget — no API key, 42 KB, mature SSR workaround via `onMount` dynamic import
- `@types/leaflet` (dev): TypeScript types for Leaflet 1.x — must match 1.x, not 2.x
- Nominatim via `fetch`: reverse geocoding for admin address confirmation — free, no key, 1 req/sec limit never reached in admin flow
- Haversine formula (inline TypeScript): client-side distance calculation — replaces PostGIS dependency; sufficient at household scale

**What to avoid:**
- `svelte-geolocation` wrapper: Svelte 5 compatibility unconfirmed, wraps a trivial API
- `sveaflet` / `svelte-leafletjs`: minimal adoption, adds abstraction without solving SSR
- `leaflet` 2.0-alpha: breaking changes, not production-ready as of March 2026
- PostGIS `ST_DWithin`: requires enabling extension, adds RPC function, no benefit over haversine at 3–10 store scale
- Prefetching OSM tiles into the service worker: violates OSM tile usage policy

### Expected Features

**Must have (table stakes) — all P1:**
- Store lat/lng stored via admin map pin or coordinate entry — gates all proximity features
- User settings home location (single fixed point) — gates history accuracy
- Proximity polling (foreground-only, interval-based) with 150–200m geofence
- Shopping mode auto-activation (proximity) and manual store selection (fallback)
- Branded store banner (Rema 1000 blue, Kiwi green, Meny red, Coop Extra yellow)
- Store layout auto-selected when shopping mode activates
- Check-off branching: near store writes history; near home suppresses it
- Dismiss / exit shopping mode control

**Should have (competitive differentiators):**
- 150–200m auto-detection geofence — unique vs. all documented competitors (AnyList, Bring, OurGroceries require manual store selection or offer no store detection at all)
- Branded in-store banner — unique at this feature tier among family grocery apps
- Home-location suppressed history — unique check-off behavior that keeps shopping history clean and accurate

**Defer to post-v2.2:**
- Radius tuning per store — add after first user feedback about wrong-store detection
- Post-shop cleanup prompt ("just left the store — clear checked items?")
- Push notification on store arrival — blocked by PWA background geofencing limitation on iOS
- Indoor aisle navigation — requires per-store BLE infrastructure, out of scope

### Architecture Approach

The architecture is an additive layer on top of existing patterns. Two new `$state` singletons follow the existing `offline.svelte.ts` pattern: `location.svelte.ts` (manages `watchPosition`, exposes `coords`, `accuracy`, `permission`) and `shopping-mode.svelte.ts` (derives `active`, `storeId`, `storeName`, `brandColor` from location plus stores data). A new `ShoppingModeBanner.svelte` component renders in the protected layout above the existing `BottomNav`. Two DB migrations add nullable `lat`/`lng` to `stores` and `home_lat`/`home_lng` to `profiles`. The `item_history` schema requires no change — the existing `historyContext` parameter on `createCheckOffMutation` is simply conditioned on `shoppingModeStore.active`.

**Major components:**
1. `location.svelte.ts` — geolocation watcher, permission state, error handling; paused on visibility hidden
2. `shopping-mode.svelte.ts` — geofence engine; haversine comparison against stores with coordinates; brand color lookup; manual override support; session context lock on GPS dropout
3. `ShoppingModeBanner.svelte` — fixed-position banner in protected layout; shows store name and brand color; includes dismiss control
4. Admin store detail page (modified) — adds coordinate entry and "use my location" button; saves to `stores.lat`/`stores.lng`
5. Household/settings page (modified) — adds home location section; "use my location" + clear controls; writes to `profiles.home_lat`/`home_lng` with RLS
6. `lister/[id]/+page.svelte` (modified) — `$effect` auto-sets `selectedStoreId` from shopping mode; `historyContext` conditioned on `shoppingModeStore.active`

### Critical Pitfalls

1. **iOS Safari standalone permission prompt silently fails** — Documented WebKit bug (Apple Developer Forums thread/694999): the location dialog may not appear when the PWA is installed to the home screen. Gate the permission call behind a user gesture and show a pre-permission explainer card. Implement full manual store-picker as the fallback. Test on a physical iPhone installed to home screen — not in simulator or browser mode.

2. **Continuous `watchPosition` drains battery** — `watchPosition` with `enableHighAccuracy: true` consumes 15–25% battery per hour. Use interval-based `getCurrentPosition` at 30–60 second intervals with `enableHighAccuracy: false` for polling; only enable high accuracy for a single confirmation call when within ~250m of a store. Pause entirely when `document.visibilityState === 'hidden'`.

3. **100m geofence fails in urban GPS conditions** — Urban Norway GPS accuracy degrades to 50–150m indoors. A strict 100m fence produces false non-detection. Use 150–200m radius plus a 90-second dwell timer. Guard every position reading: skip geofence decisions when `coords.accuracy > 100m`.

4. **Home location is GDPR-sensitive personal data** — Lat/lng in `profiles` is effectively a home address. Requires strict RLS (`USING (auth.uid() = user_id)`), a deletion control in the same release, explicit in-app purpose disclosure, 4-decimal-place precision truncation, and scrubbing from error tracking payloads. Non-retrofittable — must be correct in the first implementation.

5. **iOS backgrounds and suspends the PWA, staling location state** — `watchPosition` stops delivering updates after screen lock or app switch on iOS. Register `visibilitychange` listener: on `hidden` clear watchers, on `visible` restart and immediately call `getCurrentPosition` for a fresh fix. Apply 3-minute staleness threshold — force state to `unknown` if the last fix is older than that on resume.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Store Location Foundation (Admin)
**Rationale:** All proximity features are gated on stores having coordinates. Nothing else can be tested or built until this exists. Admin flow is the correct starting point — no user-facing location permission needed, no geofence logic, just schema + form.
**Delivers:** `lat`/`lng`/`address` columns on `stores` table (nullable); admin map pin widget or manual coordinate entry; `updateStoreLocationMutation`; stores query updated to select `lat` and `lng`.
**Addresses:** "Store lat/lng in admin" (P1 from FEATURES.md); admin map requires Leaflet integration.
**Avoids:** The most common ordering mistake for geolocation features — building the detection service before it has data.
**Research flag:** Standard patterns; skip research-phase.

### Phase 2: Location Detection Foundation
**Rationale:** The location service and its full fallback behavior must be validated on physical devices before any UI or behavior depends on it. iOS permission bugs and battery characteristics are device-only phenomena — they cannot be caught in simulators or browser testing.
**Delivers:** `location.svelte.ts` store; interval-based `getCurrentPosition` polling (30–60s, `enableHighAccuracy: false`); `visibilitychange` lifecycle (pause on hidden, restart on visible); full error-code handling (codes 1, 2, 3); pre-permission explainer UI; manual store-picker fallback; permission denied path to iOS Settings.
**Addresses:** Pitfall 1 (iOS permission), Pitfall 2 (battery), Pitfall 5 (no-GPS fallback), Pitfall 6 (screen-lock suspension).
**Acceptance criteria must include:** 30-minute battery benchmark under 8% drain; lock/unlock test verifies state re-evaluation; physical iPhone home-screen install with permission prompt visible.
**Research flag:** Standard patterns; iOS behavior is fully documented in PITFALLS.md; skip research-phase.

### Phase 3: Geofence Engine and Shopping Mode State
**Rationale:** With location service verified and stores having coordinates, the geofence algorithm and shopping mode state can be built and tested independently of any UI. Dwell timer and accuracy guard must be part of this phase — they cannot be patched on afterward without risking the history classification bugs described in Pitfall 3.
**Delivers:** `shopping-mode.svelte.ts` store; haversine geofence at 150–200m radius; 90-second dwell timer; accuracy guard (`coords.accuracy > 100` skips decision); manual mode activation path; session context lock on GPS dropout (mode persists 3 minutes after signal loss before reverting to unknown).
**Addresses:** Pitfall 3 (geofence too small), mid-session GPS dropout reclassifying check-offs.
**Research flag:** Standard patterns; algorithm fully specified in ARCHITECTURE.md and PITFALLS.md; skip research-phase.

### Phase 4: Shopping Mode UI and Check-Off Behavior
**Rationale:** With solid state management established, UI and behavior changes are low-risk additive work. `ShoppingModeBanner` is a display-only component. The check-off behavior change is a single conditional addition to the existing `createCheckOffMutation` in `items.ts`.
**Delivers:** `ShoppingModeBanner.svelte` with brand colors, store name, and dismiss control; store layout auto-selection via `$effect` on list page; `historyContext` conditioned on `shoppingModeStore.active`; offline replay path from Phase 21 verified unbroken.
**Addresses:** Branded banner (differentiator), history-accurate check-off behavior (key differentiator), dismissal control (table stakes), store layout auto-selection (table stakes).
**Avoids:** Breaking the offline queue replay validated in Phase 21 — the conditional is additive, not a rewrite of existing logic.
**Research flag:** Standard patterns; skip research-phase.

### Phase 5: Home Location Settings
**Rationale:** Home location is a privacy-sensitive feature that stands alone. It requires its own GDPR review, RLS verification, and deletion control — all of which must ship together to avoid retrofitting personal data handling. Separating it from the geofence work keeps each phase focused and its acceptance criteria verifiable.
**Delivers:** `profiles.home_lat`/`profiles.home_lng` columns (4-decimal precision); home location UI in household page (Option A from ARCHITECTURE.md — no new route); "use my location" + "remove location" controls; RLS verified with second test account; in-app privacy disclosure copy; coordinates scrubbed from error tracking; home-proximity check wired into check-off branching.
**Addresses:** GDPR pitfall (Pitfall 4), home vs. store check-off ambiguity (key differentiator from FEATURES.md).
**Avoids:** Coordinates appearing in household-scoped queries, Supabase Realtime broadcasts, or error tracking payloads.
**Research flag:** Brief GDPR/privacy review recommended during planning to confirm the existing `profiles` RLS policy covers the new columns correctly and that no household JOIN inadvertently exposes home coordinates.

### Phase Ordering Rationale

- **Data before detection:** Store coordinates must exist in the database before the geofence engine has anything to compare against. Phase 1 before Phase 2–3 is a hard dependency.
- **Detection before UI:** Location service bugs surface only on real devices. Validating Phase 2 (location) and Phase 3 (geofence) before Phase 4 (UI) prevents discovering iOS breakage after the UI has been built on top of a flawed foundation.
- **Home location isolated:** Phase 5 is independent of the geofence work — home detection uses a single fixed point, not the geofence engine. Isolating it enables focused GDPR review and RLS testing without coupling to the geofence work in Phase 3.
- **Check-off behavior in Phase 4, not Phase 3:** The `historyContext` conditional touches the offline replay path validated in Phase 21. Keeping it in the UI phase (where the list page is already being modified for the banner) reduces blast radius and makes the acceptance criteria cohesive.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Home Location):** Confirm the existing `profiles` RLS policy (`profiles_update_own`) covers newly added `home_lat`/`home_lng` columns, or whether a new policy statement is required. Confirm no existing household JOIN query touches `profiles` in a way that would expose the new columns to other household members.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Admin DB migration + coordinate form — established SvelteKit + Supabase patterns; Leaflet integration fully specified in STACK.md.
- **Phase 2:** Geolocation API — fully specified in PITFALLS.md with all iOS edge cases and acceptance criteria documented.
- **Phase 3:** Geofence algorithm — haversine and dwell timer fully specified in ARCHITECTURE.md and PITFALLS.md.
- **Phase 4:** Svelte component and mutation conditional — straightforward given the existing codebase patterns documented in ARCHITECTURE.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack read directly from `package.json`. New packages (Leaflet 1.9.4, Nominatim) verified via official docs and npm. The PostGIS vs. haversine split between STACK.md and ARCHITECTURE.md is resolved in favor of haversine — see Gaps. |
| Features | MEDIUM | Table stakes and differentiators derived from competitor research and PWA constraint verification. Feature dependency chain is well-defined. No user validation has occurred yet. |
| Architecture | HIGH | Read directly from the existing codebase (stores, profiles, items.ts, lister page). Component boundaries and data flow specified at implementation level. |
| Pitfalls | HIGH | iOS standalone permission bug confirmed via Apple Developer Forums. Battery drain patterns from MDN and Metova engineering. GDPR requirements from GDPR Local 2025. All pitfalls have specific prevention steps and phase assignments. |

**Overall confidence:** HIGH

### Gaps to Address

- **PostGIS vs. haversine inconsistency:** STACK.md recommends enabling PostGIS and using `ST_DWithin` via Supabase RPC; ARCHITECTURE.md recommends client-side haversine with raw float columns. Resolution: follow ARCHITECTURE.md (haversine). Rationale: simpler schema, no extension dependency, and sufficient accuracy for a family-scale app with 3–10 stores. The PostGIS recommendation in STACK.md was written before ARCHITECTURE.md analyzed actual codebase scale requirements.

- **Geofence radius discrepancy:** FEATURES.md specifies 100m; PITFALLS.md recommends 150–200m for urban Norway GPS accuracy. Resolution: implement 150–200m with an accuracy guard and dwell timer. The `GEOFENCE_RADIUS_METERS` constant in `shopping-mode.svelte.ts` should be set to 150, not the 100 shown in ARCHITECTURE.md sample code.

- **Offline check-off with shopping mode context:** PITFALLS.md notes the offline queue does not currently store `historyContext`. When the device goes offline mid-shopping session, queued check-offs cannot reconstruct which store the user was in during queue replay. This gap requires a decision during Phase 4 planning: either accept that offline check-offs during a shopping session are not recorded in history, or store the active `storeId` in the queued operation at enqueue time (requires modifying the offline queue schema).

---

## Sources

### Primary (HIGH confidence)
- MDN Geolocation API (watchPosition, getCurrentPosition, error codes) — browser API behavior, `clearWatch`, battery implications
- Apple Developer Forums thread/694999 — iOS Safari standalone geolocation permission prompt WebKit bug
- Apple Developer Forums thread/751189 — `navigator.permissions.query` returns incorrect state on iOS Safari
- GDPR Local 2025 — location data as personal data under GDPR, right to erasure requirements
- Supabase Docs (Securing your data, Vault) — RLS patterns, application-level encryption for sensitive fields
- Nominatim Reverse API docs — endpoint, params, Norwegian address coverage
- OSM Nominatim Usage Policy — 1 req/sec max, User-Agent requirement
- OSM Tile Usage Policy — bulk prefetch prohibition, normal interactive viewing permitted
- leaflet npm / Leaflet changelog — v1.9.4 current stable, 2.0 alpha status confirmed

### Secondary (MEDIUM confidence)
- Radar.com engineering blog — geofencing accuracy, urban GPS multipath, dwell time recommendations for false-trigger reduction
- Metova engineering — interval-based `getCurrentPosition` vs. continuous `watchPosition` battery pattern
- MagicBell PWA iOS Limitations 2026 — geolocation in standalone mode, permission behavior per session
- Khromov: Using Leaflet with SvelteKit — dynamic import + `onMount` SSR pattern (multiple consistent community sources)
- Competitor analysis: AnyList, Bring, OurGroceries feature comparison via SmartCart and NerdWallet reviews
- PlotProjects / Radar.com — grocery app geofencing UX patterns and in-store mode indicators
- web.dev permissions best practices — explain-before-asking, user gesture requirement, Lighthouse violation on page-load geolocation
- Chrome for Developers / Lighthouse — geolocation on page load flagged as best-practices violation

### Tertiary (LOW confidence)
- svelte-geolocation GitHub (Svelte 5 compatibility unconfirmed — primary reason for exclusion)
- sveaflet npm (minimal adoption — reason for exclusion)
- Leaflet 2.0-alpha announcement post-August 2025 (reason `leaflet@^1.9.4` is pinned)

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
