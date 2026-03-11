# Phase 6: History View and Recommendations - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface the household purchase history that has been accumulating since Phase 2 and expose a dedicated `Anbefalinger` experience driven by household frequency and co-purchase patterns. This phase covers browsing past sessions, showing recommendation results, and letting users add items back to a list from history or recommendations. It does not add new recommendation models beyond frequency and co-purchase.

</domain>

<decisions>
## Implementation Decisions

### History presentation
- History is grouped by date at the top level.
- Within each date group, sessions are ordered newest first.
- Sessions are collapsed by default on mobile.
- Session headers prioritize store first.
- If store data is missing on older history entries, show the list name only with no fallback label like "unknown store".
- Session contents stay compact and show item names plus who checked each item off.

### Recommendations composition
- The `Anbefalinger` tab is recommendations-first, not history-first.
- Frequency and co-purchase results appear in one blended list rather than separate sections.
- When no active list is open, the recommendations surface should prompt the user to open a list.
- Recommendation presentation should be very compact and practical, with minimal visual weight and no richer explanatory treatment by default.

### Add-back flow
- If there is one obvious active/current list context, tapping a history item or recommendation should add it directly to that list.
- If there are multiple lists and no clear active target, the user must choose a list instead of the app guessing.
- After a successful add-back action, show a subtle toast.
- If the item already exists in the target list, increase its quantity instead of creating a duplicate row or no-oping.

### Cold-start behavior
- Before the household has enough history for recommendations, the `Anbefalinger` tab shows a simple message rather than placeholder recommendation slots.
- The threshold explanation should be explicit: recommendations appear after 10 shopping sessions.
- In this cold-start state, the user should still be able to act on past data from the tab.
- The cold-start presentation should feel friendly rather than purely utilitarian.

### Claude's Discretion
- Exact visual styling of compact history rows, collapsed headers, and blended recommendation rows
- Exact toast copy for add-back confirmation
- Exact wording and layout of the cold-start empty state, as long as the "10 shopping sessions" rule is clearly stated
- Exact heuristics for detecting the "obvious current list" from existing app context

</decisions>

<specifics>
## Specific Ideas

- History should be easy to scan quickly on mobile rather than card-heavy.
- Recommendations should feel practical and lightweight, closer to "buy this again" than a discovery feed.
- The blended recommendation list should avoid looking like two stacked products jammed together; it should read as one usable list.
- The cold-start state should still let people get value from the tab by acting on recent past purchases, even before recommendations unlock.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/lists/BottomNav.svelte`: already contains the disabled `Anbefalinger` placeholder tab and is the activation point for this phase.
- `src/routes/(protected)/+page.svelte`: current list home is the likely place where "active/current list" context originates for add-back behavior.
- `src/lib/queries/items.ts`: existing add-item and list mutation patterns can anchor add-back actions from history/recommendations.
- `src/lib/types/database.ts`: typed access already exists for `item_history`, `list_items`, and related tables.

### Established Patterns
- Mobile-first list UIs are compact and action-oriented rather than dashboard-like.
- Bottom navigation is the established way to expose primary sections across the app.
- Norwegian-first copy should be used for history, recommendation, and empty-state messaging.
- Existing flows already use subtle inline feedback and toast-like status patterns instead of heavy modal confirmations.

### Integration Points
- `item_history` already contains `item_name`, `list_id`, `checked_by`, and `checked_at`, and is household-scoped through RLS.
- The bottom nav can promote `Anbefalinger` from inactive placeholder to active route.
- Add-back actions need to connect history/recommendation rows with the existing shopping-list mutation flow.
- Store context may need to be joined from list-level data because `item_history` itself does not currently store store metadata directly.

</code_context>

<deferred>
## Deferred Ideas

- Any recommendation capability beyond frequency-based and co-purchase suggestions, including collaborative filtering or ML ranking, remains out of scope.
- Any richer analytics or trend visualizations on purchase history are separate future work.

</deferred>

---

*Phase: 06-history-view-and-recommendations*
*Context gathered: 2026-03-11*
