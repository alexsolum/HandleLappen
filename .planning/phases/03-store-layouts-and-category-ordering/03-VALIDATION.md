---
phase: 3
slug: store-layouts-and-category-ordering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.x |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/categories.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/categories.spec.ts`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | CATG-01, CATG-02 | e2e stub | `npx playwright test tests/categories.spec.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | CATG-01, CATG-02 | e2e | `npx playwright test tests/categories.spec.ts -g "category grouping"` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | CATG-01, CATG-02 | e2e | `npx playwright test tests/categories.spec.ts -g "default order"` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | CATG-03 | manual + e2e stub | `npx playwright test tests/categories.spec.ts -g "store layout"` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | CATG-04 | e2e | `npx playwright test tests/categories.spec.ts -g "category crud"` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 2 | CATG-05 | e2e | `npx playwright test tests/categories.spec.ts -g "assign category"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/categories.spec.ts` — stubs for CATG-01, CATG-02, CATG-03 (manual stub), CATG-04, CATG-05
- [ ] `tests/helpers/categories.ts` — admin helpers: `createTestCategory`, `seedDefaultCategories`, `deleteTestCategory`

*Existing infrastructure (playwright.config.ts, tests/helpers/) covers the base; only new test file and category helpers need Wave 0 creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-to-reorder categories in store layout screen | CATG-03 | Playwright drag-and-drop not reliable on mobile/touch without CDP tricks | Open store settings, long-press a category row, drag to new position, verify visual reorder and persisted order after reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
