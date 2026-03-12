# Phase 6: History View and Recommendations - Research

**Date:** 2026-03-11
**Phase:** 06-history-view-and-recommendations
**Requirements:** HIST-02, RECD-01, RECD-02, RECD-03

## Research Goal

Determine what needs to be built so Phase 6 can:
- show household shopping history grouped as sessions
- surface frequency-based and co-purchase recommendations
- support one-action add-back from history/recommendations
- respect the user decisions in `06-CONTEXT.md`

## Existing System Facts

### Data already available
- `item_history` already exists and is populated on check-off from Phase 2.
- Current columns are `id`, `list_id`, `item_id`, `item_name`, `checked_by`, `checked_at`.
- Household-scoped read access already exists via `item_history_select` RLS in [supabase/migrations/20260309000004_phase2_shopping_lists.sql](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260309000004_phase2_shopping_lists.sql).

### UI/navigation already available
- Bottom navigation already has a disabled `Anbefalinger` placeholder in [src/lib/components/lists/BottomNav.svelte](C:/Users/HP/Documents/Koding/HandleAppen/src/lib/components/lists/BottomNav.svelte).
- List home and list detail pages already exist and are query-driven via TanStack Query.
- Existing UI patterns are compact, mobile-first, and Norwegian-first.

### Mutation flows already available
- Add-item, update-item, and check-off mutations already live in [src/lib/queries/items.ts](C:/Users/HP/Documents/Koding/HandleAppen/src/lib/queries/items.ts).
- Add-back can likely reuse the existing add/update mutation layer instead of inventing a separate write path.

## Critical Gaps Found

### 1. Store context for history is not durable yet
- The user wants history session headers to prioritize store first.
- Today, store selection on a list is session-local UI state only: `selectedStoreId` is local state in [src/routes/(protected)/lister/[id]/+page.svelte](C:/Users/HP/Documents/Koding/HandleAppen/src/routes/(protected)/lister/[id]/+page.svelte).
- The `lists` table does not currently store a `store_id`.
- `item_history` does not currently snapshot any store metadata at write time.

**Implication:** if Phase 6 needs stable store-first history headers, the plan must introduce durable store context. The safest shape is to snapshot store metadata into `item_history` at check-off time while tolerating older rows with null store context.

### 2. “Current active list” is not a reusable app concept yet
- The user wants add-back to go straight to an obvious current list, otherwise require a chooser.
- There is no global active-list store today.
- Current list context is route-local: list detail pages know `listId`, but the app does not expose a shared “active/current list” outside that route.

**Implication:** the phase needs either:
- a lightweight active-list context/store derived from recent navigation, or
- an explicit in-tab list-target flow with heuristic auto-targeting only when truly unambiguous.

### 3. Co-purchase needs a stable session definition
- Requirement RECD-02 says co-purchase should be derived from items bought in the same shopping session.
- Existing `item_history` rows are item-level events, not explicit session rows.
- The roadmap suggests “single SQL JOIN on session time window”.

**Implication:** the plan must define a deterministic session key for SQL. The most plausible v1 approach is household/list/date-window grouping anchored on `item_history.checked_at`, not a new ML or event-stream model.

## Recommended Architecture Direction

### History model
- Keep `item_history` as the source of truth.
- Add nullable store snapshot fields needed for Phase 6 history display, rather than relying on current list store state.
- Group in the query layer by date, then by session bucket/list.
- Older rows with no store snapshot remain valid and render with list name only, matching the locked context decision.

### Recommendations model
- Frequency recommendations should stay SQL-only and household-scoped, using the last 90 days.
- Co-purchase should also stay SQL-first and derive from the same history table, using session bucketing rather than introducing a separate analytics system.
- The final UI should merge both result sets into one compact list, with stable ordering rules decided during planning.

### Add-back model
- Reuse existing list item mutations.
- If the target list already contains the item, increment quantity instead of creating a duplicate.
- If no obvious list target exists, require the user to choose a list from the tab itself.

## Query / Data Design Notes

### Frequency recommendations
Likely SQL shape:
- filter `item_history` to current household via RLS
- filter to last 90 days
- group by normalized item identity
- sort by count desc, recency desc

### Co-purchase recommendations
Likely SQL shape:
- identify active list item names
- join `item_history` against itself by session bucket
- count companion items bought in the same session
- exclude items already on the active list

### Session grouping for history
Needed display fields:
- date group
- session header: store first, then list metadata
- item rows: item name + member attribution

Because there is no explicit session table, planner should prefer a deterministic bucket strategy, likely:
- date bucket from `checked_at`
- list id as part of the grouping key
- optionally a short inactivity window if needed for separating same-day repeated trips

## Risks and Pitfalls

### Pitfall 1: unstable item identity
- `item_name` is free text and may vary (`Melk`, `Lettmelk`, `melk`).
- Pure string counting will work for v1 but may need normalization rules.
- Planner should keep v1 normalization modest and deterministic, not heuristic-heavy.

### Pitfall 2: history store labels changing over time
- If history joins current store name by `store_id` only, renamed stores mutate past history presentation.
- Snapshotting store name at check-off time avoids that regression for new data.

### Pitfall 3: false “current list” assumptions
- Auto-adding to the wrong list is worse than asking the user to choose.
- Any heuristic must stay narrow: only auto-target when the current list is actually obvious.

### Pitfall 4: cold-start mismatch
- The user explicitly wants a direct “recommendations appear after 10 shopping sessions” message.
- The tab still needs utility during cold start.
- Planner should ensure history remains accessible from the same Phase 6 surface even when recommendations are gated.

## Reusable Code / Integration Points

### Reusable assets
- `src/lib/components/lists/BottomNav.svelte` for activating the tab
- `src/lib/queries/items.ts` for add/increment behavior reuse
- `src/routes/(protected)/+layout.server.ts` and protected route data flow for household/user context
- `src/lib/queries/lists.ts` for list targeting and chooser data

### Likely new integration points
- new recommendations/history route under protected routes
- new query module for history and recommendations
- DB migration for history snapshot fields and any helper SQL view/function needed for recommendations
- Playwright seed helpers for synthetic history sessions

## Validation Architecture

Phase 6 can be Nyquist-compliant with Playwright-backed seeded-history flows:
- Wave 0 adds dedicated `tests/history.spec.ts` and `tests/recommendations.spec.ts`
- task-level tests verify history grouping, cold-start gate, blended recommendations, and add-back behavior
- seeded DB helpers should create deterministic sessions so recommendation counts and ordering are assertable

## Planning Guidance

The phase should likely split into three plans:
1. Data/query foundation + history view
2. Recommendation SQL + cold-start logic
3. `Anbefalinger` route activation + add-back UX + E2E coverage

The planner must explicitly address:
- how store context is made durable for future history rows
- how old rows without store context render
- what counts as an “obvious current list”
- how the blended list orders frequency vs co-purchase results without making the UI feel like two stacked feeds

## Conclusion

Phase 6 is feasible with the current codebase, but it is not just a surface-layer feature. The two load-bearing decisions are:
- making history store context durable enough to honor the store-first UI
- introducing a safe current-list targeting rule for add-back actions

If those are handled deliberately, the rest of the phase fits the existing query/mutation/navigation patterns well.