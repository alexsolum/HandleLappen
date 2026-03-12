---
status: resolved
trigger: "Clicking a list on the home screen does nothing — no navigation to the list detail view at /lister/[id]"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:03:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED — setPointerCapture called on every pointerdown blocks click from reaching child anchor
test: Deferred setPointerCapture to after DRAG_INTENT_PX threshold (8px) horizontal movement
expecting: Simple taps now propagate click to anchor, swipe gesture still works
next_action: Awaiting human verification in browser

## Symptoms

expected: Clicking a list row on the home screen navigates to /lister/[id]
actual: Nothing happens — no navigation, no error visible
errors: Unknown (no console errors — silent navigation failure)
reproduction: Open app, log in, see list on home screen, click/tap it
started: Discovered during Phase 2 manual testing — may never have worked

## Eliminated

(none — root cause found directly from code inspection)

## Evidence

- timestamp: 2026-03-10T00:01:00Z
  checked: src/lib/components/lists/ListRow.svelte
  found: anchor href="/lister/{list.id}" is present and correctly formed; swipeLeft action wraps the row div
  implication: The link itself is structurally correct — issue is in interaction event handling

- timestamp: 2026-03-10T00:01:00Z
  checked: src/lib/actions/swipe.ts (original)
  found: onPointerDown always calls node.setPointerCapture(e.pointerId) unconditionally on every touch/click
  implication: Pointer capture on the div causes the synthesized click after pointerup to target the capturing div, not the child anchor. The anchor receives no click event.

- timestamp: 2026-03-10T00:01:00Z
  checked: Browser pointer event specification
  found: When setPointerCapture is active, the synthesized click event fires at the element that held capture (the div), not at the deepest hit-tested element (the anchor). After pointerup releases capture, the click is already dispatched to the div.
  implication: Neither the anchor's default href behavior nor SvelteKit's navigation intercept runs — navigation is silently skipped on every tap.

- timestamp: 2026-03-10T00:02:00Z
  checked: TypeScript compilation (npx tsc --noEmit)
  found: No new errors in swipe.ts; pre-existing errors in items.ts and lists.ts (unrelated TanStack Query typing issues)
  implication: Fix is type-safe

## Resolution

root_cause: swipeLeft action called setPointerCapture on every pointerdown, causing the synthesized click to fire on the capturing div instead of the child anchor. The anchor link never received a click, so SvelteKit navigation never fired.
fix: Deferred setPointerCapture until horizontal movement exceeds DRAG_INTENT_PX (8px). Simple taps never cross this threshold, so the anchor receives the click normally. Swipe gestures still capture after the intent is clear.
verification: Confirmed working by user in browser — tapping a list row now navigates to /lister/[id].
files_changed:
  - src/lib/actions/swipe.ts
