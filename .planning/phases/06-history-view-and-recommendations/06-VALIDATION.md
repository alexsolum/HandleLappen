---
phase: 6
slug: history-view-and-recommendations
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npm run test:e2e -- tests/history.spec.ts tests/recommendations.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~75 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:e2e -- tests/history.spec.ts tests/recommendations.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 75 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | HIST-02 | smoke | `npm run test:e2e -- tests/history.spec.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | HIST-02 | integration | `npm run test:e2e -- tests/history.spec.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | HIST-02 | integration | `npm run test:e2e -- tests/history.spec.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | RECD-01 | integration | `npm run test:e2e -- tests/recommendations.spec.ts -g "frequency"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | RECD-02 | integration | `npm run test:e2e -- tests/recommendations.spec.ts -g "co-purchase"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | RECD-01 | integration | `npm run test:e2e -- tests/recommendations.spec.ts -g "cold-start"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | RECD-03 | integration | `npm run test:e2e -- tests/recommendations.spec.ts -g "tab"` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | HIST-02 | integration | `npm run test:e2e -- tests/history.spec.ts tests/recommendations.spec.ts -g "add back"` | ❌ W0 | ⬜ pending |
| 06-03-03 | 03 | 2 | RECD-03 | integration | `npm run test:e2e -- tests/recommendations.spec.ts tests/history.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/history.spec.ts` — stubs for grouped history rendering and add-back actions
- [ ] `tests/recommendations.spec.ts` — stubs for frequency, co-purchase, cold-start, and tab activation
- [ ] seeded history helper data in `tests/helpers/` — deterministic shopping-session fixtures

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Compact history scanning feels readable on a real phone | HIST-02 | Density/readability is subjective and device-dependent | Open the history/recommendations surface on a mobile viewport or device and confirm date groups, collapsed sessions, and compact rows are easy to scan |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 75s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
