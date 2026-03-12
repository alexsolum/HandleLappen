# Phase 4: Barcode Scanning - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

User can open a camera-based barcode scanner from a shopping list, detect a product barcode, fetch product data through a server-side lookup flow, and confirm a prefilled item before adding it to the list. This phase covers camera scan, manual EAN fallback, lookup result handling, and prefilled name/category behavior. History views, recommendations, store automation, and broader shopping-mode features remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Scan entry and detection flow
- Scanning starts from a dedicated scan action in the list UI, not by replacing the normal add-item inputs.
- The scanner locks onto the first strong barcode detection and performs one lookup automatically; it should not keep retriggering continuously.
- Successful lookup results appear in a bottom sheet rather than a separate full-screen result view or inline list edit state.
- Scan results are prefilled and require explicit user confirmation before the item is inserted into the list.

### Fallback and recovery states
- If camera permission is denied or the camera fails to open, the user stays in the same overall scan flow and gets a manual EAN fallback sheet.
- If Kassal.app and Open Food Facts both fail, the UI shows one unified "not found" result state rather than exposing provider-level failures separately.
- Manual EAN entry lives inside the same bottom-sheet result flow, not on a separate screen.
- Manual EAN lookup ends in the same prefilled confirm flow as camera lookup.

### Prefill editing and add behavior
- Before adding, the user can edit all three key fields: item name, category, and quantity.
- Category should be prefilled when available, but remain editable through a picker in the result sheet.
- Quantity defaults to `1`, with the user free to adjust it before confirming.
- After confirmation, the sheet closes and the user returns directly to the shopping list with the new item visible.

### Claude's Discretion
- Exact wording and visual treatment of scan permission, loading, and not-found states
- Exact placement and styling of the dedicated scan action in the list screen
- Camera framing guidance and barcode target overlay
- Whether the confirm sheet also shows barcode/EAN text for reassurance

</decisions>

<specifics>
## Specific Ideas

- The scan result should feel like the existing category and detail-sheet bottom-sheet flows from Phase 3, not like a separate detached mini-app.
- The recovery path should feel unified: camera scan and manual EAN are two entry methods into the same lookup-and-confirm tool.
- The user should never see two conflicting provider result states; fallback is internal, while the UI presents one outcome.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/items/ItemInput.svelte`: existing list-entry surface where a dedicated scan trigger can connect to the current add-item flow.
- `src/lib/components/items/CategoryPickerModal.svelte`: established bottom-sheet dialog pattern for selection flows.
- `src/lib/components/items/ItemDetailSheet.svelte`: existing editable bottom-sheet pattern for item fields.
- `src/routes/(protected)/lister/[id]/+page.svelte`: current list-detail integration point for new scan actions and post-confirm insertion.
- `src/lib/queries/items.ts`: current mutation layer for adding items and optimistic list updates.

### Established Patterns
- Mobile-first, Norwegian-first UI remains the rule.
- Bottom-sheet dialogs are already established for focused editing/selection tasks.
- The list flow prioritizes speed and low friction; scan behavior should not disrupt ordinary typed item entry.
- Supabase remains the backend boundary, so external barcode/product calls should be routed through server-side infrastructure rather than directly from the client.

### Integration Points
- Protected list detail route: scanner entry likely lives in or near the current list item input area.
- Supabase Edge Functions are the natural home for server-side barcode lookup and provider fallback.
- Existing item-add confirmation patterns can be extended so scanned results end by inserting a normal `list_item`.
- Current category infrastructure from Phase 3 can be reused directly when the scan result includes or suggests a category.

</code_context>

<deferred>
## Deferred Ideas

- Batch scan mode that stays in camera view after each confirmed item
- Geo- or store-aware barcode behavior
- Showing provider provenance, confidence scoring, or debug details in the customer-facing UI

</deferred>

---

*Phase: 04-barcode-scanning*
*Context gathered: 2026-03-10*
