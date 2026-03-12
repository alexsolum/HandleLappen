# T03: 09-mobile-layout-hardening 03

**Slice:** S09 — **Milestone:** M001

## Description

Add Phase 9 verification coverage after the sheet and dock changes land. This plan creates the mobile-focused automated test file, adjusts existing tests if selectors changed, and makes the manual-only checks explicit for real devices.

Purpose: Close the phase with evidence, not only UI changes. This plan is the automated and manual verification layer for MOBL-01..03.

Output: Dedicated mobile layout Playwright coverage and updated existing tests where the dock/sheet refactor changed selectors or structure.

## Must-Haves

- [ ] "Phase 9 has focused automated coverage for mobile viewport overflow, mobile sheet behavior, and bottom-dock visibility"
- [ ] "Automated tests assert that the signed-in shell does not become horizontally scrollable on phone-sized viewports"
- [ ] "Automated tests cover at least one long-form sheet with visible actions and the pinned dock on a list screen"
- [ ] "Residual real-device checks for safe area and keyboard behavior are called out explicitly rather than assumed"

## Files

- `tests/mobile-layout.spec.ts`
- `tests/barcode.spec.ts`
- `tests/categories.spec.ts`
