---
phase: 5
slug: pwa-and-offline-support
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npm run test:e2e -- --project=chromium tests/pwa.spec.ts tests/offline.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:e2e -- --project=chromium tests/pwa.spec.ts tests/offline.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | PWAF-01 | smoke | `npm run test:e2e -- tests/pwa.spec.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PWAF-01 | smoke | `npm run test:e2e -- tests/pwa.spec.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | PWAF-01 | smoke | `npm run test:e2e -- tests/pwa.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | PWAF-02 | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | PWAF-02 | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | PWAF-02 | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | PWAF-02 | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | PWAF-02 | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | PWAF-02 | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/pwa.spec.ts` — stubs for PWAF-01 (manifest link tag, manifest fields, SW registration)
- [ ] `tests/offline.spec.ts` — stubs for PWAF-02 (offline check-off, badge, queue count, reconnect sync, disabled UI)
- [ ] `static/icons/icon-192.png` — required for PWA installability (must exist before build)
- [ ] `static/icons/icon-512.png` — required for PWA installability
- [ ] `static/icons/icon-512-maskable.png` — required for Android adaptive icons

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Android Chrome shows "Add to Home Screen" prompt | PWAF-01 | Requires real Android device + install criteria met | Build, deploy to HTTPS, open in Chrome on Android, verify install prompt appears |
| iOS "Add to Home Screen" via Share sheet works | PWAF-01 | iOS simulator does not support PWA install | Open on real iOS device in Safari, use Share sheet, verify standalone mode |
| App opens in standalone mode (no browser chrome) | PWAF-01 | Requires installed PWA on real device | After installing via home screen, verify no address bar or browser UI visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
