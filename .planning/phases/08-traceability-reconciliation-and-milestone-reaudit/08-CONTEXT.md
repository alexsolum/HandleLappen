# Phase 8 Context: Traceability Reconciliation and Milestone Re-Audit

## Phase Goal
The objective of Phase 8 is to align the project's central planning documents (`ROADMAP.md`, `REQUIREMENTS.md`, and `STATE.md`) with the delivered and verified implementation from Phases 1–7. This phase ensures that milestone v1.0 can be audited and archived with a "Passed" status, with all implementation deviations and residual debt formally acknowledged.

## 1. Residual Tech Debt & Gaps (Area 4)
Based on the milestone audit findings and implementation history, the following strategy for managing residual items is locked:

- **Central Backlog:** All non-blocking discrepancies, flaky tests, and "v2" items identified during verification and auditing will be consolidated into a new `.planning/BACKLOG.md` file.
- **Current State Focus:** Phase 8 will not attempt "quick fixes" for existing flakiness (e.g., Phase 1 auth test timeouts). Its scope is strictly limited to documenting the current verified state of the codebase.
- **Categorization:** Items in the backlog will be classified primarily as **Functional Tech Debt** (where the feature works but the implementation or test suite has known weaknesses) to distinguish them from missing features.
- **Audit Representation:** The final Milestone Audit must include a "Known Issues / Accepted Tech Debt" section. This section will explicitly list items that are being accepted as-is for the v1.0 release, with a reference to the central backlog for future resolution.

## 2. Reconciliation & Closure (Inferred/Default Decisions)
To satisfy the audit requirements identified in `v1.0-v1.0-MILESTONE-AUDIT.md`, the following actions are confirmed:

- **Roadmap Alignment:** `ROADMAP.md` will be updated to reflect the true completion status of all phases (1–7). Plan counts and descriptions will be adjusted if implementation reality (e.g., merged plans) differed significantly from the initial draft.
- **Requirement Traceability:** `REQUIREMENTS.md` top-level checkboxes and the traceability table will be updated for all BARC, PWAF, HIST, and RECD requirements based on the evidence in `04-VERIFICATION.md`, `05-VERIFICATION.md`, and `06-VERIFICATION.md`.
- **Audit Trail:** A final audit report `v1.0-FINAL-AUDIT.md` will be generated. The initial failing audit (`v1.0-v1.0-MILESTONE-AUDIT.md`) will be preserved as a historical record of the gap-closure process.
- **State Finalization:** `STATE.md` will be updated to `status: completed` and the `milestone` will be marked as ready for archival.

## Code Context
- **Planning Directory:** `.planning/` contains all source-of-truth documents.
- **Verification Artifacts:** `01-VERIFICATION.md` through `07-VERIFICATION.md` (created in Phase 7) are the primary inputs for this reconciliation.
- **Milestone Audit:** `v1.0-v1.0-MILESTONE-AUDIT.md` serves as the checklist for remaining bookkeeping gaps.
