# Phase 26: Home Location and Check-off Behavior - Research

**Researched:** 2026-03-29
**Domain:** Private per-user home location storage, SvelteKit admin settings UI, and list check-off branching
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHKOFF-02 | Items checked off while near the user's home location are treated as deletions and not recorded in shopping history | Branch before `item_history` insert, keep shopping mode precedence, reuse existing location sample + haversine check, and account for offline replay gap |
| CHKOFF-03 | User can set their home location once from user settings (map pin placement) | Activate `/admin/brukerinnstillinger`, reuse Leaflet map pattern, add explicit save/remove flow, and store coordinates in a privacy-safe per-user data model |
</phase_requirements>

## Summary

Phase 26 is not just a small UI addition. The list-side behavior is straightforward, but the storage model is the real planning constraint. The current `profiles` table is readable by everyone in the same household under `profiles_select`, and Supabase's own docs are explicit that RLS is row-level, not column-level. If `home_lat` and `home_lng` are added directly to `profiles`, those coordinates become queryable by other household members unless the phase also adds column-level privileges or moves the data into a dedicated private table.

On the product side, the phase fits the existing app structure well: add a minimal `/admin/brukerinnstillinger` route, reuse the existing Leaflet `StoreMapWidget` pattern for pin placement, use `getCurrentLocation()` for the `Bruk min posisjon` shortcut, and keep the save/remove actions explicit. On the list page, home cleanup must branch before `item_history` insertion, and shopping mode must still win. The subtle toast pattern already exists elsewhere in the app and should be reused.

The main implementation risk is offline behavior. The offline queue only supports a `toggle` mutation today and replays it as `update list_items` plus `insert item_history`. That cannot correctly represent "delete at home instead of history". Planning should either include queue evolution in this phase or explicitly constrain at-home cleanup to the online path.

**Primary recommendation:** Plan Phase 26 around a dedicated private home-location table plus a page-scoped settings route; do not store private home coordinates directly on household-readable `profiles` unless you also commit to column-level privilege work.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | repo `^2.50.2` | `/admin/brukerinnstillinger` route, page load, actions/forms | Existing protected admin routes already use SvelteKit route conventions and page-scoped data loading |
| Svelte 5 | repo `^5.51.0` | Local page state for pending coordinates, toast state, save/remove UI | Matches the current `$state` and `$derived` patterns across the app |
| `@supabase/supabase-js` | repo `^2.98.0` | Read/update private home-location record and list mutations under RLS | Existing data layer already uses browser Supabase client with RLS-safe queries |
| Postgres + Supabase RLS | existing project stack | Private per-user storage and policy enforcement | Required for browser-side access from the app; official Supabase guidance is RLS first |
| Leaflet | repo `^1.9.4` | Interactive map pin selection on the settings page | Already installed and already working in this repo via dynamic import |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/svelte-query` | repo `^6.1.0` | Client mutation/query invalidation for save/remove or list refresh | Use if the settings page follows the same client-mutation pattern as stores/lists |
| Existing `src/lib/location/geolocation.ts` | local module | `Bruk min posisjon` one-shot read | Use for explicit button-triggered current position capture |
| Existing `src/lib/location/proximity.ts` | local module | Haversine distance check against saved home point | Use for near-home detection instead of creating a second distance utility |
| Playwright | repo `^1.58.2` | Admin/settings + check-off E2E coverage | Existing validation stack for location-aware flows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated private `user_home_locations` table | Add `home_lat` / `home_lng` to `profiles` | `profiles` is already household-readable; direct columns require column-level privileges or another access layer |
| Reusing `StoreMapWidget` | New `HomeMapWidget` | New component adds no value unless the UX diverges materially |
| Page-scoped route load | Put home coords into `(protected)/+layout.server.ts` | Layout data would load private location on every protected route and widen exposure unnecessarily |
| Existing subtle toast pattern | Modal/confirm dialog | Conflicts with locked decision for immediate cleanup without confirmation |

**Installation:**
```bash
# No new packages required if Phase 26 reuses the existing stack.
```

**Version verification:**
- `@supabase/supabase-js`: npm latest `2.100.1` published 2026-03-26; repo is pinned to `^2.98.0`. Do not upgrade in this phase unless another task already requires it.
- `leaflet`: npm latest stable `1.9.4` published 2023-05-18; repo already uses it.
- `@tanstack/svelte-query`: npm latest `6.1.10` published 2026-03-23; repo is pinned to `^6.1.0`.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── routes/(protected)/admin/brukerinnstillinger/
│   ├── +page.server.ts     # load only current user's private home-location state
│   └── +page.svelte        # map, current-position shortcut, save/remove, privacy copy
├── lib/location/
│   ├── geolocation.ts      # reuse one-shot getCurrentLocation()
│   └── proximity.ts        # reuse haversine distance helper
├── lib/queries/
│   └── items.ts            # branch at-home delete before item_history insert
└── lib/offline/
    └── queue.ts            # only if Phase 26 chooses to support offline at-home cleanup
```

### Pattern 1: Keep Private Home Data Out of Household-Readable Queries
**What:** Store home coordinates in a dedicated private table keyed by `user_id`, with RLS `auth.uid() = user_id`.
**When to use:** Default plan for this phase.
**Example:**
```sql
create table public.user_home_locations (
  user_id uuid primary key references auth.users on delete cascade,
  home_lat double precision,
  home_lng double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_home_locations enable row level security;

create policy "user_home_locations_select_own"
on public.user_home_locations
for select
using ((select auth.uid()) = user_id);

create policy "user_home_locations_upsert_own"
on public.user_home_locations
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

### Pattern 2: Page-Scoped Settings Load
**What:** Load only the current user's home-location data in `/admin/brukerinnstillinger`, not in shared layout data.
**When to use:** Always; avoids over-fetching private location into unrelated pages.
**Example:**
```ts
// Source: local code pattern from +layout.server.ts and admin/husstand/+page.server.ts
export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession()
  if (!user) throw error(401, 'Ikke logget inn')

  const { data, error: queryError } = await supabase
    .from('user_home_locations')
    .select('home_lat, home_lng')
    .eq('user_id', user.id)
    .maybeSingle()

  if (queryError) throw error(500, 'Kunne ikke hente hjemmeposisjon')

  return { homeLocation: data ?? null }
}
```

### Pattern 3: Explicit Save / Remove With Pending Coordinates
**What:** `Bruk min posisjon` updates local pending map state only; save/remove are separate explicit actions.
**When to use:** Required by locked decisions.
**Example:**
```ts
import { getCurrentLocation } from '$lib/location/geolocation'

async function useCurrentPosition() {
  const sample = await getCurrentLocation()
  pendingLat = truncateCoord4(sample.latitude)
  pendingLng = truncateCoord4(sample.longitude)
}

function handleMapPick(lat: number, lng: number) {
  pendingLat = truncateCoord4(lat)
  pendingLng = truncateCoord4(lng)
}
```

### Pattern 4: Branch Before Writing History
**What:** Decide between delete-at-home and history-recording before the current `item_history` insert path runs.
**When to use:** Every check-off where `isChecked === true`.
**Example:**
```ts
const atHomeCleanup =
  isChecked &&
  !locationSession.shoppingModeActive &&
  homeLocation != null &&
  isNearHome(locationSession.lastSample, homeLocation)

if (atHomeCleanup) {
  await supabase.from('list_items').delete().eq('id', itemId)
  return { queued: false, mode: 'home-delete' as const }
}

await runOnlineToggle(itemId, isChecked, itemName, historyContext)
return { queued: false, mode: 'history-toggle' as const }
```

### Anti-Patterns to Avoid
- **Putting home coordinates on `profiles` without more privilege work:** `profiles_select` currently allows same-household reads. RLS alone does not hide columns.
- **Loading home coordinates in `(protected)/+layout.server.ts`:** Widens the blast radius of private data and makes accidental UI exposure easier.
- **Using a second map library or a second distance helper:** The repo already has working Leaflet and haversine implementations.
- **Branching after `item_history` insert:** Too late; the history row already exists.
- **Treating offline replay as “someone else’s problem”:** The existing queue shape cannot replay at-home delete correctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive map pinning | Custom map canvas or raw OSM tile handling | Existing `StoreMapWidget.svelte` + Leaflet | Already solved in repo, including dynamic import and Vite marker fix |
| Distance math | A second home-distance function | `haversineDistanceMeters` / `findNearestDetectedStore` pattern in `proximity.ts` | Prevents duplicate geospatial logic |
| Toast UX | New global toast framework | Existing local `aria-live="polite"` toast pattern | The repo already uses small inline/page toasts successfully |
| Privacy enforcement | “We just won’t select the columns” | Dedicated private table or explicit column privileges | Query discipline alone is not a security boundary |
| Current-position shortcut | New location service | Existing `getCurrentLocation()` helper | Already handles browser API + error classification |

**Key insight:** The complexity in this phase is not map UI; it is getting privacy boundaries and mutation branching correct inside an app that already supports household sharing and offline replay.

## Common Pitfalls

### Pitfall 1: `profiles` Row Policy Makes Home Coordinates Household-Readable
**What goes wrong:** Adding `home_lat` / `home_lng` to `profiles` exposes those columns to any same-household user who queries them.
**Why it happens:** Current policy is `profiles_select using (household_id = public.my_household_id())`; RLS filters rows, not columns.
**How to avoid:** Use a dedicated private table, or add column-level privileges plus a narrow access layer.
**Warning signs:** Any browser query like `.from('profiles').select('id, display_name, home_lat, home_lng')` succeeds for another household member.

### Pitfall 2: Offline Replay Recreates History Instead of Home Cleanup
**What goes wrong:** User checks off at home while offline, queue replays later as toggle + `item_history` insert.
**Why it happens:** `QueuedMutation` only supports `type: 'toggle'` and replay always inserts history when checked.
**How to avoid:** Either extend queue entries to encode `delete` vs `toggle-with-historyContext`, or explicitly scope Phase 26 to online at-home cleanup and guard offline behavior.
**Warning signs:** `src/lib/offline/queue.ts` still has only one mutation type at implementation complete time.

### Pitfall 3: Home Detection Overrides Shopping Mode
**What goes wrong:** Items checked off during an active shopping trip get deleted because the device is also near home or stale home state is reused.
**Why it happens:** Branch ordering is wrong.
**How to avoid:** Evaluate `shoppingModeActive` first, then home cleanup second.
**Warning signs:** At-home branch is computed outside the shopping-mode precedence check.

### Pitfall 4: Home Coordinates Leak Through Shared Loads
**What goes wrong:** Settings data is added to layout data or member queries and becomes available on unrelated pages.
**Why it happens:** Convenience-driven data loading.
**How to avoid:** Keep reads page-scoped and explicit; keep `admin/husstand` queries selecting only `id, display_name, avatar_url`.
**Warning signs:** `(protected)/+layout.server.ts` or household pages start selecting `home_*` columns.

### Pitfall 5: Precision and Threshold Drift
**What goes wrong:** Stored location is truncated to 4 decimals but detection compares against untruncated pending values or an overly tight threshold.
**Why it happens:** Save path and comparison path use different precision assumptions.
**How to avoid:** Truncate once in a shared helper and compare against the persisted precision; use a fixed threshold around 100m.
**Warning signs:** Home detection tests pass only with exact mocked coordinates.

## Code Examples

Verified patterns from official sources and current repo:

### Private Table RLS
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
create policy "user can see their own row"
on public.user_home_locations
for select
using ((select auth.uid()) = user_id);
```

### Column-Level Security Warning
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/column-level-security
revoke update on table public.posts from authenticated;
grant update (title, content) on table public.posts to authenticated;
```

### Leaflet Click-to-Pin Reuse
```ts
// Source: current repo pattern in src/lib/components/stores/StoreMapWidget.svelte
mapInstance.on('click', (e: import('leaflet').LeafletMouseEvent) => {
  const { lat, lng } = e.latlng
  marker ? marker.setLatLng(e.latlng) : (marker = L.marker(e.latlng).addTo(mapInstance!))
  onLocationChange(lat, lng)
})
```

### Subtle Toast Pattern
```svelte
<!-- Source: current repo pattern in recipe/history pages -->
{#if toastMessage}
  <div aria-live="polite" data-testid="toast-message" class="rounded-lg bg-gray-900/90 px-3 py-2 text-sm text-white">
    {toastMessage}
  </div>
{/if}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shared profile row for all user metadata | Private settings data isolated from household-readable profile data | Current best practice; confirmed by Supabase docs on RLS vs column privileges | Reduces accidental privacy exposure |
| Always check-off via `update list_items` + `insert item_history` | Context-aware mutation: shopping mode writes history, at-home cleanup deletes | Phase 25-26 behavior split | Keeps recommendations clean |
| Temporary settings stub in admin hub | Real `/admin/brukerinnstillinger` route | This phase | Unlocks CHKOFF-03 and future user settings work |

**Deprecated/outdated:**
- Storing sensitive home coordinates on a broadly readable shared profile row without more privilege work.
- Treating “we never select that column in UI code” as a security control.

## Open Questions

1. **Will Phase 26 support correct offline at-home cleanup?**
   - What we know: Current queue shape cannot represent delete-at-home semantics.
   - What's unclear: Whether the phase should expand the queue contract now or explicitly defer offline correctness.
   - Recommendation: Include queue work in planning unless product scope explicitly says online-only.

2. **Can the team accept a private table instead of `profiles.home_lat/home_lng`?**
   - What we know: `profiles_select` currently exposes rows to same-household users, and Supabase docs confirm RLS is row-level while column restrictions need separate privilege work.
   - What's unclear: Whether roadmap assumptions force coordinates onto `profiles`.
   - Recommendation: Resolve this before task breakdown. If `profiles` is mandatory, create an explicit privilege subtask and avoid `select *` entirely.

3. **What exact near-home threshold should the planner lock?**
   - What we know: The user left this to Claude's discretion, the stored point is 4-decimal precision, and shopping mode takes precedence.
   - What's unclear: Final threshold in meters.
   - Recommendation: Lock `100m` for planning. It is comfortably above 4-decimal precision error and still tighter than the store geofence.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright `^1.58.2` |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/admin.spec.ts tests/shopping-mode.spec.ts --project=chromium` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHKOFF-03 | Admin hub links to real user settings page; page can load/save/remove home location via map/current-position shortcut | e2e | `npx playwright test tests/admin.spec.ts tests/home-location.spec.ts --project=chromium` | ❌ Wave 0 |
| CHKOFF-02 | Check-off near home deletes item, shows subtle toast, and does not create `item_history` row | e2e | `npx playwright test tests/home-location.spec.ts --project=chromium` | ❌ Wave 0 |
| CHKOFF-02 | Same-household user cannot read another user's home location | integration/e2e | `npx playwright test tests/home-location-privacy.spec.ts --project=chromium` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/admin.spec.ts --project=chromium`
- **Per wave merge:** `npx playwright test tests/admin.spec.ts tests/shopping-mode.spec.ts tests/offline.spec.ts --project=chromium`
- **Phase gate:** `npm test`

### Wave 0 Gaps
- [ ] `tests/home-location.spec.ts` — covers CHKOFF-02 and CHKOFF-03 end-to-end
- [ ] `tests/home-location-privacy.spec.ts` — verifies cross-user privacy/RLS behavior
- [ ] `tests/helpers/location.ts` extension — seed private home location and mock current position for settings + list flows
- [ ] Update `tests/admin.spec.ts` — replace the current “Brukerinnstillinger stub disabled” assertion with real link/navigation coverage
- [ ] If offline behavior is in scope: extend `tests/offline.spec.ts` to cover at-home cleanup replay semantics

## Sources

### Primary (HIGH confidence)
- Local code review:
  - `supabase/migrations/20260308000001_phase1_foundation.sql`
  - `src/routes/(protected)/+layout.server.ts`
  - `src/routes/(protected)/admin/+page.svelte`
  - `src/routes/(protected)/admin/husstand/+page.server.ts`
  - `src/routes/(protected)/admin/husstand/+page.svelte`
  - `src/routes/(protected)/lister/[id]/+page.svelte`
  - `src/lib/queries/items.ts`
  - `src/lib/location/geolocation.ts`
  - `src/lib/location/session.svelte.ts`
  - `src/lib/location/proximity.ts`
  - `src/lib/components/stores/StoreMapWidget.svelte`
  - `src/lib/offline/queue.ts`
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Column Level Security docs: https://supabase.com/docs/guides/database/postgres/column-level-security
- Supabase “Securing your data” docs: https://supabase.com/docs/guides/database/secure-data
- Leaflet reference: https://leafletjs.com/reference.html
- npm registry checks on 2026-03-29:
  - `@supabase/supabase-js` latest `2.100.1`
  - `leaflet` latest stable `1.9.4`
  - `@tanstack/svelte-query` latest `6.1.10`

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`
- `.planning/research/PITFALLS.md`
- `.planning/phases/24-location-detection-foundation/24-CONTEXT.md`
- `.planning/phases/25-shopping-mode/25-CONTEXT.md`
- Existing Playwright specs:
  - `tests/location-detection.spec.ts`
  - `tests/shopping-mode.spec.ts`
  - `tests/offline.spec.ts`
  - `tests/admin.spec.ts`

### Tertiary (LOW confidence)
- Prior v2.2 research assumption that home coordinates would live on `profiles`; retained here only as a legacy assumption to re-evaluate during planning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo patterns are clear and upstream docs confirm the security model
- Architecture: MEDIUM - route/UI structure is clear, but the private-table-vs-profiles decision must be locked before planning
- Pitfalls: HIGH - privacy exposure and offline replay limitations are directly visible in current code and confirmed by official docs

**Research date:** 2026-03-29
**Valid until:** 2026-04-28
