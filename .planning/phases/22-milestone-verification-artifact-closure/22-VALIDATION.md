---
phase: 22
slug: milestone-verification-artifact-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 22 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Markdown artifact audit + milestone audit rerun |
| **Config file** | `C:/Users/HP/.codex/get-shit-done/workflows/audit-milestone.md`, `.planning/config.json` |
| **Quick run command** | `rg -n "status:|## Requirements Coverage|## Reconciliation Checks" .planning/phases/07-verification-and-evidence-closure/07-VERIFICATION.md .planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-VERIFICATION.md` |
| **Full suite command** | `$gsd-audit-milestone` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick `rg` artifact checks
- **After every plan wave:** Run `$gsd-audit-milestone`
- **Before `$gsd-verify-work`:** Full audit rerun must be complete
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | SC-22-01 | artifact | `rg -n "BARC-01|PWAF-01|HIST-02|RECD-01|status:" .planning/phases/07-verification-and-evidence-closure/07-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | SC-22-02 | artifact | `rg -n "ROADMAP|REQUIREMENTS|STATE|audit|status:" .planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | SC-22-03 | integration gate | `$gsd-audit-milestone` then `rg -n "07-VERIFICATION|08-VERIFICATION|missing" .planning/v1.0-v1.0-MILESTONE-AUDIT.md` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/07-verification-and-evidence-closure/07-VERIFICATION.md` - create structured verification artifact
- [ ] `.planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-VERIFICATION.md` - create structured verification artifact
- [ ] Define and apply an audit-history preservation snapshot before rerun

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
