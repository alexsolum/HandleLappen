# Phase 22: Milestone Verification Artifact Closure - Research

**Researched:** 2026-03-28  
**Domain:** Milestone audit artifact closure, verification traceability, and audit gate rerun workflow  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Closure objective
- Prioritize a clean-slate milestone handoff: remove audit blockers and reconcile planning artifacts so the next milestone starts from a trustworthy baseline.
- Treat app behavior as already acceptable unless a documentation claim is provably inconsistent with current repo state.

### Phase 07 verification artifact posture
- `07-VERIFICATION.md` must be a strict, requirement-mapped verification artifact (explicit requirement-to-evidence mapping and clear verdict states), not a light narrative summary.
- The artifact should follow the established verification style used in other phase verification files to keep audit consumption consistent.

### Phase 08 verification artifact posture
- `08-VERIFICATION.md` should verify reconciliation and audit-closure outputs (roadmap/requirements/state/audit alignment), not re-verify all product feature behavior from earlier phases.
- It must still include evidence links that show the reconciliation claims are grounded in existing verification artifacts and audit files.

### Audit rerun contract
- Preserve historical audit records as historical records (do not overwrite away prior failing evidence).
- Produce/refresh the current audit output needed to prove Phase 22 closure and confirm that missing `07-VERIFICATION.md` / `08-VERIFICATION.md` blockers are gone.

### Discrepancy handling policy
- Fix milestone-closure inconsistencies discovered in touched planning artifacts when they affect audit clarity or phase-completion truth.
- Do not expand into unrelated feature or refactor work; any out-of-scope issues are logged for backlog/deferred follow-up.

### Claude's Discretion
- Exact table/section layout inside `07-VERIFICATION.md` and `08-VERIFICATION.md`
- Exact naming of any new rerun audit file, as long as prior audit history is preserved and the latest gate result is clear
- Minor wording normalization in planning docs to remove ambiguity while preserving factual history

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 22 is a documentation-traceability closure phase, not implementation work. The main blocker is objective and already confirmed by the current milestone audit: phases 07 and 08 are marked unverified because `07-VERIFICATION.md` and `08-VERIFICATION.md` do not exist. The phase must add those artifacts in the same structured style used by existing verification reports (frontmatter status, explicit evidence mapping, and verdict), then rerun audit gates.

The planning-critical nuance is preservation of historical evidence. Current workflow guidance for milestone audit writes to a canonical report path (`.planning/v{version}-v{version}-MILESTONE-AUDIT.md`), while Phase 22 locked decisions require preserving prior failing audit history. Plan tasks must include a non-destructive archival step before rerun (or a timestamped rerun file strategy) so the old failing evidence remains inspectable.

Nyquist validation is enabled in `.planning/config.json`, so planning should include a lightweight verification architecture for artifacts: file existence, schema/structure checks, and the audit rerun command as the phase gate.

**Primary recommendation:** Create strict requirement/evidence `07-VERIFICATION.md` and reconciliation-focused `08-VERIFICATION.md`, preserve old audit output, then rerun `$gsd-audit-milestone` and confirm missing-artifact gaps are eliminated.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Markdown verification artifacts (`*-VERIFICATION.md`) | n/a (repo convention) | Canonical per-phase proof of completion and evidence mapping | Required by milestone audit workflow |
| GSD milestone audit workflow (`workflows/audit-milestone.md`) | n/a (local workflow) | Defines pass/fail gate logic for missing verification files and requirement cross-checking | Source of truth for audit behavior |
| `rg` (ripgrep) | n/a (CLI tool) | Fast structural checks for headings/status/evidence fields before audit rerun | Consistent with existing GSD command patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js + `gsd-tools.cjs` | n/a (local toolchain) | Phase/milestone resolution and audit command orchestration | Before and after artifact creation |
| Playwright test corpus (`tests/*.spec.ts`) | `@playwright/test` from `package.json` (`^1.58.2`) | Indirect evidence anchors referenced by verification docs | When mapping requirement claims to automated proof |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Structured verification docs with frontmatter + mapping tables | Narrative-only closure notes | Fails audit consumption expectations and weakens traceability clarity |
| Non-destructive audit history preservation | Overwriting the canonical prior audit file | Removes historical failing evidence required by locked phase policy |

**Installation:**
```bash
# No new packages required for Phase 22
```

**Version verification:** No dependency additions are required for this phase; use the existing workspace toolchain.

## Architecture Patterns

### Recommended Project Structure
```text
.planning/
├── v1.0-v1.0-MILESTONE-AUDIT.md                  # current canonical audit output
├── v1.0-FINAL-AUDIT.md                           # prior closure-style audit reference
└── phases/
    ├── 07-verification-and-evidence-closure/
    │   ├── 07-CONTEXT.md
    │   ├── 07-VALIDATION.md
    │   └── 07-VERIFICATION.md                    # create in Phase 22
    ├── 08-traceability-reconciliation-and-milestone-reaudit/
    │   ├── 08-CONTEXT.md
    │   └── 08-VERIFICATION.md                    # create in Phase 22
    └── 22-milestone-verification-artifact-closure/
        └── 22-RESEARCH.md
```

### Pattern 1: Requirement-to-Evidence Verification Artifact (Phase 07)
**What:** Use explicit requirement rows with clear verdicts and evidence links, plus frontmatter status.  
**When to use:** Any verification artifact consumed by audit gates for requirement closure.  
**Example:**
```markdown
---
phase: 07-verification-and-evidence-closure
verified: 2026-03-28T00:00:00Z
status: passed
---

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| BARC-01 | covered | .planning/phases/04-barcode-scanning/04-VERIFICATION.md |
```

### Pattern 2: Reconciliation Verification Artifact (Phase 08)
**What:** Verify planning-document alignment and audit rerun evidence, not product-feature behavior.  
**When to use:** Bookkeeping/reconciliation phases with no direct feature requirements.  
**Example:**
```markdown
## Reconciliation Checks
- ROADMAP phase statuses align with delivered verification artifacts.
- REQUIREMENTS traceability reflects the latest verification verdicts.
- STATE milestone status and notes are consistent with audit outputs.
```

### Pattern 3: Historical Audit Preservation Before Gate Rerun
**What:** Snapshot old failing audit report before generating refreshed gate output.  
**When to use:** Any closure phase where prior failed audit evidence must remain available.  
**Example:**
```bash
Copy-Item .planning/v1.0-v1.0-MILESTONE-AUDIT.md .planning/archive/v1.0-v1.0-MILESTONE-AUDIT-2026-03-28-pre-phase22.md
$gsd-audit-milestone
```

### Anti-Patterns to Avoid
- **Narrative-only verification files:** no structured verdict/evidence map means poor audit parseability.
- **Re-verifying feature behavior in 08-VERIFICATION:** Phase 08 scope is reconciliation/audit closure.
- **Destructive audit overwrite:** violates locked requirement to preserve historical failing evidence.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audit closure logic | Custom ad-hoc audit checklist | Existing `audit-milestone.md` workflow + `$gsd-audit-milestone` | Workflow already defines failure gates and requirement cross-reference |
| Verification format | Freeform prose-only reports | Existing verification style from `04/21-VERIFICATION.md` | Consistency improves audit readability and reduces ambiguity |
| Artifact checks | Manual visual diff only | `rg`/file-existence checks + audit rerun | Faster and reproducible pre-gate validation |

**Key insight:** Phase 22 succeeds by conforming to existing audit/verification contracts, not by introducing new process primitives.

## Common Pitfalls

### Pitfall 1: Missing frontmatter status in new verification docs
**What goes wrong:** Audit tooling/humans cannot quickly infer pass/gap verdict for Phase 07/08.  
**Why it happens:** Reusing old narrative-only style from `05-VERIFICATION.md`/`06-VERIFICATION.md`.  
**How to avoid:** Use modern structured pattern (`phase`, `verified`, `status`, optional `score`) from recent verification files.  
**Warning signs:** No YAML block at file top; no explicit verdict line.

### Pitfall 2: Phase 08 artifact drifts into feature verification
**What goes wrong:** Scope creep and duplicated evidence review delay closure.  
**Why it happens:** Treating Phase 08 like Phase 04–06 implementation verification.  
**How to avoid:** Restrict 08 artifact to reconciliation outputs and audit trail coherence checks.  
**Warning signs:** Large requirement-by-requirement product test sections in 08 doc.

### Pitfall 3: Historical audit evidence lost during rerun
**What goes wrong:** Prior failing baseline no longer available for milestone narrative integrity.  
**Why it happens:** Rerun writes over canonical audit file path without snapshotting.  
**How to avoid:** Archive/copy old audit before rerun or use timestamped rerun file naming.  
**Warning signs:** Only one audit file remains and prior gap references disappear.

## Code Examples

Verified patterns from project sources:

### Canonical Missing-Artifact Blocker Signal
```markdown
| 07 | missing | missing | No `07-VERIFICATION.md` found |
| 08 | missing | missing | No `08-VERIFICATION.md` found |
```
Source: `.planning/v1.0-v1.0-MILESTONE-AUDIT.md`

### Audit Workflow Requirement for Missing Verification Gate
```markdown
If a phase is missing VERIFICATION.md, flag it as "unverified phase" — this is a blocker.
```
Source: `C:/Users/HP/.codex/get-shit-done/workflows/audit-milestone.md`

### Structured Verification Frontmatter Pattern
```markdown
---
phase: 21-offline-replay-integrity-for-history-and-recommendations
verified: 2026-03-28T07:46:06Z
status: passed
score: 6/6 must-haves verified
---
```
Source: `.planning/phases/21-offline-replay-integrity-for-history-and-recommendations/21-VERIFICATION.md`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Narrative verification docs without standardized frontmatter | Structured verification reports with explicit status/evidence mapping | By 2026-03 (seen in 04 and 21 verification artifacts) | Better machine/human audit consumption and deterministic gap detection |
| One-time final audit assertion | Re-runnable milestone audit workflow with strict missing-artifact blockers | Current GSD workflow (`audit-milestone.md`) | Enables repeatable closure after remediation phases |

**Deprecated/outdated:**
- Treating Phase 8 as "self-verifying bookkeeping" without an actual `08-VERIFICATION.md` artifact.
- Accepting missing phase verification artifacts during milestone closure.

## Open Questions

1. **How should the rerun audit artifact be named while preserving history?**
   - What we know: Workflow canonical path is `.planning/v1.0-v1.0-MILESTONE-AUDIT.md`; locked decision requires preserving prior failing evidence.
   - What's unclear: Whether to snapshot old file into archive path or emit a second timestamped rerun report.
   - Recommendation: Plan an explicit pre-rerun archival task and document chosen naming convention in 08 verification evidence.

2. **Should `08-VERIFICATION.md` include Nyquist status assertions for phases 07/08?**
   - What we know: Nyquist is enabled and latest audit includes a `nyquist` section.
   - What's unclear: Minimum required depth in Phase 8 verification artifact versus relying on rerun audit output.
   - Recommendation: Include concise Nyquist reconciliation evidence from rerun audit output, not a separate deep validation pass.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Markdown artifact audit + GSD milestone audit rerun |
| Config file | `C:/Users/HP/.codex/get-shit-done/workflows/audit-milestone.md`, `.planning/config.json` |
| Quick run command | `rg -n "status:|## Requirements Coverage|## Reconciliation Checks" .planning/phases/07-verification-and-evidence-closure/07-VERIFICATION.md .planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-VERIFICATION.md` |
| Full suite command | `$gsd-audit-milestone` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-22-01 | `07-VERIFICATION.md` exists and includes requirement-to-evidence verdict mapping for Phase 7 scope | artifact | `rg -n "BARC-01|PWAF-01|HIST-02|RECD-01|status:" .planning/phases/07-verification-and-evidence-closure/07-VERIFICATION.md` | ❌ Wave 0 |
| SC-22-02 | `08-VERIFICATION.md` exists and includes reconciliation/audit evidence for Phase 8 scope | artifact | `rg -n "ROADMAP|REQUIREMENTS|STATE|audit|status:" .planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-VERIFICATION.md` | ❌ Wave 0 |
| SC-22-03 | Audit rerun no longer flags missing 07/08 verification artifacts | integration gate | `$gsd-audit-milestone` then `rg -n "07-VERIFICATION|08-VERIFICATION|missing" .planning/v1.0-v1.0-MILESTONE-AUDIT.md` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** quick `rg` artifact checks for newly created verification docs
- **Per wave merge:** rerun `$gsd-audit-milestone` and review gap sections
- **Phase gate:** latest milestone audit shows no missing verification artifacts for phases 07/08

### Wave 0 Gaps
- [ ] `.planning/phases/07-verification-and-evidence-closure/07-VERIFICATION.md` — missing required artifact
- [ ] `.planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-VERIFICATION.md` — missing required artifact
- [ ] Audit-history preservation step before rerun (snapshot naming convention + destination path) — required by locked decision

## Sources

### Primary (HIGH confidence)
- `.planning/phases/22-milestone-verification-artifact-closure/22-CONTEXT.md` - locked phase decisions and closure constraints
- `.planning/ROADMAP.md` - Phase 22 goal/dependency/success criteria and phase scope definitions
- `.planning/v1.0-v1.0-MILESTONE-AUDIT.md` - current blocking evidence showing missing 07/08 verification artifacts
- `C:/Users/HP/.codex/get-shit-done/workflows/audit-milestone.md` - authoritative audit gate behavior and missing-verification blocker logic
- `.planning/phases/04-barcode-scanning/04-VERIFICATION.md` - structured verification format reference
- `.planning/phases/21-offline-replay-integrity-for-history-and-recommendations/21-VERIFICATION.md` - modern verification frontmatter and evidence mapping pattern
- `.planning/phases/07-verification-and-evidence-closure/07-CONTEXT.md` - Phase 7 requirement/evidence posture
- `.planning/phases/08-traceability-reconciliation-and-milestone-reaudit/08-CONTEXT.md` - Phase 8 reconciliation intent and audit output expectations
- `.planning/config.json` - Nyquist validation enabled status

### Secondary (MEDIUM confidence)
- `.planning/v1.0-FINAL-AUDIT.md` - historical final-audit structure and terminology conventions
- `.planning/STATE.md` - milestone status context and decision trail references

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - based on local workflow/docs that are the actual execution contract.
- Architecture: HIGH - directly derived from current audit workflow and existing verification artifact patterns.
- Pitfalls: HIGH - each pitfall is evidenced by current missing artifacts and workflow constraints.

**Research date:** 2026-03-28  
**Valid until:** 2026-04-27
