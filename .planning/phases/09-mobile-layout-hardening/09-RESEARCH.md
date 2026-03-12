# Phase 9: Mobile Layout Hardening - Research

**Researched:** 2026-03-12
**Domain:** Svelte 5 + SvelteKit mobile layout hardening for bottom-sheet dialogs, fixed bottom navigation, safe-area spacing, and horizontal overflow prevention
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Mobile sheet behavior:** Sheets should feel like mobile bottom docks, not centered desktop modals.
- **Sheet height:** Sheets should be tall on phones but capped so a visible top gap remains.
- **Sheet width:** Sheets should use an inset-card feel with visible side margins rather than hard edge-to-edge content.
- **Sheet scrolling:** Long content should scroll internally while primary actions remain visible.
- **Sheet dismissal:** Sheets remain dismissible via backdrop tap and explicit close button.
- **Bottom navigation:** The main navigation must stay pinned to the bottom of the screen on mobile.
- **Bottom dock style:** The nav should feel like a bottom dock with clearer mobile affordance, not a thin text-only strip.
- **Bottom nav presentation:** Use icons for the main navigation options instead of text-only presentation.
- **Safe area:** Respect mobile safe-area spacing in browser and PWA standalone contexts.

### Claude's Discretion

- Exact icon set and dock visual treatment
- Exact top-gap size for capped sheets across viewport sizes
- Whether all sheets share identical footer treatment or only the longer form-heavy sheets do
- Exact border, elevation, and spacing values as long as the mobile dock/sheet feel stays consistent

### Deferred Ideas (OUT OF SCOPE)

- Inline quantity editing on the main list belongs to Phase 10
- Remembered-item suggestions and category reuse belong to Phase 11

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOBL-01 | User can open add-item and related mobile dialogs without any content overflowing past the viewport width | Standardize sheet shell/layout classes, cap height with internal scroll regions, and keep action rows visible |
| MOBL-02 | User cannot accidentally scroll the app sideways on mobile screens during normal use | Audit page shells and fixed-bottom layers for width leaks; use clipping/overflow guards at shell boundaries |
| MOBL-03 | User can reliably tap the bottom navigation on mobile because it stays fixed to the bottom and uses larger touch targets | Rebuild `BottomNav` as a pinned icon dock with larger hit areas and safe-area padding |
</phase_requirements>

---

## Summary

Phase 9 is a focused UI hardening phase, not a feature-expansion phase. The codebase already has the right primitives: a fixed protected shell, a fixed `BottomNav`, a fixed `ItemInput` bar, and multiple bottom-anchored `dialog` sheets. The main planning risk is not architecture; it is class-by-class drift. Several components independently define mobile sheet containers and bottom-fixed layers, which makes overflow bugs and spacing conflicts likely as the UI grows.

The best planning approach is to create one consistent mobile layout contract and apply it everywhere in this phase. That contract should cover:
- a shared sheet shell pattern with inset width, capped height, internal scrolling, and sticky/pinned actions
- a shared bottom-dock pattern for the nav with icon-first presentation, larger touch targets, and safe-area padding
- app-shell overflow guards so fixed layers and wide children cannot create sideways scroll

The implementation work should stay incremental. First stabilize the protected layout and sheet primitives, then rework the bottom dock, then add focused mobile viewport tests that prove there is no horizontal scrolling and that key sheets remain usable on small screens.

---

## Existing Codebase Read

### Reusable assets

- `src/routes/(protected)/+layout.svelte`
  - Owns the signed-in shell, `main.pb-16`, sync toast placement, and the shared `BottomNav`.
- `src/lib/components/lists/BottomNav.svelte`
  - Already fixed to `bottom-0 left-0 right-0`, but it is a thin text-only strip with small touch targets.
- `src/lib/components/items/ItemInput.svelte`
  - Already fixed above the nav at `bottom-16`; this is the main stacking dependency with the dock.
- `src/lib/components/items/ItemDetailSheet.svelte`
- `src/lib/components/items/CategoryPickerModal.svelte`
- `src/lib/components/barcode/BarcodeScannerSheet.svelte`
- `src/lib/components/barcode/ManualEanEntrySheet.svelte`
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`
  - These all share the same bottom-anchored `dialog` pattern and should be normalized rather than individually redesigned.

### Established patterns

- The protected app already assumes fixed-bottom UI layers.
- The app uses Tailwind utility classes directly rather than central CSS components.
- `max-w-lg mx-auto` is the established content constraint for inner content, but the sheet shell itself is currently full-width.
- Playwright E2E is the established verification framework. There is no mobile-specific test file for layout hardening yet.

### Integration points

- Protected shell bottom spacing must be recalibrated with the final dock height, otherwise list content or toasts can sit underneath fixed controls.
- `ItemInput.svelte` and `BottomNav.svelte` must be treated as a stack, not as unrelated fixed components.
- The five sheet components above should converge on one layout rule so later phases inherit the hardened behavior by default.

---

## Implementation Guidance

### 1. Standardize the mobile sheet contract

Use the existing bottom-sheet direction, but normalize the shell across all sheet/dialog components.

Recommended pattern:
- Keep the `dialog` itself full-screen for backdrop hit-testing.
- Move the visual sheet into an inner wrapper with:
  - horizontal inset padding on small screens
  - a capped height such as `max-h-[calc(100dvh-<top-gap>)]`
  - `overflow-hidden` on the outer visual card
  - a dedicated scroll region for body content
  - a dedicated footer region that stays visible

Practical Tailwind shape:
- Outer `dialog`: `fixed inset-0 m-0 w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40`
- Alignment wrapper: `flex min-h-full items-end justify-center px-3 pb-[env(safe-area-inset-bottom)] pt-6`
- Visual sheet: `w-full max-w-lg overflow-hidden rounded-t-2xl rounded-b-2xl bg-white shadow-2xl max-h-[calc(100dvh-24px)]`

Why this works:
- `100dvh` tracks the dynamic mobile viewport better than classic `100vh`
- inset `px-*` on the alignment wrapper gives the requested card feel without risking content overflow
- `overflow-hidden` on the visual sheet prevents inner children from leaking past rounded corners

### 2. Split long sheets into header, scroll body, and action footer

Long forms should not rely on the entire sheet scrolling as one block. Instead:
- header: static
- body: `overflow-y-auto`
- footer/actions: pinned at the bottom of the visual sheet

This is the simplest way to satisfy the locked decision that action buttons remain visible.

Recommended structure:
- wrapper: `flex max-h-inherit flex-col`
- scroll body: `min-h-0 flex-1 overflow-y-auto`
- footer: `border-t bg-white px-4 py-3`

Apply this at minimum to:
- `ItemDetailSheet.svelte`
- `BarcodeLookupSheet.svelte`
- `ManualEanEntrySheet.svelte`

The category picker and scanner sheet may be simpler, but should still inherit the same outer shell sizing rules.

### 3. Treat horizontal overflow as an app-shell bug first

MOBL-02 should not be fixed only inside individual dialogs. Add shell-level guards as well.

Recommended audit points:
- `src/routes/(protected)/+layout.svelte`
- list/detail page containers
- fixed-position layers (`BottomNav`, `ItemInput`, sync toast)
- any full-width child using `w-screen`, `left/right` offsets, or large min-width values

Recommended guardrails:
- app shell wrapper: `overflow-x-clip` or `overflow-x-hidden`
- ensure fixed bars use `left-0 right-0` with internal centered containers instead of width calculations that can overshoot
- ensure children inside flex rows have `min-w-0` when text or inputs are involved

`overflow-x-clip` is preferred when available because it suppresses horizontal scrolling without creating a scroll container side effect; `overflow-x-hidden` is an acceptable fallback if consistency is needed.

### 4. Rebuild the bottom nav as a dock, not a row of links

Current `BottomNav.svelte` is functionally fixed, but visually too small and text-led.

Recommended Phase 9 dock behavior:
- keep the nav pinned to the viewport bottom
- wrap links in a centered inner dock container rather than stretching a thin bar edge to edge
- use stacked icon + label or icon-led layout with minimum tap target around 44px
- add bottom padding using `env(safe-area-inset-bottom)` so the dock feels correct in standalone/PWA mode
- adjust `main` bottom padding and `ItemInput` bottom offset once the final dock height is known

Suggested structure:
- outer shell: fixed and full-width, responsible for safe-area background
- inner dock: centered `max-w-lg`, rounded top or pill-like section depending on styling choice

This phase does not need new route behavior; it only needs a stronger dock presentation and better hit area.

### 5. Plan the bottom stack as one composition

The nav and item input already occupy the same thumb zone.

Planning implication:
- define one source of truth for bottom offsets
- if the dock gets taller, `ItemInput.svelte` must move up accordingly
- sync toast placement in `+layout.svelte` must also move so it is not hidden by the dock

This is the main integration risk in the phase. If planned separately, the app can end up with no overflow but still have controls covering each other.

### 6. Keep desktop stable by localizing mobile overrides

The phase goal explicitly says no desktop regression. The easiest way to preserve that is:
- keep the existing `max-w-lg` inner content model
- apply the strongest changes only under mobile-first defaults, then selectively relax them at `sm:` and above
- avoid introducing full-screen phone-only logic that changes desktop interaction semantics

The bottom sheets can remain bottom-anchored on desktop if desired, but the planner should prioritize mobile correctness over desktop visual parity.

---

## Verification Guidance

### Recommended automated verification

Use Playwright, since it is already the repo standard and can emulate small mobile viewports directly.

Useful patterns for this phase:
- `page.setViewportSize({ width: 390, height: 844 })` for iPhone-like coverage within the existing single-browser setup
- assert `document.documentElement.scrollWidth <= window.innerWidth`
- assert key fixed elements remain visible after opening a sheet
- assert action buttons are visible without additional scrolling when a sheet opens

Suggested new test file:
- `tests/mobile-layout.spec.ts`

Suggested scenario coverage:
- open list detail on a mobile viewport and verify no horizontal overflow
- open item detail sheet and verify the sheet stays within the viewport and footer actions are visible
- open category picker and barcode-related sheets and verify they inherit the same width/height behavior
- verify bottom nav remains visible and tappable at the bottom on a mobile viewport

Useful page-side assertion:

```ts
const overflow = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
}))

expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth)
```

### Manual-only verification to keep

Some aspects are still best confirmed manually:
- real thumb comfort of the new dock on an actual phone
- safe-area feel in iOS standalone mode after installing as PWA
- interaction between on-screen keyboard and the fixed nav/input stack

These should be written as manual checks in the validation file, not left implicit.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:e2e -- tests/mobile-layout.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBL-01 | Item detail sheet fits within mobile viewport and keeps primary actions visible | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ Wave 0 |
| MOBL-01 | Category picker and barcode sheets use capped mobile sheet behavior without horizontal overflow | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ Wave 0 |
| MOBL-02 | Signed-in shell has no horizontal scrolling on mobile viewport | smoke | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ Wave 0 |
| MOBL-02 | Fixed bottom stack (`ItemInput` + `BottomNav`) does not push content wider than viewport | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ Wave 0 |
| MOBL-03 | Bottom navigation remains pinned to viewport bottom on list screens | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ Wave 0 |
| MOBL-03 | Bottom navigation links expose larger touch-target presentation with icon-based dock UI | smoke + visual | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:e2e -- tests/mobile-layout.spec.ts`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** Full suite green before phase verification

### Wave 0 Gaps

- [ ] `tests/mobile-layout.spec.ts` — mobile viewport coverage for sheets, horizontal overflow, and bottom dock behavior
- [ ] Shared helper or locator utilities for opening list-detail sheets and barcode sheets from a mobile viewport
- [ ] Stable selectors or `data-testid` hooks on the bottom dock and key sheet containers if current selectors are too brittle

### Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom dock feels comfortable for thumb tapping on a real phone | MOBL-03 | Touch ergonomics are subjective and not fully measurable in headless browser automation | Install/open app on phone, navigate through tabs one-handed, verify taps feel reliable and labels/icons remain clear |
| Dock and fixed input bar respect iOS safe area in standalone/PWA mode | MOBL-03 | Requires real iOS standalone environment | Install to home screen on iPhone, open a list, verify dock/input do not collide with home-indicator area |
| Keyboard + fixed bottom stack remains usable while adding items | MOBL-01, MOBL-03 | Real mobile keyboard behavior differs from desktop emulation | Focus the add-item input on a phone, verify the nav/dock/input stack remains usable and no controls become unreachable |

---

## Planning Notes

- Keep plans separated by concern: sheet/layout contract, dock/stack rework, then verification.
- Favor a shared sheet class/structure pass over one-off fixes in each component.
- Ensure verification tasks include both browser-emulated mobile coverage and explicit manual checks for real-device safe-area behavior.

