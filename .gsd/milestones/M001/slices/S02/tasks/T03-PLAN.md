# T03: Plan 03

**Slice:** S02 — **Milestone:** M001

## Description

Build the list detail view — where shopping actually happens — with item add/remove/check-off, the persistent bottom input bar, the collapsible Done section, and the HIST-01 history write on check-off.

Purpose: This is the primary shopping interaction surface. Every mutation uses optimistic updates so the app feels instant even on a slow connection. The history write happens in the same mutationFn as the check-off toggle — never in a trigger — so it is visible to the Svelte layer and testable.
Output: Full list detail page with working item CRUD, check-off flow, Done section, and verified item_history inserts.
