---
phase: 12
slug: navigation-restructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/navigation.spec.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/navigation.spec.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | NAV-01, NAV-02 | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | NAV-01 | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | NAV-01 | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | NAV-02 | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | NAV-02 | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 2 | NAV-01 | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/navigation.spec.ts` — covers NAV-01 (four tabs, active state on sub-routes, stub pages load) and NAV-02 (redirects 301)
- Helpers: reuse existing `tests/helpers/auth.ts` (`createHouseholdUser`, `deleteTestUser`) — no new helper file needed

*Existing `tests/mobile-layout.spec.ts` continues to pass (dock structure unchanged, only contents change).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Icon SVGs render correctly (book, gear) | NAV-01 | Visual verification needed for SVG path accuracy | Open app in browser, check Oppskrifter and Admin tab icons look correct |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
