---
phase: 9
slug: mobile-layout-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/mobile-layout.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~20-40 seconds (focused), ~90-180 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/mobile-layout.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `$gsd-verify-work`:** Focused mobile-layout suite must be green plus one real-device manual dock/safe-area check
- **Max feedback latency:** ~40 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | MOBL-01, MOBL-02 | E2E mobile viewport | `npx playwright test tests/mobile-layout.spec.ts --grep "sheet containment"` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | MOBL-01 | E2E mobile viewport | `npx playwright test tests/mobile-layout.spec.ts --grep "actions remain visible"` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | MOBL-03 | E2E mobile viewport | `npx playwright test tests/mobile-layout.spec.ts --grep "bottom dock"` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | MOBL-02, MOBL-03 | E2E mobile viewport | `npx playwright test tests/mobile-layout.spec.ts --grep "no horizontal overflow"` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 3 | MOBL-01, MOBL-02, MOBL-03 | E2E regression | `npx playwright test tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 9-03-02 | 03 | 3 | MOBL-03 | Manual device check | `manual-only` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/mobile-layout.spec.ts` — focused mobile viewport assertions for dock, sheets, and overflow
- [ ] stable selectors or `data-testid` hooks on the bottom dock and any sheet footer regions if current selectors are too brittle

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dock safe-area feel in installed/PWA mode | MOBL-03 | Browser automation does not faithfully represent iPhone standalone safe-area behavior | 1. Install the app to the home screen on iPhone Safari. 2. Open a list screen. 3. Confirm the bottom dock sits above the device edge/home indicator with comfortable spacing. 4. Confirm all icons remain fully tappable. |
| Thumb ergonomics of enlarged dock targets | MOBL-03 | Tap-comfort is perceptual and device-specific | 1. Open the app on a physical phone. 2. Navigate between all bottom dock tabs with one hand. 3. Confirm targets feel clearly larger and easy to press without accidental taps. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 40s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
