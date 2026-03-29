---
phase: 25
slug: shopping-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E), Vitest (unit) |
| **Config file** | `playwright.config.ts` / `vite.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~60 seconds (Playwright), ~10 seconds (Vitest) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 0 | SHOP-01 | unit | `npx vitest run tests/unit/dwell-engine.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | SHOP-01 | E2E | `npx playwright test tests/shopping-mode-activation.spec.ts` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 1 | SHOP-02 | E2E | `npx playwright test tests/shopping-mode-banner.spec.ts` | ❌ W0 | ⬜ pending |
| 25-01-04 | 01 | 1 | SHOP-03 | E2E | `npx playwright test tests/shopping-mode-layout.spec.ts` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 1 | CHKOFF-01 | E2E | `npx playwright test tests/shopping-mode-history.spec.ts` | ❌ W0 | ⬜ pending |
| 25-02-02 | 02 | 1 | SHOP-04 | E2E | `npx playwright test tests/shopping-mode-dismiss.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/dwell-engine.test.ts` — unit tests for 90s dwell logic using `page.clock` / `vi.useFakeTimers()` for SHOP-01
- [ ] `tests/shopping-mode-activation.spec.ts` — E2E stub: proximity → dwell → shopping mode activates (SHOP-01)
- [ ] `tests/shopping-mode-banner.spec.ts` — E2E stub: banner renders with store name + chain brand color (SHOP-02)
- [ ] `tests/shopping-mode-layout.spec.ts` — E2E stub: list switches to store's category layout on activation (SHOP-03)
- [ ] `tests/shopping-mode-history.spec.ts` — E2E stub: check-offs recorded with store_id in item_history (CHKOFF-01)
- [ ] `tests/shopping-mode-dismiss.spec.ts` — E2E stub: close button returns to default layout, stops attribution (SHOP-04)

*Check Playwright version >= 1.45 before Wave 0 (required for `page.clock.tick()` API).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GPS proximity triggers at real store location | SHOP-01 | Requires physical device near actual store | Walk within 150m of known store, wait 90s, verify banner appears |
| Brand colors visually match chain identity | SHOP-02 | Color accuracy judgment | Inspect banner in browser: Rema 1000=blue, Kiwi=green, Meny=red, Coop Extra=yellow/red |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
