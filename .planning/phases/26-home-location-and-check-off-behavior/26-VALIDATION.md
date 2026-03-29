---
phase: 26
slug: home-location-and-check-off-behavior
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.x |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/admin.spec.ts --project=chromium` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/admin.spec.ts --project=chromium`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | CHKOFF-03 | e2e | `npx playwright test tests/admin.spec.ts tests/home-location.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | CHKOFF-03 | integration/e2e | `npx playwright test tests/home-location-privacy.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | CHKOFF-02 | e2e | `npx playwright test tests/home-location.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | CHKOFF-02 | e2e/integration | `npx playwright test tests/home-location.spec.ts tests/offline.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/home-location.spec.ts` — end-to-end coverage for save/remove home location plus at-home cleanup toast/history suppression
- [ ] `tests/home-location-privacy.spec.ts` — cross-user privacy/RLS coverage for private home-location storage
- [ ] `tests/helpers/location.ts` updates — shared seeding/mocking helpers for home-location and current-position flows
- [ ] `tests/admin.spec.ts` updates — replace the disabled settings-stub assertion with real link/navigation coverage
- [ ] Offline replay coverage in `tests/offline.spec.ts` if Phase 26 keeps at-home cleanup valid while offline

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `Bruk min posisjon` on physical mobile/PWA respects permission UX and populates the home pin without auto-saving | CHKOFF-03 | Browser geolocation permission flows in installed PWAs are device-specific and hard to trust from desktop-only automation | Install the PWA on iPhone and Android, open `/admin/brukerinnstillinger`, tap `Bruk min posisjon`, verify the permission prompt appears only after the tap, confirm the map pin moves to the detected location, and confirm no save occurs until the explicit save action |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
