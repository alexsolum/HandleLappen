# Phase 9: Mobile Layout Hardening - Research

**Researched:** 2026-03-12
**Domain:** SvelteKit + Svelte 5 mobile layout hardening for bottom-sheet dialogs, fixed bottom navigation, safe-area handling, and horizontal overflow prevention
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Mobile sheets:** Treat dialogs as mobile bottom docks rather than centered desktop modals.
- **Sheet height:** Sheets should be tall on phones but capped so a visible top gap remains.
- **Sheet width:** Sheets should keep an inset-card feel with visible side margins instead of hard edge-to-edge content.
- **Sheet actions:** Primary actions such as `Lagre`, `Legg til vare`, and `Avbryt` should remain visible on mobile and not scroll out of reach.
- **Sheet dismissal:** Keep both backdrop-dismiss and explicit close button.
- **Bottom navigation:** The main navigation should remain pinned to the bottom of the screen and feel like a bottom dock, not a thin text strip.
- **Bottom navigation presentation:** Use icons for the main navigation options and respect mobile safe areas in browser and PWA standalone contexts.

### Claude's Discretion

- Exact icon set and styling for the dock
- Exact capped sheet height and top-gap values by breakpoint
- Whether simpler sheets can share the same sticky-footer treatment as the longer form sheets
- Exact spacing, border, blur, and elevation treatments if the resulting mobile feel stays consistent

### Deferred Ideas (OUT OF SCOPE)

- Inline quantity editing and quantity defaults belong to Phase 10.
- Remembered items and typeahead suggestions belong to Phase 11.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOBL-01 | User can open add-item and related mobile dialogs without any content overflowing past the viewport width | Use a shared bottom-sheet shell with viewport-bounded width, `max-height` tied to dynamic viewport units, and internal scroll regions with sticky actions |
| MOBL-02 | User cannot accidentally scroll the app sideways on mobile screens during normal use | Audit fixed-position bars, sheet shells, card rows, and page wrappers for `100vw`/unbounded widths; prefer `w-full max-w-* min-w-0 overflow-x-clip` style containment and mobile viewport tests |
| MOBL-03 | User can reliably tap the bottom navigation on mobile because it stays fixed to the bottom and uses larger touch targets | Rework `BottomNav` into an icon dock with larger hit areas, safe-area padding, and layout padding in the protected shell so list content/toasts/input bars do not overlap it |
</phase_requirements>

---

## Summary

Phase 9 is primarily a layout-system cleanup phase, not a new feature phase. The existing app already uses the right broad primitives for mobile: fixed bottom navigation, a fixed item-entry bar, and bottom-anchored `dialog` sheets. The current issues come from inconsistent constraints between those pieces. The best planning approach is to create one shared rule set for mobile containment and apply it across the signed-in shell and all bottom-sheet components instead of patching each overflow case independently.

The key technical pattern is:
- Treat the protected layout as the single owner of bottom-stack spacing.
- Treat each mobile sheet as a capped viewport container with an internal scroll region and sticky footer actions.
- Replace text-only bottom-nav rows with a dock structure that uses icons, larger hit areas, and safe-area padding.
- Verify the phase through Playwright mobile viewport assertions rather than generic desktop smoke tests.

The highest-risk integration point is the interaction between `BottomNav`, the fixed `ItemInput`, and the protected layout's `main` padding. Today the shell only reserves `pb-16`, which matches the current nav height but does not account for a taller dock plus the fixed item-entry bar. Planning should explicitly cover stacked fixed elements and the content padding they require.

**Primary recommendation:** Split the phase into three plans exactly as the roadmap suggests: first establish overflow/sheet containment rules, then rework the bottom dock and bottom-stack spacing, then add focused mobile verification so the phase can be proven on narrow viewports.

---

## Existing Code Reality

### Relevant Components

- `src/routes/(protected)/+layout.svelte`
  Owns the global page shell, bottom-nav mount, and sync toast placement. Currently uses `main.pb-16`, which is likely too small once the dock grows and the list-entry bar remains fixed.
- `src/lib/components/lists/BottomNav.svelte`
  Already `fixed bottom-0 left-0 right-0` and therefore the correct reuse point for the dock redesign. Current issues: text-only layout, small `py-2 text-xs` targets, no safe-area padding, and no explicit height contract for downstream spacing.
- `src/lib/components/items/ItemInput.svelte`
  Already fixed above the nav (`bottom-16`) and therefore part of the same mobile stacking system. Width looks bounded by `max-w-lg`, but it needs to coordinate with the new dock height and avoid creating horizontal overflow with its multi-control row.
- Sheet components:
  - `src/lib/components/items/ItemDetailSheet.svelte`
  - `src/lib/components/items/CategoryPickerModal.svelte`
  - `src/lib/components/barcode/BarcodeScannerSheet.svelte`
  - `src/lib/components/barcode/ManualEanEntrySheet.svelte`
  - `src/lib/components/barcode/BarcodeLookupSheet.svelte`
  These all use bottom-anchored `<dialog>` shells, but each manages content height and footer behavior slightly differently. `BarcodeLookupSheet` is the strongest example of why a standardized scroll region plus visible actions is needed.

### Established Patterns To Reuse

- `max-w-lg mx-auto` is the dominant content-width pattern in signed-in views and should remain the desktop/tablet constraint.
- White card styling with gray borders is already established and should carry into the dock and inset sheets.
- Mobile-first structure is already assumed by the product and earlier phases; Phase 9 should refine this rather than change it.

### Current Likely Overflow Sources

- Fixed stacks using hardcoded bottom offsets (`bottom-16`) without a shared height contract.
- Multi-column/flex rows in fixed bars without enough `min-w-0` / wrap control on very narrow screens.
- Bottom-sheet shells using `w-full` outer layout correctly, but lacking a consistent capped height and sticky action area.
- Root/protected layout not explicitly clipping `overflow-x`, leaving any internal oversize element able to cause accidental sideways dragging.

---

## Implementation Patterns

### Pattern 1: Shared Mobile Bottom-Sheet Contract

For every bottom sheet in this phase, use the same structure:

- Outer `dialog` remains full-width and bottom-anchored.
- Inner sheet uses:
  - `mx-auto w-[calc(100%-1rem)] max-w-lg`
  - capped height such as `max-h-[calc(100dvh-1rem)]` or similar dynamic viewport-based value
  - `overflow-hidden`
- Inside the sheet:
  - static header
  - scrollable content area: `min-h-0 overflow-y-auto`
  - sticky footer action area: `sticky bottom-0 bg-white`

Why this works:
- Prevents off-screen width growth.
- Preserves the user’s inset-card preference.
- Keeps actions visible.
- Avoids each sheet inventing its own mobile behavior.

### Pattern 2: Protected Layout Owns Bottom Stack Spacing

The signed-in shell should expose enough bottom padding for the tallest expected bottom stack:

- dock height
- safe-area padding
- optional fixed item-entry bar above the dock

Instead of leaving each page to guess spacing, the protected layout should provide a bottom-safe content region. For list-detail pages that add `ItemInput`, the page-level content should reserve more space than the generic shell does.

Planning implication:
- Phase 9 should define one explicit bottom-spacing contract and apply it consistently to `+layout.svelte` and the list-detail route.

### Pattern 3: Icon Dock With Larger Targets

The bottom nav should move from plain text links to a dock structure:

- icon stacked above or beside label
- larger minimum height
- clear active/inactive states
- safe-area bottom padding using CSS env values where supported

The daisyUI-style reference is useful at the level of interaction feel, not dependency choice. The codebase should likely keep a local Tailwind/Svelte implementation instead of adding a new UI dependency just for the dock.

### Pattern 4: Horizontal Overflow Prevention

Use a layered containment strategy rather than a single `overflow-x-hidden` band-aid:

- Root/protected shell: clip horizontal overflow to prevent accidental sideways drag.
- Major containers: ensure `min-w-0` on flex children and avoid width math that exceeds parent bounds.
- Fixed bars and sheet content: use `w-full` plus capped max-width and internal padding rather than viewport-width literals.

For this repo, planning should specifically audit:
- `BottomNav.svelte`
- `ItemInput.svelte`
- signed-in page wrappers like list detail
- all Phase 9 sheet components

---

## Verification Guidance

### Automated

The repo already uses Playwright. Phase 9 should add focused mobile viewport tests rather than broad app tests.

Best verification approach:
- Create a dedicated `tests/mobile-layout.spec.ts` or similarly scoped file.
- Use phone-like viewport sizes (for example 390x844 and 375x812).
- Assert:
  - no document horizontal overflow: `document.documentElement.scrollWidth <= window.innerWidth`
  - open dialogs fit within viewport bounds using bounding-box assertions
  - action buttons remain visible in longer sheets
  - bottom nav remains visible and tappable near the viewport bottom

Useful existing commands from this repo:
- Quick: `npx playwright test tests/mobile-layout.spec.ts`
- Full: `npm run test:e2e`

### Manual-only checks

Two behaviors still deserve manual confirmation even with Playwright:
- PWA standalone safe-area feel on iPhone Safari after install
- Thumb ergonomics of the new dock on a real device

These should be captured as explicit manual verifications in the validation artifact, not left implicit.

---

## Validation Architecture

### Recommended Test Infrastructure

- **Framework:** Playwright
- **Config:** `playwright.config.ts`
- **Quick command:** `npx playwright test tests/mobile-layout.spec.ts`
- **Full command:** `npm run test:e2e`
- **Estimated runtime:** ~20-40 seconds for a focused mobile-layout suite

### Sampling Strategy

- After every task touching mobile shell/sheet layout: run the focused mobile-layout Playwright file.
- After each plan wave: run the full E2E suite or at minimum the focused mobile-layout suite plus impacted existing tests (for example categories/barcode if their sheets changed).
- Before verification/UAT: run the focused mobile-layout suite and perform one manual phone check for the dock/safe-area feel.

### Candidate Verification Map

- **09-01 / MOBL-01, MOBL-02**
  - Automated:
    - open add-item/category/barcode sheets on phone viewport
    - assert no horizontal overflow
    - assert dialog bounding boxes remain within viewport
- **09-02 / MOBL-03**
  - Automated:
    - assert dock stays fixed at viewport bottom during scroll
    - assert each tab remains clickable and visible with larger touch area
  - Manual:
    - installed/PWA standalone safe-area confirmation on phone
- **09-03**
  - Automated:
    - focused regression suite across the updated mobile surfaces
    - possibly reuse existing category/barcode flows under phone viewport

### Wave 0 Needs

- Add a dedicated mobile layout spec file if one does not already exist.
- Add stable selectors/test ids to the dock or sheet action areas only if the current DOM is too brittle for viewport assertions.

### Likely Manual-Only Verifications

- iOS Safari/PWA safe-area behavior for the pinned dock
- Real-device thumb comfort and perceived tap target size

---

## Risks And Guardrails

- Do not solve overflow by hiding content that should remain reachable; containment must preserve usability.
- Avoid introducing a new dependency just to mimic a dock reference if existing Tailwind/Svelte code can express the design.
- Keep desktop/tablet `max-w-lg` behavior intact while improving phone behavior.
- Standardize sheet behavior across all relevant components in this phase; one-off fixes will recreate drift.

---

## Planning Guidance

The planner should keep Phase 9 to three plans:

1. Sheet/viewport containment audit and fixes across the shared mobile sheet surfaces and signed-in wrappers.
2. Bottom dock redesign plus bottom-stack spacing contract with `ItemInput` and the protected shell.
3. Focused mobile verification artifacts and tests proving no horizontal overflow and stable bottom docking.

This phase should not pull in quantity controls, item suggestions, or unrelated visual redesign work.
