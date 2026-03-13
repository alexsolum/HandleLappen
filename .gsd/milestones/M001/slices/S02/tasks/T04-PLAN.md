# T04: Plan 04

**Slice:** S02 — **Milestone:** M001

## Description

Wire Supabase Realtime subscriptions so that changes made on one device appear on all other devices viewing the same list or home screen within 3 seconds — without a page refresh.

Purpose: This is the LIST-06 requirement and the defining UX of a real-time collaborative shopping list. The implementation is intentionally minimal: `postgres_changes` events → `invalidateQueries`. No manual cache splicing, no complex merge logic — TanStack Query re-fetches and the UI updates.
Output: Two `$effect` blocks in the two key pages, and a two-context Playwright test proving sub-3-second cross-device sync.
