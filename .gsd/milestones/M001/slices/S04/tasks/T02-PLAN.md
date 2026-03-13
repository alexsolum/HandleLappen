# T02: Plan 02

**Slice:** S04 — **Milestone:** M001

## Description

Build the client-side scan entry experience: a Scan trigger beside the existing add-item controls, a camera scanner sheet using the iOS-safe polyfill/library path, and a unified manual EAN fallback sheet.

Purpose: This plan delivers the device-facing part of Phase 4 without yet wiring the final product confirmation and add-to-list behavior. It makes the scan surface reliable across Android and iOS Safari/PWA.
Output: Scanner components, scanner lifecycle helper, and barcode E2E tests covering entry, cancellation, and fallback states.
