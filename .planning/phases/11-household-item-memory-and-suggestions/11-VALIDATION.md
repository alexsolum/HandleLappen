---
phase: 11
slug: household-item-memory-and-suggestions
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-12
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright E2E + `svelte-check` baseline |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/items.spec.ts --workers=1` |
| **Full suite command** | `npx playwright test tests/items.spec.ts tests/mobile-layout.spec.ts tests/recommendations.spec.ts --workers=1` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's targeted Playwright command
- **After every plan wave:** Run `npx playwright test tests/items.spec.ts tests/mobile-layout.spec.ts tests/recommendations.spec.ts --workers=1`
- **Before `$gsd-verify-work`:** Focused Phase 11 suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SUGG-01, SUGG-02 | e2e | `npx playwright test tests/items.spec.ts tests/recommendations.spec.ts --workers=1` | ✅ existing files, assertions/helpers added in-plan | ⬜ pending |
| 11-01-02 | 01 | 1 | SUGG-03 | e2e | `npx playwright test tests/items.spec.ts tests/recommendations.spec.ts --workers=1` | ✅ existing files, assertions/helpers added in-plan | ⬜ pending |
| 11-02-01 | 02 | 2 | SUGG-01, SUGG-02 | e2e | `npx playwright test tests/items.spec.ts tests/mobile-layout.spec.ts --workers=1` | ✅ existing files, assertions added in-plan | ⬜ pending |
| 11-02-02 | 02 | 2 | SUGG-01, SUGG-02 | e2e | `npx playwright test tests/items.spec.ts tests/mobile-layout.spec.ts --workers=1` | ✅ existing files | ⬜ pending |
| 11-03-01 | 03 | 3 | SUGG-03 | e2e | `npx playwright test tests/items.spec.ts tests/recommendations.spec.ts --workers=1` | ✅ existing files, assertions/helpers added in-plan | ⬜ pending |
| 11-03-02 | 03 | 3 | SUGG-01, SUGG-02, SUGG-03 | e2e | `npx playwright test tests/items.spec.ts tests/mobile-layout.spec.ts tests/recommendations.spec.ts --workers=1` | ✅ existing files | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/items.spec.ts` — add remembered-suggestion visibility, narrowing, immediate-add, and category-bypass assertions
- [ ] `tests/mobile-layout.spec.ts` — add narrow-phone assertions for the inline suggestion dropdown and no-overflow contract
- [ ] `tests/recommendations.spec.ts` or a new remembered-items helper — seed recurring household items with recency/category variants
- [x] Existing infrastructure covers framework setup; no new test runner install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Suggestion dropdown remains comfortable above the on-screen keyboard on a real phone | SUGG-01, SUGG-02 | Desktop emulation does not fully validate keyboard overlap and thumb reach | On a phone, focus the add field, type one to three letters, and confirm the dropdown stays visible and tappable without horizontal overflow |
| A manually added item becomes suggestible on the next entry cycle with the expected category memory | SUGG-01, SUGG-03 | True recurrence across a real household flow is more trustworthy to spot-check manually | Add a new categorized item, leave the flow, start typing it again, and confirm the suggestion appears and reuses the remembered category |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-12
