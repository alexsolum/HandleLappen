---
phase: 7
slug: verification-and-evidence-closure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-12
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Markdown artifact audit + targeted Playwright/Deno reruns |
| **Config file** | `playwright.config.ts` and `supabase/functions/barcode-lookup/deno.json` |
| **Quick run command** | `deno test --allow-env --allow-net --allow-read supabase/functions/barcode-lookup/index.test.ts && npx playwright test tests/barcode.spec.ts tests/pwa.spec.ts tests/offline.spec.ts tests/history.spec.ts tests/recommendations.spec.ts --reporter=list` |
| **Full suite command** | `npx playwright test && deno test --allow-env --allow-net --allow-read supabase/functions/barcode-lookup/index.test.ts` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Review the touched `*-VERIFICATION.md` file for requirement coverage, then run the relevant targeted suites for that phase
- **After every plan wave:** Run `deno test --allow-env --allow-net --allow-read supabase/functions/barcode-lookup/index.test.ts && npx playwright test tests/barcode.spec.ts tests/pwa.spec.ts tests/offline.spec.ts tests/history.spec.ts tests/recommendations.spec.ts --reporter=list`
- **Before `$gsd-verify-work`:** All verification artifacts must exist and targeted suites must still align with the written evidence
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BARC-01, BARC-02, BARC-03, BARC-04 | artifact audit | `rg -n "BARC-01|BARC-02|BARC-03|BARC-04" .planning/phases/04-barcode-scanning/04-VERIFICATION.md && deno test --allow-env --allow-net --allow-read supabase/functions/barcode-lookup/index.test.ts && npx playwright test tests/barcode.spec.ts --reporter=list` | ✅ existing suites | ⬜ pending |
| 07-01-02 | 01 | 1 | BARC-01, BARC-04 | manual evidence audit | `rg -n "manual|iPhone|Safari|PWA|device|partial|missing" .planning/phases/04-barcode-scanning/04-VERIFICATION.md` | ✅ doc target | ⬜ pending |
| 07-02-01 | 02 | 1 | PWAF-01, PWAF-02 | artifact audit | `rg -n "PWAF-01|PWAF-02" .planning/phases/05-pwa-and-offline-support/05-VERIFICATION.md && npx playwright test tests/pwa.spec.ts tests/offline.spec.ts --reporter=list` | ✅ existing suites | ⬜ pending |
| 07-02-02 | 02 | 1 | PWAF-01 | manual evidence audit | `rg -n "install|standalone|manual|risk|partial|missing" .planning/phases/05-pwa-and-offline-support/05-VERIFICATION.md` | ✅ doc target | ⬜ pending |
| 07-03-01 | 03 | 1 | HIST-02, RECD-01, RECD-02, RECD-03 | artifact audit | `rg -n "HIST-02|RECD-01|RECD-02|RECD-03" .planning/phases/06-history-view-and-recommendations/06-VERIFICATION.md && npx playwright test tests/history.spec.ts tests/recommendations.spec.ts --reporter=list` | ✅ existing suites | ⬜ pending |
| 07-03-02 | 03 | 1 | HIST-02, RECD-01, RECD-02, RECD-03 | consistency audit | `rg -n "covered|partial|missing|verdict|residual risk" .planning/phases/06-history-view-and-recommendations/06-VERIFICATION.md` | ✅ doc target | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/barcode.spec.ts` and `supabase/functions/barcode-lookup/index.test.ts` already exist for Phase 4 evidence checks
- [x] `tests/pwa.spec.ts` and `tests/offline.spec.ts` already exist for Phase 5 evidence checks
- [x] `tests/history.spec.ts` and `tests/recommendations.spec.ts` already exist for Phase 6 evidence checks
- [x] Phase context and validation docs already exist for Phases 4-6

*Existing infrastructure covers all Phase 7 requirements; this phase adds verification artifacts, not new test harnesses.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Barcode real-device scan behavior is only marked covered if a specific checkpoint note exists | BARC-01, BARC-04 | Device camera behavior and iOS standalone scan reliability cannot be trusted from desktop automation alone | Review `04-VERIFICATION.md` and confirm any covered manual claim cites a concrete prior checkpoint; otherwise the doc must mark the requirement partial or missing |
| PWA installability/standalone behavior is only marked covered if a specific checkpoint note exists | PWAF-01 | Manifest and service-worker evidence do not prove actual Add-to-Home-Screen and standalone behavior on devices | Review `05-VERIFICATION.md` and confirm install/standalone claims cite specific manual evidence; otherwise the doc must record explicit residual risk |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or artifact-audit commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all needed evidence infrastructure
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-12
