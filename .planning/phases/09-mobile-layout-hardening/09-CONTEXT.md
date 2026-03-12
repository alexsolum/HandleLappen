# Phase 9: Mobile Layout Hardening - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the signed-in mobile experience feel stable and app-like by keeping dialogs fully inside the viewport, eliminating accidental horizontal scrolling, and improving the bottom navigation so it stays pinned and easier to use on phones. This phase is about layout and interaction hardening only; inline quantity editing and remembered-item suggestions are separate downstream phases.

</domain>

<decisions>
## Implementation Decisions

### Mobile sheet behavior
- Bottom sheets should feel like mobile bottom docks, not centered desktop modals
- Sheets should be tall on phones, but capped so a visible top gap remains instead of fully taking over the screen
- Sheets should use an inset-card feel with visible side margins rather than hard edge-to-edge content
- Long sheet content should scroll internally while the primary action area stays visible
- Sheets remain dismissible via both backdrop tap and explicit close button

### Bottom navigation dock
- The main bottom navigation should stay pinned to the bottom of the screen on mobile
- The bottom navigation should feel like a bottom dock with clearer mobile affordance, not a thin text-only strip
- Use icons for the main navigation options instead of text-only presentation
- Safe-area spacing should be respected so the dock feels correct in mobile browser and PWA standalone contexts

### Claude's Discretion
- Exact icon set and visual style for the dock
- Exact top-gap size for capped sheets across viewport sizes
- Whether all sheets use the same footer treatment or only the longer form-heavy sheets
- Exact spacing, border, and elevation styling as long as the mobile dock/sheet feel is consistent

</decisions>

<specifics>
## Specific Ideas

- "I want it to be a bottom dock" for the main navigation
- A component similar in feel to daisyUI bottom navigation is a useful reference for the dock behavior, but not a requirement to add daisyUI itself
- Sheet action buttons such as `Lagre`, `Legg til vare`, and `Avbryt` should remain visible on mobile rather than scrolling out of reach

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/lists/BottomNav.svelte`: existing fixed bottom nav component; primary integration point for the new dock treatment, larger touch targets, and icon-based presentation
- `src/lib/components/items/ItemInput.svelte`: existing fixed add-item bar above the nav; must be coordinated with the dock so the two fixed layers do not cause overlap or overflow
- `src/lib/components/items/ItemDetailSheet.svelte`: current bottom-sheet pattern for item editing
- `src/lib/components/items/CategoryPickerModal.svelte`: current bottom-sheet pattern for category selection
- `src/lib/components/barcode/BarcodeScannerSheet.svelte`: bottom-sheet scanner flow already tuned for mobile
- `src/lib/components/barcode/ManualEanEntrySheet.svelte`: another mobile sheet that should follow the same width and footer rules
- `src/lib/components/barcode/BarcodeLookupSheet.svelte`: longer form-style sheet with actions that should stay visible

### Established Patterns
- Signed-in layout already uses fixed-bottom composition: `BottomNav` is fixed to screen bottom and `ItemInput` is fixed above it
- The protected shell in `src/routes/(protected)/+layout.svelte` currently reserves space with `main.pb-16` and shows transient fixed-position UI such as the sync toast above the nav
- Existing sheets all use bottom-anchored `dialog` elements with `w-full max-w-none rounded-t-2xl` outer shells and `max-w-lg` inner containers
- Mobile-first behavior is already part of the product direction; Phase 9 should harden that pattern rather than replacing it with desktop-first interactions

### Integration Points
- Protected layout in `src/routes/(protected)/+layout.svelte` controls the shared page padding, toast position, and bottom-nav placement for all signed-in screens
- List-detail screens depend on `ItemInput.svelte` and the bottom nav being stackable without hiding content or creating horizontal overflow
- The sheet components listed above should converge on one mobile sizing/scrolling rule so Phase 9 removes class-by-class drift

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-mobile-layout-hardening*
*Context gathered: 2026-03-12*
