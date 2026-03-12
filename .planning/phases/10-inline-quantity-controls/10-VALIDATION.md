---
phase: 10
slug: inline-quantity-controls
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-12
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright end-to-end + `svelte-check` baseline |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/items.spec.ts --workers=1` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most relevant targeted Playwright spec for the changed behavior
- **After every plan wave:** Run `npm run test:e2e`
- **Before `$gsd-verify-work`:** Full suite must be green or any known unrelated environment drift must be explicitly documented
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | LIST-07 | e2e | `npx playwright test tests/items.spec.ts --workers=1` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | LIST-07 | e2e-mobile | `npx playwright test tests/mobile-layout.spec.ts --workers=1` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | LIST-08 | e2e | `npx playwright test tests/items.spec.ts --workers=1` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | LIST-08 | e2e-barcode | `npx playwright test tests/barcode.spec.ts --workers=1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/items.spec.ts` — add focused cases for inline increment/decrement and remove-at-one behavior
- [ ] `tests/items.spec.ts` — add typed-add assertions that new items default to quantity `1`
- [ ] `tests/barcode.spec.ts` — add assertions that barcode-assisted add starts at and persists quantity `1`
- [ ] `tests/mobile-layout.spec.ts` — extend or add a narrow-viewport assertion that visible steppers do not introduce horizontal overflow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stepper taps do not feel too close to row check-off on a real phone | LIST-07 | Physical thumb targeting is hard to judge from desktop emulation alone | On a phone-sized device, tap `+` and `-` repeatedly on adjacent items and confirm no accidental check-off occurs |
| Fixed add bar with mini stepper remains comfortable in standalone/PWA mode | LIST-08 | Safe-area and keyboard ergonomics vary across real mobile browsers | In installed/PWA mode, add several items using the default `1` control and confirm the add bar remains usable above the dock |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
