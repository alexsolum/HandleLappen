---
id: M001
provides:
  - mobile-safe protected shell, bottom-sheet, and bottom-dock contract across the signed-in shopping flow
  - inline main-list quantity controls with shared default quantity 1 semantics for typed and barcode-assisted add
  - household-scoped remembered item search, inline suggestions, and automatic remembered-category reuse
key_decisions:
  - Kept native dialog plus Tailwind instead of adding a sheet library, to stay consistent with the existing app and phase scope.
  - Kept row tap as the check-off action and isolated the stepper instead of repurposing the whole row for editing.
  - Used a dedicated household_item_memory table instead of scanning item_history so category reuse and mobile typeahead stay cheap and deterministic.
patterns_established:
  - Bottom sheets use fixed inset-0 dialogs with an inset max-w-lg card and max-h based on 100dvh.
  - Active rows can host secondary controls as long as pointer and click events are stopped before row-level actions.
  - Remembered suggestion search state lives on the list page while ItemInput stays responsible for presentation and local input reset behavior.
observability_surfaces:
  - tests/mobile-layout.spec.ts, tests/items.spec.ts, tests/barcode.spec.ts, and tests/item-memory.spec.ts targeted Playwright evidence
  - .planning/phases/06-history-view-and-recommendations/06-VERIFICATION.md phase verification trail
  - slice summaries S01-S11 (except missing S08 summary file) as milestone evidence log
requirement_outcomes:
  - id: MOBL-01
    from_status: active
    to_status: validated
    proof: S09 added a shared mobile-safe sheet contract and tests/mobile-layout.spec.ts verifies visible sheet actions and no horizontal overflow on phone-sized viewports.
  - id: MOBL-02
    from_status: active
    to_status: validated
    proof: S09 hardened the protected shell with overflow clipping and tests/mobile-layout.spec.ts asserts no horizontal overflow on the signed-in list screen.
  - id: MOBL-03
    from_status: active
    to_status: validated
    proof: S09 rebuilt BottomNav as a pinned icon dock with larger touch targets and dedicated mobile Playwright coverage verifies dock visibility/pinning.
  - id: LIST-07
    from_status: active
    to_status: validated
    proof: S10 shipped inline steppers on active rows and tests/items.spec.ts covers increment, decrement, remove-at-one, and row-tap independence.
  - id: LIST-08
    from_status: active
    to_status: validated
    proof: S10 made quantity 1 the shared persisted default for typed and barcode-assisted add flows, with focused tests in tests/items.spec.ts and tests/barcode.spec.ts.
duration: 2026-03-08 to 2026-03-12
verification_result: passed
completed_at: 2026-03-12
---

# M001: Migration

**Mobile-safe shopping flow upgrades are now in place: the signed-in app behaves more like a phone-native grocery tool, with fixed thumb-friendly navigation, inline quantity editing, and household memory-backed smart item entry.**

## What Happened

M001 started from the already-established v1.0 foundation and pushed the product toward the v1.1 goal: making the shopping experience feel smoother on phones while reducing repeated typing for common household items.

Across S01-S06, the app’s earlier platform capabilities were established and verified: authenticated household-aware access, shared lists and item CRUD, category/store ordering, barcode lookup infrastructure and scanner UI, PWA installability and offline queue guardrails, and history/recommendation surfaces. Those slices mattered because the later v1.1 work landed on top of a real end-to-end grocery workflow rather than isolated UI fragments.

The milestone’s core migration work then closed in S09-S11. S09 hardened the protected shell for narrow screens, normalized all item/barcode dialogs to one mobile-safe sheet contract, and rebuilt the bottom navigation into a pinned icon dock with larger tap targets. S10 added inline quantity controls directly on active list rows and made quantity `1` the real default across both typed and barcode-assisted add flows. S11 added a dedicated remembered-item data source, inline typeahead suggestions inside the fixed add bar, and automatic reuse of the latest valid household category when a remembered suggestion is chosen.

Together, those slices changed the main shopping loop in the way the milestone set out to do: add-item and edit flows now stay inside the viewport on phones, navigation is easier to hit, quantity editing no longer forces a detail-sheet detour, and recurring item entry can often be completed with a single suggestion tap.

## Cross-Slice Verification

Milestone roadmap success criteria were blank in `.gsd/milestones/M001/M001-ROADMAP.md`, so milestone verification used the active v1.1 project goals and requirement set as the concrete success surface.

- **Mobile-safe dialogs and no horizontal overflow:** Verified by S09 evidence. `tests/mobile-layout.spec.ts` covers phone-sized list screens, visible sheet actions, and no-horizontal-overflow assertions. S09 summary explicitly records overflow clipping in the protected shell and shared dialog normalization.
- **Fixed, larger mobile bottom navigation:** Verified by S09 evidence. `BottomNav.svelte` was rebuilt as a pinned icon-led dock and dedicated mobile Playwright coverage asserts dock visibility and pinning on small viewports.
- **Inline quantity controls on the main list:** Verified by S10 evidence. `tests/items.spec.ts` covers increment, decrement, remove-at-one behavior, and confirms row tap still performs check-off rather than conflicting with the stepper.
- **Default quantity `1` for new items:** Verified by S10 evidence. `tests/items.spec.ts` and `tests/barcode.spec.ts` confirm typed and barcode-assisted adds both persist quantity `1` unless changed.
- **Household suggestions and remembered categories:** Verified by S11 evidence already reflected in validated requirements. `tests/item-memory.spec.ts` covers first-letter appearance, narrowing, immediate-add from remembered suggestions, latest-category reuse, stale-memory fallback, and dropdown close behavior. `tests/mobile-layout.spec.ts` also verifies remembered dropdown containment on narrow phones.

Definition of done verification:

- **All slices checked off in roadmap:** Yes. S01-S11 are marked complete in the roadmap.
- **All slice summaries exist:** Not fully. S08 is marked complete in the roadmap, but `.gsd/milestones/M001/slices/S08/S08-SUMMARY.md` is missing. This is a documentation gap.
- **Cross-slice integration works:** Yes, with evidence. S09-S11 build directly on the protected mobile shell, fixed add bar, item query layer, barcode flow, and category data established earlier. Targeted Playwright evidence passed for mobile layout, items, barcode, remembered items, history, and recommendations in the respective slice summaries.

Because the milestone’s user-facing requirements are supported by slice-level passing evidence and the implementation is integrated end to end, verification passes. The missing S08 summary remains a bookkeeping defect, not an implementation blocker, and is documented below.

## Requirement Changes

- MOBL-01: active → validated — S09 added the shared mobile-safe dialog contract and `tests/mobile-layout.spec.ts` verifies no viewport-width overflow and visible actions on mobile sheets.
- MOBL-02: active → validated — S09 hardened the protected shell against sideways overflow and `tests/mobile-layout.spec.ts` asserts no horizontal overflow on mobile screens.
- MOBL-03: active → validated — S09 rebuilt the bottom navigation as a pinned icon dock with larger touch targets and verified it with dedicated mobile Playwright coverage.
- LIST-07: active → validated — S10 shipped inline quantity steppers on active rows and `tests/items.spec.ts` proves quantity can be changed directly from the main list.
- LIST-08: active → validated — S10 made quantity `1` the persisted default for typed and barcode-assisted adds, verified in `tests/items.spec.ts` and `tests/barcode.spec.ts`.

## Forward Intelligence

### What the next milestone should know
- The mobile shell contract is now stable: fixed dock, fixed add bar, and inset capped dialogs are intentionally treated as one coordinated bottom stack. New mobile surfaces should reuse that contract instead of inventing new spacing rules.
- Remembered-item behavior depends on the dedicated `household_item_memory` table plus trigger-backed sync on `list_items`; future smart-entry work should extend that backend contract rather than scraping history in the browser.
- The item row is now a multi-interaction surface: tap to check off, swipe to reveal delete, long-press to edit, and inline steppers for quantity. Any future interaction added to rows must preserve explicit event isolation.

### What's fragile
- `.gsd/milestones/M001/slices/S08/S08-SUMMARY.md` is still missing even though S08 is marked complete — this matters because milestone audits expect every checked slice to have a summary artifact.
- Local category/barcode verification can still drift if the Supabase instance referenced by `.env.local` has stale seed data — several summaries record this as environment drift rather than app-code failure.
- Repo-wide `npm run check` has been called out multiple times as containing pre-existing typing issues outside individual slice scope, so targeted passing suites are more trustworthy than assuming the whole workspace is clean.

### Authoritative diagnostics
- `tests/mobile-layout.spec.ts` — best proof for mobile-shell regressions because it directly asserts viewport containment, dock visibility, and sheet action visibility on phone-sized layouts.
- `tests/items.spec.ts` and `tests/barcode.spec.ts` — best proof for quantity semantics because they cover both inline list editing and add-flow defaults.
- `tests/item-memory.spec.ts` — best proof for recurring-item behavior because it covers narrowing, category reuse, stale fallback, and dropdown close behavior end to end.

### What assumptions changed
- “Mobile polish is mainly CSS cleanup” — it actually required coordinated changes across protected layout, dialogs, BottomNav, fixed input positioning, and dedicated viewport-specific Playwright coverage.
- “Remembered suggestions can be derived cheaply from history” — the milestone established that a dedicated household memory table with trigger-backed refresh is the reliable path for fast, deterministic mobile suggestions.
- “Quantity default can remain a UI hint” — it had to become a real mutation-layer default so typed and barcode-assisted adds stay consistent.

## Files Created/Modified

- `.gsd/milestones/M001/M001-SUMMARY.md` — milestone closeout summary with verification, requirement outcomes, and forward guidance.
- `.gsd/REQUIREMENTS.md` — updates active mobile/quantity requirements to validated based on slice evidence.
- `.gsd/PROJECT.md` — reflects milestone completion and current project state after v1.1 migration work.
- `.gsd/STATE.md` — updates milestone state bookkeeping after M001 completion.
