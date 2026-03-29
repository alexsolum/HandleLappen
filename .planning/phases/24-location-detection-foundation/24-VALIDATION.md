---
phase: 24
slug: location-detection-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/location-detection.spec.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45 seconds quick / ~5 minutes full |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/location-detection.spec.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-W0-01 | W0 | 0 | LOCATE-01 | e2e | `npx playwright test tests/location-detection.spec.ts -g "foreground poller"` | ❌ W0 | ⬜ pending |
| 24-W0-02 | W0 | 0 | LOCATE-02 | e2e | `npx playwright test tests/location-detection.spec.ts -g "permission flow"` | ❌ W0 | ⬜ pending |
| 24-W0-03 | W0 | 0 | LOCATE-03 | e2e | `npx playwright test tests/location-detection.spec.ts -g "manual picker fallback"` | ❌ W0 | ⬜ pending |
| 24-MAN-01 | manual | 0 | LOCATE-02 | physical device | `manual-only` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/location-detection.spec.ts` — primary Phase 24 browser coverage for LOCATE-01, LOCATE-02, and LOCATE-03
- [ ] `tests/helpers/location.ts` — geolocation mocking, permission-state setup, seeded nearby-store helpers, and visibility helpers
- [ ] Manual validation checklist artifact in `.planning/phases/24-location-detection-foundation/` — installed iPhone PWA steps for first prompt, deny, retry, unavailable, and background/resume behavior

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Installed iPhone PWA permission prompt appears only after the explicit confirm tap and does not silently fail | LOCATE-02 | Playwright cannot validate installed-home-screen WebKit prompt behavior | Install the PWA on a physical iPhone, open a list page, tap the first CTA to open the explanation step, tap the confirm action, verify the iOS location prompt appears, then repeat with deny/dismiss flows |
| Foreground pause/resume works correctly after sending the installed app to background and reopening it | LOCATE-01 | Browser automation cannot fully represent iPhone standalone backgrounding semantics | With permission granted on a physical iPhone PWA, move the app to background for at least 30 seconds, reopen it, verify an immediate location check occurs and the inline state recovers without requiring a full refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
