# Phase 26: Home Location and Check-off Behavior - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can save a private home location on a dedicated user settings page so check-offs performed near home are treated as list cleanup instead of shopping history. This phase covers the settings entry surface, home-location save/remove flow, privacy disclosure, and the at-home check-off branching. It does not add new shopping-mode behavior, store geofence logic, or broader settings features beyond what is needed to support home location.

</domain>

<decisions>
## Implementation Decisions

### Settings entry surface
- Activate a real `/admin/brukerinnstillinger` page in this phase rather than placing home location temporarily under `Husstand`.
- The page can stay minimal and focused on home location for now; broader settings work remains future scope.
- The existing Admin hub row for `Brukerinnstillinger` should become a real navigation target as part of this phase.

### Home-location input flow
- Home location is set with a map pin plus a `Bruk min posisjon` shortcut on the same page.
- Saving remains explicit; using current position should populate the map state rather than auto-persist immediately.
- A `Fjern hjemmeposisjon` control must live on the same screen as the save flow.

### At-home check-off behavior
- When the device is near the saved home location and shopping mode is not active, checking off an item should delete it from the list instead of writing an `item_history` row.
- The app should perform that removal immediately without a confirmation dialog.
- The list should show a subtle confirmation toast so users understand why the item disappeared and can distinguish the behavior from in-store check-offs.

### Privacy disclosure
- Show a short always-visible privacy explanation inline on the home-location card rather than hiding it behind a modal or accordion.
- The copy should clearly state that home location is used only to distinguish shopping from at-home list cleanup, is stored only on the current user's account, and is not shared with other household members.

### Claude's Discretion
- Exact Norwegian copy for the page title, inline privacy text, save/remove button labels, and at-home deletion toast.
- Exact map height, spacing, and the visual treatment of the home-location card within the settings page.
- Whether the current-position shortcut is a primary button, secondary button, or inline action as long as it remains obvious and non-destructive.
- The exact near-home distance threshold implementation, provided it uses the fixed home point and respects the 4-decimal stored precision.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 26 goal and success criteria for private home location storage, remove control, and at-home check-off suppression.
- `.planning/REQUIREMENTS.md` — `CHKOFF-02` and `CHKOFF-03` define the required home-location behavior and settings entry point.
- `.planning/PROJECT.md` — v2.2 milestone intent, mobile/PWA constraints, and compatibility expectations for iOS Safari and Android Chrome.

### Prior locked decisions
- `.planning/STATE.md` §Accumulated Context — home location must ship with GDPR-safe RLS, 4-decimal precision truncation, deletion control, and privacy disclosure; Phase 26 remains independent of Phase 25 geofence internals.
- `.planning/phases/24-location-detection-foundation/24-CONTEXT.md` — location permission UX, list-page ownership of location session, and foreground-only detection architecture that Phase 26 builds on.
- `.planning/phases/25-shopping-mode/25-CONTEXT.md` — shopping-mode active state already gates store-attributed history and must take precedence over at-home suppression.
- `.planning/phases/23-store-location-foundation/23-CONTEXT.md` — existing Leaflet/OpenStreetMap map conventions and mobile-first map interaction patterns.

### Privacy and research guidance
- `.planning/research/SUMMARY.md` — home location phase recommendation: dedicated settings surface, `Bruk min posisjon` plus remove control, RLS verification, and privacy copy.
- `.planning/research/PITFALLS.md` — GDPR handling for home coordinates, 4-decimal precision guidance, requirement to avoid household-scoped exposure, and mandatory deletion control.

### Existing code and schema touchpoints
- `supabase/migrations/20260308000001_phase1_foundation.sql` — current `profiles` schema and RLS policies, including `profiles_select` and `profiles_update_own`.
- `src/routes/(protected)/admin/+page.svelte` — Admin hub currently keeps `Brukerinnstillinger` disabled; this phase activates that entry.
- `src/routes/(protected)/admin/husstand/+page.server.ts` — example household-scoped `profiles` query that must not start exposing home coordinates.
- `src/routes/(protected)/+layout.server.ts` — protected-layout profile lookup currently selects only `household_id`; useful reference for keeping home-location reads narrowly scoped.
- `src/routes/(protected)/lister/[id]/+page.svelte` — current list page owns check-off actions, shopping-mode state wiring, and store-selection effects.
- `src/lib/queries/items.ts` — `createCheckOffMutation` is the core integration point for at-home deletion versus history insertion.
- `src/lib/location/session.svelte.ts` — current location session and shopping-mode state; Phase 26 should reuse this runtime state rather than inventing a parallel location engine.
- `src/lib/types/database.ts` — generated Supabase types that will need regeneration when `profiles` gains home-location columns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/location/session.svelte.ts`: Existing foreground location session already tracks the latest sample and shopping-mode state; Phase 26 can derive near-home behavior from this instead of adding new polling.
- `src/routes/(protected)/lister/[id]/+page.svelte`: The list page already owns `checkOffMutation`, selected-store state, and shopping-mode banner wiring, making it the right place to branch at-home behavior.
- Phase 23's Leaflet/OpenStreetMap map approach is an established pattern to reuse for home-location selection, rather than introducing a second mapping stack.

### Established Patterns
- Admin subpages live under `/admin/*` and use simple mobile-first cards with Norwegian labels.
- Protected routes obtain household/user context through layout data and scoped Supabase queries rather than global profile stores.
- Mutations currently favor immediate optimistic UI behavior; Phase 26 should preserve that feel even when check-off becomes deletion.

### Integration Points
- `profiles` needs nullable `home_lat` and `home_lng` columns with 4-decimal storage and regenerated types.
- A new settings route must read and update only the current user's home coordinates; household member queries must continue selecting non-sensitive profile fields only.
- The check-off mutation path must branch before writing `item_history` so at-home cleanup becomes deletion, not merely "checked with no history".
- Shopping mode must still win over at-home suppression when it is active, so the branching order matters in the list-page integration.

</code_context>

<specifics>
## Specific Ideas

- The settings experience should feel like a focused privacy-sensitive card, not a broad preferences overhaul.
- `Bruk min posisjon` should help the user place the home pin quickly, but the user still explicitly saves the location.
- The at-home deletion toast should make the behavior legible without interrupting rapid cleanup of a list after returning from the store.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-home-location-and-check-off-behavior*
*Context gathered: 2026-03-29*
