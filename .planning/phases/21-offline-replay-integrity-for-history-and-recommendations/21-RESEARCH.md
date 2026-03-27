# Phase 21: Offline Replay Integrity for History and Recommendations - Research

**Researched:** 2026-03-27  
**Domain:** Offline mutation replay determinism, idempotent history writes, recommendation integrity  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

No `*-CONTEXT.md` exists for this phase directory, so constraints come from roadmap/audit scope.

### Locked Decisions
- **Goal**: Offline mutation replay is deterministic and idempotent so successful check-off events are cleared even if later queue entries fail, preventing duplicate history writes and recommendation skew.
- **Depends on**: Phase 20.
- **Scope type**: Audit gap closure for integration and flow correctness (not net-new feature surface).
- **Success criteria**:
  1. Queue drain removes successfully replayed entries even when one or more later entries fail in the same batch.
  2. Reconnect replay does not duplicate already-successful `item_history` writes across retry cycles.
  3. Recommendation source queries are not skewed by duplicate history rows created by mixed replay success/failure paths.
  4. Regression tests cover mixed replay outcomes (success followed by failure and retry) and demonstrate stable results.

### Claude's Discretion
- Choose the implementation shape for deterministic replay (queue API and drain contract).
- Choose the minimum test strategy and where to anchor assertions (offline queue + history/recommendation outcomes).

### Deferred Ideas (OUT OF SCOPE)
- Broader offline architecture rewrite.
- Recommendation algorithm redesign beyond duplicate-protection correctness.
</user_constraints>

## Summary

The audit gap is concrete and localized: queue draining in [`src/routes/(protected)/+layout.svelte`](C:/Users/HP/Documents/Koding/HandleAppen/src/routes/(protected)/+layout.svelte) currently uses all-or-nothing semantics. It replays every queued entry, but only calls `clear()` if *all* entries succeed. If any later replay fails, earlier successful entries remain queued and are replayed again on next reconnect. Because replay writes directly to `item_history`, this can duplicate successful history events and inflate recommendation counts.

The most reliable phase plan is to keep the existing storage and replay primitives, but change the drain contract to partial acknowledgement: remove each entry from the queue immediately after successful replay (or compute survivors and persist only failed entries at end), while preserving failed entries for retry. This yields deterministic retry behavior without introducing new product surface. Recommendation correctness then follows naturally because duplicate history inserts from mixed replay outcomes stop occurring.

Testing must explicitly simulate mixed replay outcomes. Existing offline tests only assert single-item sync and pending-count clearing; they do not force success-then-failure replay batches. Add regression coverage that verifies (a) successful entries are removed even when later entries fail, (b) retries replay only failed entries, and (c) history/recommendation queries stay stable after retry cycles.

**Primary recommendation:** Implement partial-ack queue draining (successes removed, failures retained) and add replay-regression tests that prove no duplicate `item_history` effects across reconnect retries.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.100.1 | Replay writes to `list_items` and `item_history`; recommendation RPC calls | Existing data path is Supabase-first end to end |
| `idb-keyval` | 6.2.2 | Persistent offline mutation queue (`get`/`set`) | Already integrated; minimal and sufficient for key/value queue state |
| `@tanstack/svelte-query` | 6.1.10 | Mutation/query invalidation around list item state | Existing mutation lifecycle and cache invalidation contract |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | 1.58.2 | End-to-end replay correctness and reconnect behavior | Integration/flow correctness across offline/online transitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Partial-ack in current queue | New server outbox/event-sourcing layer | Stronger global idempotency but much larger scope than Phase 21 audit closure |
| Current insert semantics | `upsert` + new unique replay key in `item_history` | Requires schema and identity model changes; useful later but not required to close this gap |

**Installation:**
```bash
# No new packages required for Phase 21
```

**Version verification (npm registry):**
- `@supabase/supabase-js` `2.100.1` (published 2026-03-26)
- `@tanstack/svelte-query` `6.1.10` (published 2026-03-23)
- `idb-keyval` `6.2.2` (published 2025-05-08)
- `@playwright/test` `1.58.2` (published 2026-02-06)

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── lib/offline/queue.ts                 # Queue storage + replay primitives
├── routes/(protected)/+layout.svelte    # Reconnect drain orchestration
├── lib/queries/recommendations.ts       # Recommendation consumer of history aggregates
└── lib/queries/history.ts               # History consumer path

tests/
├── offline.spec.ts                      # Existing offline behavior tests
├── history.spec.ts                      # Existing history flow tests
└── recommendations.spec.ts              # Existing recommendation flow tests
```

### Pattern 1: Partial-Ack Replay Drain
**What:** Replay all queued entries, persist only failed entries back to queue.  
**When to use:** Any reconnect drain where batch entries can fail independently.  
**Example:**
```typescript
// Source: local implementation target
const queued = await getAll()
const failed: QueuedMutation[] = []

for (const entry of queued) {
  try {
    await replayMutation(supabase, entry)
  } catch {
    failed.push(entry)
  }
}

await writeQueue(failed) // or remove each success incrementally
await refreshPendingCount()
if (queued.length > 0 && failed.length === 0) showSyncToast()
```

### Pattern 2: Replay Result Contract (Do Not Throw Away Batch Context)
**What:** Return replay outcome metadata (`succeeded`, `failed`) from drain logic for UI and tests.  
**When to use:** Needed for deterministic assertions and stable UX messaging.  
**Example:**
```typescript
type DrainResult = { succeeded: number; failed: number }
```

### Anti-Patterns to Avoid
- **All-or-nothing clear:** Causes duplicate replay of prior successes when a later entry fails.
- **Silent retry without queue rewrite:** Leaves queue state ambiguous and hard to test.
- **Recommendation-layer patching for upstream duplicates:** Hides root cause and leaves history integrity broken.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline queue persistence | Custom IndexedDB wrapper from scratch | `idb-keyval` already in project | Existing persistence path is stable and minimal |
| Retry/resume correctness assertions | Manual ad-hoc browser testing only | Playwright offline/online automation | Needed to prove mixed replay outcomes repeatably |
| Duplicate shielding in recommendations | Complex dedupe SQL to mask bad history writes | Fix replay semantics upstream | Root-cause fix preserves history correctness for all consumers |

**Key insight:** Phase 21 should correct replay semantics at the queue boundary, not downstream in history/recommendation reads.

## Common Pitfalls

### Pitfall 1: Success-Then-Failure Batch Leaves Successes Queued
**What goes wrong:** Entry A succeeds, entry B fails, queue keeps A+B; next reconnect replays A again.  
**Why it happens:** `clear()` only runs when `allSucceeded === true` in drain loop.  
**How to avoid:** Persist survivors (`failed[]`) after each drain cycle.  
**Warning signs:** Pending count never drops after partial success; duplicate rows in `item_history` for same logical check-off event.

### Pitfall 2: Replay/Online Toggle Write Shape Divergence
**What goes wrong:** Online toggle writes extra context (`list_name`, `store_id`, `store_name`), replay path does not.  
**Why it happens:** Queue payload currently stores only core check-off fields.  
**How to avoid:** Decide explicitly whether replay parity matters for Phase 21; if yes, extend payload and replay insert.  
**Warning signs:** Replayed history rows have systematically missing snapshot metadata vs online rows.

### Pitfall 3: False Confidence from Existing Offline Test Coverage
**What goes wrong:** Current tests pass while mixed-outcome replay bug remains.  
**Why it happens:** Existing `tests/offline.spec.ts` covers single queued mutation and reconnect success only.  
**How to avoid:** Add tests that force first replay success, second replay failure, then retry.  
**Warning signs:** No test asserts queue survivor set after partial batch failure.

## Code Examples

Verified patterns from project sources:

### Current All-or-Nothing Drain (Bug Source)
```typescript
// Source: src/routes/(protected)/+layout.svelte
let allSucceeded = true
for (const entry of queued) {
  try {
    await replayMutation(data.supabase, entry)
  } catch {
    allSucceeded = false
  }
}
if (allSucceeded) {
  await clear()
}
```

### Replay Write Path into History
```typescript
// Source: src/lib/offline/queue.ts
if (isChecked) {
  const { error: historyError } = await supabase.from('item_history').insert({
    list_id: listId,
    item_id: itemId,
    item_name: itemName,
    checked_by: userId,
    checked_at: timestamp
  })
  if (historyError) throw historyError
}
```

### Recommendation Aggregates Depend on History Counts
```sql
-- Source: supabase/migrations/20260311000002_phase6_recommendations.sql
select count(*) as purchase_count
from public.item_history ih
...
group by lower(trim(ih.item_name))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Batch succeeds only if all entries succeed, then `clear()` | Partial acknowledgement per entry (recommended for this phase) | Phase 21 target | Prevents re-replay of successful events after mixed outcomes |
| Rely on downstream recommendation behavior | Enforce upstream replay determinism/idempotency | Phase 21 target | Stops skew at source and stabilizes all history consumers |

**Deprecated/outdated:**
- All-or-nothing queue clearing in reconnect drain for mixed replay outcomes.

## Open Questions

1. **Should replayed history writes include `list_name/store_name/store_id` parity with online writes?**
   - What we know: Online path writes these fields; replay path does not.
   - What's unclear: Whether Phase 21 should close this as part of integrity scope or keep minimal audit fix.
   - Recommendation: Decide in planning; if kept out of scope, record as explicit residual risk.

2. **Where should mixed replay failure be injected in tests?**
   - What we know: Existing E2E harness can toggle offline/online and observe queue/debug state.
   - What's unclear: Best deterministic failure injection point (network abort, API route intercept, or test-only hook).
   - Recommendation: Use deterministic API interception in Playwright for one replay call to avoid flakiness.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright `@playwright/test` 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/offline.spec.ts --reporter=list` |
| Full suite command | `npx playwright test tests/offline.spec.ts tests/history.spec.ts tests/recommendations.spec.ts --reporter=list` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-21-01 | Partial success drains succeeded entries even if later entry fails | integration/e2e | `npx playwright test tests/offline.spec.ts --grep "mixed replay outcome" --reporter=list` | ❌ Wave 0 |
| SC-21-02 | Retry cycle does not duplicate already successful history writes | integration/e2e | `npx playwright test tests/offline.spec.ts --grep "no duplicate history on retry" --reporter=list` | ❌ Wave 0 |
| SC-21-03 | Recommendation results are stable after replay retry cycles | integration/e2e | `npx playwright test tests/recommendations.spec.ts --grep "stable after replay retry" --reporter=list` | ❌ Wave 0 |
| SC-21-04 | Regression path (success then failure then retry) remains deterministic | integration/e2e | `npx playwright test tests/offline.spec.ts tests/recommendations.spec.ts --grep "replay retry" --reporter=list` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/offline.spec.ts --reporter=list`
- **Per wave merge:** `npx playwright test tests/offline.spec.ts tests/history.spec.ts tests/recommendations.spec.ts --reporter=list`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/offline.spec.ts` — add deterministic mixed replay outcome case (success then failure).
- [ ] `tests/offline.spec.ts` or `tests/helpers/history.ts` — add DB assertion helper for duplicate history detection after retry.
- [ ] `tests/recommendations.spec.ts` — add stability test proving recommendation counts are unchanged by retry cycles.
- [ ] Optional test hook surface (app/test-only) for deterministic single-entry replay failure injection.

## Sources

### Primary (HIGH confidence)
- [`C:/Users/HP/Documents/Koding/HandleAppen/src/routes/(protected)/+layout.svelte`](C:/Users/HP/Documents/Koding/HandleAppen/src/routes/(protected)/+layout.svelte) - reconnect drain behavior and all-or-nothing clear
- [`C:/Users/HP/Documents/Koding/HandleAppen/src/lib/offline/queue.ts`](C:/Users/HP/Documents/Koding/HandleAppen/src/lib/offline/queue.ts) - queue storage contract and replay write path
- [`C:/Users/HP/Documents/Koding/HandleAppen/src/lib/queries/recommendations.ts`](C:/Users/HP/Documents/Koding/HandleAppen/src/lib/queries/recommendations.ts) - recommendation RPC dependency chain
- [`C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260311000002_phase6_recommendations.sql`](C:/Users/HP/Documents/Koding/HandleAppen/supabase/migrations/20260311000002_phase6_recommendations.sql) - aggregation/count behavior sensitive to duplicate history rows
- [`C:/Users/HP/Documents/Koding/HandleAppen/.planning/v1.0-v1.0-MILESTONE-AUDIT.md`](C:/Users/HP/Documents/Koding/HandleAppen/.planning/v1.0-v1.0-MILESTONE-AUDIT.md) - critical integration gap statement for Phase 21

### Secondary (MEDIUM confidence)
- https://supabase.com/docs/reference/javascript/upsert - idempotency option references (`upsert`, `onConflict`, `ignoreDuplicates`)
- https://playwright.dev/docs/api/class-browsercontext - `browserContext.setOffline()` for deterministic offline/online test transitions
- https://github.com/jakearchibald/idb-keyval - queue persistence API semantics and atomic update caveat

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified via npm and already present in project.
- Architecture: HIGH - derived from direct code-path and audit evidence in this repo.
- Pitfalls: HIGH - mapped to explicit current implementation behavior and missing test coverage.

**Research date:** 2026-03-27  
**Valid until:** 2026-04-26
