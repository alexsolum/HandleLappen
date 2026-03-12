---
phase: 10
slug: inline-quantity-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright E2E + `svelte-check` baseline |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/items.spec.ts --workers=1` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~300 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's targeted Playwright command
- **After every plan wave:** Run `npm run test:e2e`
- **Before `$gsd-verify-work`:** Full suite must be green or residual failures explicitly diagnosed
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | LIST-07 | e2e | `npx playwright test tests/items.spec.ts --workers=1` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | LIST-07 | e2e | `npx playwright test tests/items.spec.ts --workers=1` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | LIST-08 | e2e | `npx playwright test tests/items.spec.ts tests/barcode.spec.ts --workers=1` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | LIST-07, LIST-08 | e2e | `npx playwright test tests/mobile-layout.spec.ts tests/items.spec.ts tests/barcode.spec.ts --workers=1` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/items.spec.ts` — add inline increment, decrement, remove-at-one, and typed-add-default assertions
- [ ] `tests/barcode.spec.ts` — add barcode-confirm default quantity `1` coverage
- [ ] `tests/mobile-layout.spec.ts` — extend mobile no-overflow coverage for visible row steppers
- [ ] Existing infrastructure covers framework setup; no new test runner install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thumb-sized stepper taps do not accidentally check items off on a real phone | LIST-07 | Desktop browser automation cannot fully validate thumb ergonomics | On a phone-sized device, tap `+` and `-` repeatedly on active rows and confirm quantity changes without the item moving to `Handlet` |
| Fixed add bar plus row steppers still feel stable in Safari/PWA standalone mode | LIST-07, LIST-08 | Real-device safe-area and touch feel are not fully covered by Playwright | In installed/PWA mode, add items with the mini stepper and adjust row quantities while scrolling a live list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
