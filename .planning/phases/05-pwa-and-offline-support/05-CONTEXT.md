# Phase 5: PWA and Offline Support - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app installable on mobile home screens and keep it usable for core shopping actions (check off items) when in-store connectivity is poor or absent — syncing queued changes automatically when the connection returns. New list creation, item adds, and item removes are not available offline.

</domain>

<decisions>
## Implementation Decisions

### Offline status indicator
- When the device goes offline, a subtle signal appears immediately in the BottomNav — a dot or badge on the Lister tab. The list screens do not require the user to attempt an action to discover they're offline.
- The offline signal collapses into the pending-sync count badge when items are queued: one combined badge number (e.g. "3") replaces the dot — it implies both offline and pending state.
- Individual queued items do NOT look different in the list — they display as normal items (optimistic UI). No per-item pending marks.
- When back online and the queue has been flushed, a brief toast appears: "Endringer synkronisert" (~2 seconds). Then disappears.

### Pending-sync badge
- The pending-sync count lives in the BottomNav on the Lister tab — visible from all tabs (Butikker, Husstand), not only when Lister is active.
- On Android (BackgroundSync): badge count drops when background sync succeeds, followed by the success toast on next foreground.
- On Safari (next-open replay): badge count is shown on every app open while there are unsynced items; clears after replay completes, then shows the success toast.
- No separate "sync status" screen or dedicated UI for this — BottomNav badge + toast covers it.

### Install prompt
- Browser-native install prompt only — no custom "Add to Home Screen" banner. Let Android Chrome/Samsung Internet trigger the native prompt when criteria are met.
- No iOS Safari install instructions shown in the UI. No tooltip, no footer hint. iOS users who want to install will use the Share sheet themselves.

### Offline write scope
- **What works offline:** Check off an item, uncheck an item (same queue entry, both end in is_checked state that resolves correctly via monotone OR).
- **What does NOT work offline:** Add new items, remove items, create new lists.
- When the user attempts to add or remove an item while offline, the action is **visually disabled** — the add-item input and swipe-to-remove are non-interactive, with a tooltip or label ("Legg til krever nett" or similar). No failed mutation, no toast.
- New list creation offline: not supported. Existing lists remain readable and check-off-able.

### Conflict resolution
- Monotone OR for `is_checked`: if two devices both check off the same item while offline, the item stays checked on sync — no conflict error (both devices intended the item to be done).
- Soft-delete semantics for the mutation queue to handle edge cases cleanly.

### Claude's Discretion
- Exact dot size, color, and positioning within the BottomNav component
- Exact wording of the disabled-state tooltip for add/remove while offline
- PWA manifest color scheme and icon set
- Service worker caching strategy details (NetworkFirst TTL, stale-while-revalidate thresholds)
- Whether the offline dot and count badge are visually combined or sequentially shown

</decisions>

<specifics>
## Specific Ideas

- The BottomNav badge is the single source of truth for offline/pending state — one glance from anywhere in the app tells you if something is unsynced.
- The shopping flow (in-store, checking things off) should feel completely uninterrupted when offline — no spinners, no errors, just the badge quietly telling you "3 pending."
- Success toast on sync confirms the state returned to normal without requiring any user action.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/lists/BottomNav.svelte`: existing BottomNav component — the offline dot and pending-sync badge will be added here.
- `src/lib/queries/items.ts`: existing TanStack Query mutation layer for check-off, add, remove — offline queue will intercept or wrap these mutations.
- `src/lib/components/items/ItemInput.svelte`: add-item input — must be visually disabled when offline.
- `src/lib/actions/swipe.ts`: swipe-to-remove action — must be disabled or inert when offline.
- `src/routes/(protected)/lister/[id]/+page.svelte`: list detail page — integration point for offline state propagation.

### Established Patterns
- Optimistic mutations are already in place (TanStack Query) — offline queue must not break the existing optimistic update behavior; queued items should look identical to normally-submitted items.
- Bottom-sheet dialogs for focused interactions — no new full-screen views needed for offline state.
- Mobile-first, Norwegian-first UI: all offline copy should be in Norwegian (e.g., "Legg til krever nett", "Endringer synkronisert").
- No PWA plugin installed yet — `@vite-pwa/sveltekit` must be added to `vite.config.ts`.

### Integration Points
- `vite.config.ts`: new `@vite-pwa/sveltekit` plugin entry point.
- `src/routes/+layout.svelte`: natural place to register the service worker and expose the global offline/queue state to child components.
- Supabase REST calls (via TanStack Query) are the target for the NetworkFirst caching strategy.
- BottomNav component: receives offline status and pending count as props or reads from a shared Svelte store.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-pwa-and-offline-support*
*Context gathered: 2026-03-11*
