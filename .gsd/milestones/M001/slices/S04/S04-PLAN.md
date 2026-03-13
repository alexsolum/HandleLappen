# S04: Barcode Scanning

**Goal:** Build the server-side barcode lookup foundation for Phase 4: cache table, authenticated Supabase Edge Function, Kassal primary lookup, Open Food Facts fallback, Gemini normalization, and Wave 0 barcode test scaffolding.
**Demo:** Build the server-side barcode lookup foundation for Phase 4: cache table, authenticated Supabase Edge Function, Kassal primary lookup, Open Food Facts fallback, Gemini normalization, and Wave 0 barcode test scaffolding.

## Must-Haves


## Tasks

- [x] **T01: Plan 01**
  - Build the server-side barcode lookup foundation for Phase 4: cache table, authenticated Supabase Edge Function, Kassal primary lookup, Open Food Facts fallback, Gemini normalization, and Wave 0 barcode test scaffolding.

Purpose: This plan establishes the single trusted lookup pipeline the scanner and manual EAN entry will both call. Without it, the client would either expose secrets or duplicate provider logic.
Output: One migration, one Edge Function with shared normalization helpers, and barcode fixtures/tests that executor plans can reuse.
- [x] **T02: Plan 02**
  - Build the client-side scan entry experience: a Scan trigger beside the existing add-item controls, a camera scanner sheet using the iOS-safe polyfill/library path, and a unified manual EAN fallback sheet.

Purpose: This plan delivers the device-facing part of Phase 4 without yet wiring the final product confirmation and add-to-list behavior. It makes the scan surface reliable across Android and iOS Safari/PWA.
Output: Scanner components, scanner lifecycle helper, and barcode E2E tests covering entry, cancellation, and fallback states.
- [ ] **T03: Plan 03**
  - Finish the scan-to-add workflow: automatically look up detected/manual EANs through the Edge Function, show one unified result sheet, prefill item name and category, and confirm insertion into the current shopping list.

Purpose: This plan converts the scanner foundation and backend lookup into the user-visible Phase 4 feature. It also carries the real verification burden because BARC-01 through BARC-04 only count as done once the full flow works on actual phones.
Output: A single lookup/query layer, one barcode result sheet, list-page integration, full barcode tests, and a manual device verification checkpoint.

## Files Likely Touched

