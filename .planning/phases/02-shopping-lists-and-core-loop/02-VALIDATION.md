---
phase: 2
slug: shopping-lists-and-core-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` (exists) |
| **Quick run command** | `npm run test:e2e -- --project=chromium tests/lists.spec.ts tests/items.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:e2e -- --project=chromium tests/lists.spec.ts tests/items.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | LIST-01, LIST-02 | e2e stub | `npm run test:e2e -- tests/lists.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-01-02 | 01 | 0 | LIST-03, LIST-04, LIST-05, HIST-01 | e2e stub | `npm run test:e2e -- tests/items.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-01-03 | 01 | 0 | LIST-06 | e2e stub | `npm run test:e2e -- tests/realtime.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-01-04 | 01 | 1 | LIST-01, LIST-02 | e2e | `npm run test:e2e -- tests/lists.spec.ts -g "create list"` | ❌ Wave 0 | ⬜ pending |
| 2-02-01 | 02 | 2 | LIST-03, LIST-04 | e2e | `npm run test:e2e -- tests/items.spec.ts -g "add item"` | ❌ Wave 0 | ⬜ pending |
| 2-02-02 | 02 | 2 | LIST-05, HIST-01 | e2e+DB | `npm run test:e2e -- tests/items.spec.ts -g "check off"` | ❌ Wave 0 | ⬜ pending |
| 2-03-01 | 03 | 3 | LIST-06 | e2e | `npm run test:e2e -- tests/realtime.spec.ts -g "realtime sync"` | ❌ Wave 0 | ⬜ pending |
| 2-04-01 | 04 | 4 | HIST-01 | e2e+DB | `npm run test:e2e -- tests/items.spec.ts -g "history write"` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lists.spec.ts` — stubs for LIST-01, LIST-02
- [ ] `tests/items.spec.ts` — stubs for LIST-03, LIST-04, LIST-05, HIST-01
- [ ] `tests/realtime.spec.ts` — stub for LIST-06 (two-context test)
- [ ] `tests/helpers/lists.ts` — seeded list/item creation helpers (parallel to existing `auth.ts`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Swipe-to-delete gesture on mobile | LIST-02, LIST-04 | Playwright headless Chromium does not reliably simulate pointer-drag swipes on mobile viewports | Open app on physical iOS/Android device; swipe left on a list row and an item row; verify red delete button reveals; tap to confirm deletion |
| Keyboard stays open after item submit (iOS) | LIST-03 | iOS Safari keyboard dismiss behavior can only be verified on a real device | On iOS device, open a list; add an item; verify keyboard remains open and input stays focused for rapid entry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
