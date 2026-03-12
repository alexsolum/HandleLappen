# Phase 7: Verification and Evidence Closure - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore the missing verification chain for delivered Phases 4, 5, and 6 by producing formal verification artifacts that map each late-phase requirement to concrete evidence and a clear verdict. This phase does not add product capability; it closes auditability gaps for barcode, offline/PWA, and history/recommendation work.

</domain>

<decisions>
## Implementation Decisions

### Requirement coverage standard
- Verification is requirement-level, not just a broad phase summary.
- Automated tests are the primary proof standard wherever good automation already exists.
- Code inspection and prior execution artifacts support the mapping, but do not replace missing requirement evidence by default.
- If a requirement only has partial evidence, it stays partial and does not count as covered.

### Manual checkpoint policy
- Phase 4 barcode verification uses a hybrid rule: browser/server automation can cover non-device behavior, but device-specific barcode claims stay open unless backed by an explicit manual checkpoint.
- Phase 5 installability and standalone-PWA claims require manual evidence because manifest/service-worker proof alone is not strong enough for those requirements.
- Manual-only evidence may reuse a previously recorded checkpoint if it clearly states device/environment, observed behavior, and outcome.
- A concise written checkpoint note is sufficient manual evidence; screenshots or video are not required by default.

### Phase-specific evidence posture
- Phase 4 should separate device-only behaviors from the rest of the barcode evidence instead of forcing an all-or-nothing verdict.
- Phases 5 and 6 may reuse existing targeted tests and UAT as first-class evidence when the verification doc maps them explicitly to the delivered code and current behavior.
- Verification docs should name missing proof directly rather than smoothing it over inside a phase-level pass statement.

### Claude's Discretion
- Exact table/layout structure for the three verification files
- How to phrase concise verdict text, as long as requirement coverage and open gaps remain explicit
- How much supporting code-reference detail to include per requirement beyond the minimum needed for auditability

</decisions>

<specifics>
## Specific Ideas

- Treat Phase 7 as an evidence-closure phase, not a feature-build phase.
- Barcode deserves stricter handling than the other late phases because real camera/iOS PWA behavior is materially different from desktop automation.
- Existing Phase 5 and Phase 6 tests/UAT should be reused where they are already specific, rather than rerunning everything just to restate the same evidence.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/barcode.spec.ts`: Browser-side barcode scan, fallback, manual EAN, and not-found coverage for Phase 4 evidence mapping.
- `supabase/functions/barcode-lookup/index.test.ts`: Function-level verification source for provider fallback, cache behavior, and normalization logic in Phase 4.
- `tests/pwa.spec.ts` and `tests/offline.spec.ts`: Existing PWA/offline coverage for manifest exposure, offline indicator, queued check-off behavior, and disabled offline controls.
- `tests/history.spec.ts` and `tests/recommendations.spec.ts`: Existing history/recommendation coverage for grouped history, recommendation states, BottomNav activation, and add-back flows.
- `.planning/phases/05-pwa-and-offline-support/05-UAT.md` and `.planning/phases/06-history-view-and-recommendations/06-UAT.md`: Existing human-verification artifacts that can be promoted into formal requirement evidence where the mapping is explicit.

### Established Patterns
- Phase validation docs already describe intended test infrastructure and manual-only checkpoints, especially for Phase 4 and Phase 5.
- Late phases already have plan summaries, validation docs, and targeted test files; the gap is the formal verification layer, not missing implementation context.
- Audit closure depends on explicit requirement-to-evidence traceability, matching the orphaned IDs called out in roadmap and requirements state.

### Integration Points
- `.planning/phases/04-barcode-scanning/04-VERIFICATION.md`: New artifact to create from barcode tests, function tests, validation notes, and any manual device checkpoint.
- `.planning/phases/05-pwa-and-offline-support/05-VERIFICATION.md`: New artifact to create from PWA/offline Playwright coverage plus installability/manual evidence.
- `.planning/phases/06-history-view-and-recommendations/06-VERIFICATION.md`: New artifact to create from history/recommendation tests and the existing UAT/validation materials.
- `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md`: Downstream consumers of the verification outcome in Phase 8 traceability reconciliation.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-verification-and-evidence-closure*
*Context gathered: 2026-03-12*
