# Pitfalls Research

**Domain:** Family grocery shopping PWA with Supabase Realtime, household sharing, barcode scanning, store-layout-aware lists
**Researched:** 2026-03-08
**Confidence:** HIGH (Supabase limits and RLS patterns verified against official docs; iOS camera issues verified against Apple Developer Forums and STRICH knowledge base; barcode API verified against official Kassal.app docs)

---

## Critical Pitfalls

### Pitfall 1: Supabase Realtime Channels Never Cleaned Up (Memory Leak)

**What goes wrong:**
Every call to `supabase.channel('name')` appends a new `RealtimeChannel` object to the client's internal channels array. In React, if the `useEffect` that creates the subscription does not call `supabase.removeChannel(channel)` in its cleanup function, each render/mount cycle grows the array without bound. After a long session (navigating between lists, going in and out of the shopping view), the browser accumulates hundreds of phantom subscriptions, all receiving events. This causes duplicate state updates, sluggish UI, and eventually crashes the tab on lower-end Android devices. React 18 Strict Mode doubles the effect — every channel is created twice in development, making the leak appear immediately.

**Why it happens:**
Supabase documentation examples historically did not emphasize cleanup. Developers copy-paste subscription code into `useEffect` without a return function. The channels array grows silently — there is no error, just degraded performance.

**How to avoid:**
Always pair channel creation with removal in the same `useEffect`:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('list-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [listId]);
```

Use `supabase.getChannels()` in development to assert only N channels are open at any time. Never share a single channel reference across multiple components — create one per logical subscription scope.

**Warning signs:**
- Event handlers firing 2x, 4x, 8x per database change
- `supabase.getChannels().length` growing over a session
- Performance degrades after navigating between shopping lists multiple times

**Phase to address:** Core real-time sync phase (when list subscriptions are first built)

---

### Pitfall 2: Postgres Changes DELETE Events Are Not Filterable and Bypass RLS

**What goes wrong:**
Developers assume that setting up an RLS policy on the `list_items` table means only authorized users will receive DELETE events via Postgres Changes. This is wrong. Supabase's own documentation states: "RLS policies are not applied to DELETE statements" because Postgres cannot verify user access to an already-deleted row. Additionally, DELETE events cannot be filtered by column value. A subscription listening for `filter: 'list_id=eq.123'` will NOT reliably filter DELETE events. The client receives every deletion on the subscribed table, with only primary key data in the `old` record (unless `REPLICA IDENTITY FULL` is set).

**Why it happens:**
The INSERT and UPDATE event documentation correctly shows filtered subscriptions working as expected. Developers assume DELETE follows the same rules. The limitation is buried in fine print in the Postgres Changes docs.

**How to avoid:**
Two approaches, pick one:

1. **Never rely on DELETE events for security.** Apply application-level filtering on the client after receiving the event: check that the deleted `id` belongs to your current context before acting on it.
2. **Use Broadcast instead of Postgres Changes for mutations you control.** When a list item is deleted via an Edge Function or client call, emit a Broadcast event (`{ event: 'item-deleted', payload: { id, list_id } }`) on a channel scoped to the household. Broadcast is filterable and does not have the RLS limitation.

For a grocery app where security is household-level (not per-item), approach (2) is cleaner: use Broadcast channels named `household:{household_id}` and manually emit change events. This also scales better — Postgres Changes processes on a single thread, Broadcast does not.

**Warning signs:**
- DELETE events arriving for items from other lists during integration testing
- Client throwing "item not found" errors when processing deletions

**Phase to address:** Real-time sync architecture phase — decide Postgres Changes vs. Broadcast before building any subscription code

---

### Pitfall 3: RLS Policy Recursion on Household Membership Table

**What goes wrong:**
The natural data model has a `household_members` join table (`user_id`, `household_id`). To protect `lists` (which belong to a household), you write an RLS policy like:

```sql
-- BROKEN: causes infinite recursion
CREATE POLICY "household members can see lists"
ON lists FOR SELECT
USING (
  household_id IN (
    SELECT household_id FROM household_members WHERE user_id = auth.uid()
  )
);
```

This works in isolation, but the moment `household_members` itself has an RLS policy (which it must, to prevent users from seeing other households' membership), Postgres enters infinite recursion: checking `lists` triggers a check on `household_members`, which triggers its own policy, which may reference back to `lists`. The error is `ERROR: infinite recursion detected in policy for relation "household_members"` and it breaks ALL queries on affected tables.

**Why it happens:**
RLS policies evaluate recursively. Developers write separate policies for each table without realizing they create a circular dependency when both tables reference each other.

**How to avoid:**
Wrap membership checks in a `SECURITY DEFINER` function. Security definer functions bypass RLS on the tables they query, breaking the recursion:

```sql
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- Policy that uses the function (no recursion)
CREATE POLICY "household members can see lists"
ON lists FOR SELECT
USING (household_id IN (SELECT get_my_household_ids()));
```

Additionally, wrap `auth.uid()` calls in a `SELECT` subquery in all policies — this caches the result per query instead of re-evaluating per row, reducing policy overhead from ~179ms to ~9ms on large tables (measured by Supabase).

**Warning signs:**
- `infinite recursion detected` errors immediately after adding a second table's RLS policy
- Queries returning empty results after enabling RLS (often confused with recursion when policies silently break)

**Phase to address:** Auth and household data model phase — establish security definer pattern before writing any RLS policies

---

### Pitfall 4: iOS Safari PWA Camera Permissions Reset on Every Launch

**What goes wrong:**
When a user adds the HandleAppen PWA to their iOS home screen (the `apple-mobile-web-app-capable` behavior), camera permissions are NOT persisted between sessions. Every time the user opens the app from the home screen and tries to scan a barcode, iOS prompts for camera access again. This is a known, long-standing WebKit bug (bug #215884 on the WebKit bug tracker). The permission also resets when the app is sent to the background and brought back. On iOS 18, the problem worsened — the Shape Detection API (which had partial barcode support) regressed and is reported broken as of the iOS 18 update.

**Why it happens:**
PWA standalone mode on iOS runs in a separate WebKit process that does not share permission state with Safari. Apple has not fixed this despite it being reported since iOS 13.

**How to avoid:**
Do not rely on the `BarcodeDetector` Web API on iOS — it is not implemented in WebKit/Safari at all, on any iOS version. Use a WebAssembly-based barcode library instead:

- **`barcode-detector` npm package (v3+)** — polyfills the `BarcodeDetector` API using ZXing-C++ WASM; works on iOS Safari
- **`barcode-detector-polyfill`** — ZBar compiled to WASM via Emscripten; handles EAN-13, EAN-8, UPC-A, Code 128 (all formats needed for Norwegian grocery barcodes)

For the camera permission reset: implement a graceful re-request flow. Show an explicit "Tap to activate camera" button that calls `getUserMedia()` on user gesture each session, instead of auto-starting the camera. This is less surprising than a repeated system prompt appearing automatically. Consider providing a manual EAN input field as the reliable fallback — many users will prefer typing in poor lighting anyway.

**Warning signs:**
- Barcode scanning "works on desktop/Android but not iPhone"
- `BarcodeDetector is not defined` errors in console on iOS
- Users report being asked for camera permission every time they open the app

**Phase to address:** Barcode scanning phase — design around WASM from the start, not as an afterthought when iOS bugs appear

---

### Pitfall 5: Store Layout Category Ordering Using Sequential Integers (The Position Column Trap)

**What goes wrong:**
The obvious data model for ordered categories is a `position` integer column (1, 2, 3, ...). This works until a user reorders categories: moving "Frozen" from position 8 to position 3 requires updating every row between positions 3-8 to shift them. With 10-15 categories per store layout, this is 8 UPDATE statements in a transaction. With multiple family members editing layouts simultaneously, this creates write contention and Realtime events for every shifted row — flooding the subscription with irrelevant change events that appear as layout thrashing on other devices.

**Why it happens:**
Sequential integers are the intuitive first choice. The mutation overhead only becomes apparent when implementing drag-and-drop reordering UI.

**How to avoid:**
Use **lexicographic fractional indexing** (also called "order key" pattern). Store position as a string or float with gaps:

- Initial positions: `"a"`, `"b"`, `"c"` (or integers with gaps: 1000, 2000, 3000)
- Moving "Frozen" between positions `"b"` and `"c"` produces `"bm"` (or 1500)
- Only ONE row is updated per reorder operation

For this app, the simplest safe implementation: use `NUMERIC` with gaps of 1000, start at 1000. When a user reorders, set the new position to `(prev_position + next_position) / 2`. Re-normalize positions (reset to 1000, 2000, ...) only when precision exhausts (detectable when gap < 1). This is one UPDATE per drag. Combined with optimistic UI, reordering feels instant and emits a single Realtime event.

Apply the same pattern to the `list_items` table if item ordering within categories is needed.

**Warning signs:**
- Realtime subscription showing 10+ events for a single category reorder
- Write conflicts on the layout table when two family members save changes simultaneously
- Sluggish drag-and-drop UI during reordering

**Phase to address:** Store layout / category management phase

---

### Pitfall 6: Offline Conflict — Both Devices Check Off the Same Item

**What goes wrong:**
Family member A is shopping in-store with poor connectivity. They check off "Milk." Family member B, also shopping, checks off "Milk" offline two seconds later. Both devices queue the operation locally (IndexedDB). When connectivity resumes, both sync — resulting in either a duplicate "checked off" event or a conflict where one device's state clobbers the other. More problematically: if A also adds "Butter" while offline, and B deletes the list item category while offline, syncing produces an item without a valid category FK reference.

**Why it happens:**
Developers implement offline-first as a simple queue flush (send all pending operations on reconnect) without considering concurrent edits. For a shopping list, the naive last-write-wins approach based on wall-clock timestamps fails because device clocks are not synchronized and network delays skew ordering.

**How to avoid:**
For a **shopping list** specifically, conflict resolution is simpler than general document sync because the operations are coarse and largely commutative:

1. **Checked-off is idempotent.** Both devices checking off the same item produces the same result. Model the `checked` field as a monotone boolean: `true` wins over `false`, always. Never "un-check" based on a stale timestamp. In the DB, use: `UPDATE list_items SET checked = checked OR $1`.

2. **Additions are additive.** Two devices adding the same named item results in a duplicate — acceptable for v1, or de-duplicate on name + category on sync.

3. **Deletions are the risky case.** Do not hard-delete items on the client while offline. Queue a delete operation with a `client_timestamp`. On sync, the server applies the delete only if the item has not been checked off by another user since the client timestamp. Use soft deletes (`deleted_at TIMESTAMPTZ`) and resolve on the server via an Edge Function.

4. **Category FK integrity.** Apply foreign key constraints with `ON DELETE SET NULL` for `category_id`, not `ON DELETE CASCADE`. This prevents a category deletion from silently removing all items assigned to it.

**Warning signs:**
- Items appearing/disappearing when connectivity is restored
- Duplicate items in the list after a shared shopping session
- Test: put two browser tabs in offline mode, make conflicting changes, bring both online — observe the result

**Phase to address:** Offline sync phase — define conflict policy per operation type before implementing the sync queue

---

### Pitfall 7: Over-Engineering the Recommendation Engine

**What goes wrong:**
The recommendation section is scoped to "history-based + co-purchase suggestions." Teams frequently interpret this as requiring collaborative filtering across users, a separate ML model, or a vector similarity service. They spend 2-3 phases building a recommendation pipeline before verifying that families actually click on suggestions. The real dataset at launch is a single household's purchase history — typically 100-500 item entries — far too small for collaborative filtering, which degrades with sparse data.

**Why it happens:**
Collaborative filtering is the well-known "Amazon does this" pattern. Engineers reach for it by default. The complexity also feels proportional to the feature's prominence in the nav bar.

**How to avoid:**
For v1, recommendations should be purely frequency-based SQL:

```sql
-- "You usually buy these" — items checked off most in last 90 days
SELECT item_name, category_id, COUNT(*) as frequency
FROM shopping_history
WHERE household_id = $1
  AND checked_at > NOW() - INTERVAL '90 days'
GROUP BY item_name, category_id
ORDER BY frequency DESC
LIMIT 20;
```

Co-purchase suggestions (items bought together): a simple JOIN on the same `shopping_session_id` grouping, counting co-occurrence pairs. This is a single SQL query, no ML pipeline needed.

Collaborative filtering across households requires: shared data consent model, household privacy considerations, minimum data volume to produce non-garbage results. None of these are designed for in the current requirements. The Norwegian market is also small — cross-household similarity data will be sparse for months.

**Build the simplest thing that could be useful, gate on engagement data before adding complexity.** If family members don't tap the recommendation section in the first two weeks, the entire feature is lower priority than assumed.

**Warning signs:**
- Planning a separate service or vector database for recommendations
- Spending more than one phase on the recommendation feature before shipping
- Designing a schema that requires cross-household data without a privacy model

**Phase to address:** Recommendation section phase — explicitly constrain scope to frequency SQL in the phase definition

---

### Pitfall 8: Kassal.app API Used Directly from the Client (Key Exposure + Rate Limits)

**What goes wrong:**
The Kassal.app API requires a Bearer token. If a barcode lookup call is made directly from the browser (client-side fetch), the API key is visible in browser DevTools network tab and JavaScript bundles. Additionally, the free hobby plan is capped at 60 requests/minute. A family of 4 scanning barcodes simultaneously while setting up their initial list could exhaust the rate limit in seconds, returning HTTP 429 errors with no user-visible explanation.

**Why it happens:**
The simplest implementation of barcode lookup is a direct client fetch. Supabase's client-side SDK makes this feel natural. The API key exposure risk is easy to overlook when iterating quickly.

**How to avoid:**
Route all barcode lookups through a **Supabase Edge Function**:

1. The Edge Function holds the Kassal.app API key in environment secrets (never exposed to the client)
2. The Edge Function can implement response caching: cache barcode-to-product mappings in the Supabase database's `product_cache` table. Norwegian EAN codes do not change — a barcode lookup result is valid indefinitely. After the first lookup, subsequent requests for the same EAN are served from DB, not the external API.
3. With caching, the 60 req/min limit only matters for first-time lookups of new EANs — in practice, a family's common products are scanned repeatedly and are cached after the first time.

For Open Food Facts (fallback): this API is open and rate-limit-tolerant, but should still route through the Edge Function for consistency.

**Warning signs:**
- API key appearing in browser Network tab
- HTTP 429 errors during barcode scanning sessions
- Product lookups failing for a household member while another is scanning

**Phase to address:** Barcode scanning phase — establish Edge Function proxy pattern before wiring up the scan UI

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct client-to-Kassal.app API calls | Faster to prototype | API key exposed; no caching; rate limit hits | Never — use Edge Function from day one |
| Sequential integer position column | Simpler initial schema | 8+ UPDATEs per reorder, Realtime event floods | Never for user-reorderable lists |
| Hard deletes on list items | Simpler schema, no `deleted_at` | Unrecoverable sync errors when deleting while offline | Only if offline is explicitly not supported |
| Skipping SECURITY DEFINER functions in RLS | Fewer abstractions | Infinite recursion the moment tables cross-reference each other | Never — write the function once, use everywhere |
| Using `BarcodeDetector` API without WASM fallback | Less code | Feature silently broken for all iOS users | Never — iOS is likely majority of family mobile users |
| Storing Realtime subscriptions outside React state management | Quick to wire up | Channel leak if component re-renders; hard to debug | Never — always manage channel lifecycle in effect cleanup |
| Fetching full list on every Realtime event | Simpler state logic | Unnecessary network round-trips, flickering UI | Only during early prototyping, remove before first user test |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Kassal.app API | Calling from browser with key in env var | Supabase Edge Function proxy with response caching in DB |
| Kassal.app API | Assuming 100% product coverage for Norwegian EANs | Always implement Open Food Facts as fallback; show graceful "product not found, enter manually" UI |
| Supabase Realtime Postgres Changes | Assuming DELETE events respect RLS filters | Never rely on DELETE events for access control; use Broadcast or app-level filtering |
| Supabase Realtime | Creating channels without cleanup | Always `removeChannel()` in useEffect return function |
| iOS camera (PWA) | Using `BarcodeDetector` Web API | Use WASM polyfill (barcode-detector npm package); trigger camera on explicit user gesture each session |
| IndexedDB offline queue | Flushing entire queue on reconnect without deduplication | Assign each queued operation a UUID; server-side idempotency keys prevent double-application |
| Open Food Facts | Assuming product names are in Norwegian | Product names are often in English or the origin country language; display as-is with manual override option |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS policy with uncached `auth.uid()` subquery | Every row-level read triggers multiple auth lookups; query times 10-20x higher than expected | Wrap in `(select auth.uid())` to cache per query; verified improvement from 179ms to 9ms | At >100 rows in any table with complex RLS |
| RLS policy with inline JOIN to `household_members` | Query times grow with household membership table size | Use `SECURITY DEFINER` function returning household ID set; reverse the join direction | At >10 households or complex policy chains |
| Subscribing to entire table via Postgres Changes without filter | All events for all households broadcast to all connected clients, then filtered client-side | Always pass `filter: 'household_id=eq.{id}'` in the subscription config | At >5 concurrent households using the app |
| Caching all product images for barcode lookups in Service Worker cache | Cache storage grows unboundedly; Safari evicts entire origin data at 7 days of inactivity | Set explicit cache size limit; use LRU eviction in service worker; only cache app shell, not product images | When cached images exceed ~50MB (Safari's effective soft limit for PWA storage) |
| Fetching full list on every Realtime event (re-fetch pattern) | Network waterfall on every item check-off; UI stutters during active shopping | Apply optimistic updates locally; use the Realtime payload directly to update state without re-fetch | At >2 concurrent users making rapid changes |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Kassal.app API key in client bundle | API key stolen, quota exhausted, potential billing if on Business plan | Store key only in Supabase Edge Function secrets; never in client env vars |
| Using `user_metadata` in RLS policies | Users can modify their own metadata via the Supabase client; a user could elevate their `role` claim | Only use `auth.uid()` and database-stored roles in RLS policies; verify household membership from DB, not JWT claims |
| Forgetting RLS on new tables | All authenticated users can read/write any row | Run a migration audit script: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` — verify every table has RLS enabled |
| Service role key in client code | Bypasses all RLS; complete data exposure | The service role key must never appear in client code or public env vars; only in server-side Edge Function secrets |
| Not rate-limiting the barcode lookup Edge Function | A malicious user could exhaust Kassal.app API quota or cause billing overrun | Add per-user rate limiting in the Edge Function (check call frequency by `auth.uid()` against a calls log table) |
| Household invite links with no expiry | Old invite links reused to join household without owner's knowledge | Expire invite tokens after 48 hours or single use; store in DB with `used_at` and `expires_at` columns |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-starting camera on page load | iOS PWA prompts for permission immediately; user hasn't indicated intent to scan; feels intrusive | Show explicit "Scan barcode" button; call `getUserMedia()` only on tap |
| Showing a loading spinner during Realtime sync | During shopping, items appear to "load" when another family member adds something; disorienting | Use optimistic updates; items appear instantly on the adding device; animate in on other devices without blocking UI |
| Sorting categories alphabetically as default | "Chips" appears before "Dairy" — useless in-store | Always use layout-order sort as default; only fall back to alphabetical when position data is missing |
| Losing scroll position when list updates | Family member checks off item → entire list re-renders → user's scroll position jumps to top | Apply fine-grained state updates (update only the changed item in local state); never replace the entire list array reference |
| Not distinguishing "checked" from "deleted" in list view | Checked items scroll to bottom or disappear — user loses context of what they already have in the cart | Keep checked items visible in a "In Cart" section below unchecked items; only fully remove on "Complete Shopping" action |
| Generic "Error" messages for barcode scan failures | User doesn't know if the product exists in Norwegian databases or if their camera failed | Show specific messages: "Barcode not found in Norwegian databases — add manually" vs. "Camera unavailable — check permissions" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Real-time sync:** Verify that channels are cleaned up — open browser DevTools, navigate between lists, run `supabase.getChannels().length` — it should stay constant, not grow
- [ ] **Barcode scanning:** Test on a real iPhone using the PWA installed to home screen — desktop testing will show false success since `BarcodeDetector` works in Chrome
- [ ] **Offline sync:** Test by: add items on device A (offline), add conflicting items on device B (offline), bring both online simultaneously — confirm no duplicate/missing items
- [ ] **RLS coverage:** Run `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` after each migration — result must be empty
- [ ] **Category ordering:** Drag a category to a new position, verify exactly one UPDATE event appears in Supabase Realtime logs (not N events for N categories)
- [ ] **Kassal.app key security:** Open browser DevTools Network tab during a barcode scan — confirm no requests go directly to `kassal.app`; all calls should be to your Supabase Edge Function
- [ ] **iOS camera re-permission:** Install PWA to iPhone home screen, grant camera permission, close app, reopen — verify the permission prompt behavior is handled gracefully
- [ ] **Store layout per-store override:** Confirm a store-specific layout change does not affect the default layout for other stores or other households

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Channel memory leak discovered in production | LOW | Deploy fix with proper `removeChannel()` cleanup; no data migration needed; instruct users to refresh |
| RLS infinite recursion | MEDIUM | Identify circular table dependency; wrap membership lookup in `SECURITY DEFINER` function; deploy migration; verify with integration test suite |
| Position column approach requiring rewrite | HIGH | Migrate to fractional indexing: add `position_key NUMERIC` column, back-fill with `row_number() * 1000`, remove old integer column; requires coordination with active users |
| API key exposed in client bundle | HIGH | Rotate Kassal.app API key immediately; move call to Edge Function; redeploy; audit access logs for unauthorized use |
| iOS camera never working for PWA users | MEDIUM | Implement WASM barcode library as drop-in replacement for `BarcodeDetector`; add explicit per-session camera prompt UI |
| Offline sync producing corrupt state | HIGH | Implement server-side idempotency for all mutation operations; add soft deletes; may require a "reset and re-sync" recovery flow for affected users |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Channel memory leak | Real-time sync implementation phase | `supabase.getChannels().length` stays stable under navigation; React StrictMode does not double channels |
| Postgres Changes DELETE + RLS | Real-time architecture decision (before building subscriptions) | Integration test: delete an item as user A, confirm user B (different household) does not receive the event |
| RLS recursion on household tables | Auth + data model phase | All RLS policies use `SECURITY DEFINER` functions for cross-table lookups; regression test with two tables that reference each other |
| iOS camera permissions reset | Barcode scanning phase | Manual test on real iPhone PWA installed to home screen; camera accessible without crashing or looping permission prompts |
| Integer position column | Store layout / category management phase | Single reorder operation produces exactly one DB UPDATE; verified in Supabase logs |
| Offline sync conflicts | Offline-first / sync queue phase | Two-device offline conflict test; checked-off items use OR semantics; soft deletes in place |
| Recommendation over-engineering | Recommendation section phase | Phase scope explicitly bounded to frequency SQL; no external ML service in tech plan |
| Kassal.app key exposure | Barcode scanning phase | Network tab shows zero direct requests to `kassal.app` from browser |
| RLS policy performance | Auth + data model phase (established early) | `EXPLAIN ANALYZE` on list queries confirms policy functions cached via `(select auth.uid())` wrapper |
| Safari storage eviction | Offline / service worker phase | Service Worker cache has explicit size cap; product images not cached; app shell only |

---

## Sources

- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) — verified connection limits, channel limits, payload truncation behavior
- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) — DELETE event RLS limitation, filter restrictions
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — auth.uid() caching, JOIN reversal pattern, security definer functions
- [Supabase Realtime GitHub Issues — Channel Cleanup](https://github.com/supabase/realtime-js/issues/281) — documented community issue confirming channels need explicit removal
- [Supabase RLS Infinite Recursion Discussion](https://github.com/orgs/supabase/discussions/1138) — community-confirmed pattern; security definer solution
- [STRICH Knowledge Base — iOS PWA Camera Issues](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa) — confirmed permission reset behavior in PWA standalone mode; `apple-mobile-web-app-capable` workaround
- [Barcode Scanning on iOS — WebAssembly Solution (DEV Community)](https://dev.to/ilhannegis/barcode-scanning-on-ios-the-missing-web-api-and-a-webassembly-solution-2in2) — ZBar WASM approach for EAN-13 on iOS Safari
- [barcode-detector-polyfill (GitHub)](https://github.com/undecaf/barcode-detector-polyfill) — ZBar WASM polyfill, supports EAN-13/EAN-8/UPC
- [Kassal.app API Documentation](https://kassal.app/api) — 60 req/min free tier limit confirmed; Bearer token authentication requirement
- [Offline Sync and Conflict Resolution Patterns (sachith.co.uk, Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) — last-write-wins limitations, CRDT alternatives
- [Implementing Re-Ordering at the Database Level (Basedash)](https://www.basedash.com/blog/implementing-re-ordering-at-the-database-level-our-experience) — fractional indexing pattern for position columns
- [WebKit Storage Policy Updates](https://webkit.org/blog/14403/updates-to-storage-policy/) — Safari PWA 7-day eviction behavior and storage quota behavior
- [MDN Storage Quotas and Eviction Criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — cross-browser storage limit reference

---
*Pitfalls research for: Family grocery shopping PWA (HandleAppen) — Supabase Realtime, household RLS, iOS barcode scanning, offline sync*
*Researched: 2026-03-08*
