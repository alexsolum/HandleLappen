---
phase: 18
slug: ios-scanner-black-screen-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/barcode.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/barcode.spec.ts`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | SCAN-02 | unit | `npx playwright test tests/barcode.spec.ts` | ✅ | ⬜ pending |
| 18-01-02 | 01 | 1 | SCAN-01, SCAN-02, SCAN-03 | integration | `npx playwright test tests/barcode.spec.ts` | ✅ | ⬜ pending |
| 18-01-03 | 01 | 1 | SCAN-01, SCAN-02, SCAN-03 | integration | `npx playwright test tests/barcode.spec.ts` | ✅ | ⬜ pending |
| 18-02-01 | 02 | 2 | SCAN-01 | manual | Physical iPhone PWA verification | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/barcode.spec.ts` — new `permission-dismissed` scanner mock mode helper (SCAN-02 dismissed path)
- [ ] `tests/barcode.spec.ts` — `navigator.vibrate` spy setup for Playwright (SCAN-03)
- [ ] `tests/barcode.spec.ts` — update existing `permission denied` test to expect Settings-guidance message text (SCAN-02 denied path)

*(Existing `tests/barcode.spec.ts` infrastructure and Playwright helpers are fully reusable — no new fixture files needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Video element visible in viewfinder within 2 seconds on installed iOS PWA | SCAN-01 | Black screen bug is specific to PWA standalone mode; simulator cannot reproduce WebKit bug 252465; only manifests on physical device | (1) Build and deploy to staging (2) Install to iPhone home screen via Safari "Add to Home Screen" (3) Open app, tap Scan button, verify camera viewfinder appears within 2s (not black screen) — test on iPhone with iOS 16–18 if possible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new test modes/spies needed)
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
