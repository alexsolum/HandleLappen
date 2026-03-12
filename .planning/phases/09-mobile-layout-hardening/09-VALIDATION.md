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
| **Framework** | Playwright ^1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npm run test:e2e -- tests/mobile-layout.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:e2e -- tests/mobile-layout.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 0 | MOBL-01, MOBL-02 | smoke | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | MOBL-01 | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | MOBL-01, MOBL-02 | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | MOBL-03 | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | MOBL-02, MOBL-03 | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | MOBL-01, MOBL-02, MOBL-03 | integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-03-02 | 03 | 2 | MOBL-03 | manual + integration | `npm run test:e2e -- tests/mobile-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-03-03 | 03 | 2 | MOBL-01, MOBL-02, MOBL-03 | full regression | `npm run test:e2e` | ✅ Existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/mobile-layout.spec.ts` — mobile viewport coverage for sheets, horizontal overflow, and bottom dock behavior
- [ ] Stable selectors or `data-testid` hooks for bottom dock and key sheet containers if existing selectors are too brittle
- [ ] Shared helper for opening list-detail and barcode sheet flows under a mobile viewport

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom dock feels comfortable for one-handed thumb tapping on a real phone | MOBL-03 | Touch comfort and tap ergonomics are not fully measurable in headless automation | Open the app on a phone, navigate across all dock tabs with one hand, verify taps feel reliable and the dock does not feel cramped |
| Dock and fixed input bar respect iOS safe area in standalone/PWA mode | MOBL-03 | Requires real iOS standalone environment | Install app to home screen on iPhone, open a list, verify dock/input stay above the home-indicator area |
| Keyboard + fixed bottom stack remains usable while adding items | MOBL-01, MOBL-03 | Desktop emulation does not perfectly reflect on-screen keyboard behavior | Focus the add-item field on a phone and confirm the input, dock, and actions stay reachable without sideways movement |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
