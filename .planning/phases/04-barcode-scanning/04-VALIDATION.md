---
phase: 4
slug: barcode-scanning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright + targeted function/integration tests |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/barcode.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~75 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/barcode.spec.ts`
- **After every plan wave:** Run `npx playwright test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 75 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | BARC-02, BARC-03, BARC-04 | integration | `npx playwright test tests/barcode.spec.ts -g "lookup"` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | BARC-02 | integration | `{edge function test command}` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | BARC-01, BARC-04 | e2e/manual hybrid | `npx playwright test tests/barcode.spec.ts -g "scan entry|manual ean"` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | BARC-01, BARC-04 | e2e | `npx playwright test tests/barcode.spec.ts -g "confirm flow"` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 2 | BARC-02, BARC-04 | e2e | `npx playwright test tests/barcode.spec.ts -g "not found|fallback"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/barcode.spec.ts` — stubs for BARC-01, BARC-02, BARC-03, BARC-04
- [ ] Barcode lookup fixture set for Kassal hit, Open Food Facts fallback hit, and not-found
- [ ] Edge function invocation harness or equivalent local test path for the barcode lookup handler

*Existing Playwright infrastructure covers the browser side; this phase needs dedicated barcode fixtures and edge-function verification support.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Camera opens and scans reliably on a physical phone | BARC-01 | Real camera access, lighting, autofocus, and permission friction are not trustworthy in desktop automation | Open a list on a phone, tap Scan, present a real grocery barcode, verify the lookup triggers without extra taps |
| iOS Safari PWA standalone scan path works with the polyfill | BARC-04 | This requirement is explicitly about iOS Safari/PWA behavior; desktop browsers do not validate it | Install/open the PWA on iPhone Safari, scan a product barcode, verify result sheet appears and can add item |
| Rear-camera selection feels correct on mobile devices | BARC-01 | Device camera selection varies by browser/OS and should be confirmed on hardware | On Android and iPhone, open Scan and confirm the rear-facing camera is used when available |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 75s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
