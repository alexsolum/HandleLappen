# Phase 7: Verification and Evidence Closure - Research

**Researched:** 2026-03-12
**Phase:** 07-verification-and-evidence-closure
**Requirements:** BARC-01, BARC-02, BARC-03, BARC-04, PWAF-01, PWAF-02, HIST-02, RECD-01, RECD-02, RECD-03

## Research Goal

Determine what the planner needs in order to produce executable plans that close the audit gap for Phases 4, 5, and 6 without rebuilding those phases. Phase 7 should produce formal verification artifacts that map each orphaned requirement to concrete evidence, record any open proof gaps honestly, and restore requirement-level traceability for the milestone audit.

## Bottom Line

Phase 7 should be planned as three parallel documentation-and-audit plans:

1. Verify Phase 4 barcode delivery and write `04-VERIFICATION.md`
2. Verify Phase 5 PWA/offline delivery and write `05-VERIFICATION.md`
3. Verify Phase 6 history/recommendation delivery and write `06-VERIFICATION.md`

The key planning rule is that each verification file must be requirement-driven, not feature-summary-driven. The planner should force every requirement ID to appear in a requirement-to-evidence mapping table or section, and it should distinguish:

- direct automated evidence
- supporting code evidence
- prior UAT/manual evidence
- unresolved or partial proof

This phase succeeds when the orphaned requirement IDs are covered by formal verification artifacts, not when the app gains new behavior.

## Existing System Facts That Matter

### Audit gap location
- `ROADMAP.md` and `REQUIREMENTS.md` were already updated on 2026-03-12 to move BARC-01..04, PWAF-01..02, HIST-02, and RECD-01..03 into Phase 7 for verification closure.
- The missing artifacts called out by the roadmap are `04-VERIFICATION.md`, `05-VERIFICATION.md`, and `06-VERIFICATION.md`.

### Evidence already present in the repo
- Phase 4 already has `04-CONTEXT.md`, `04-RESEARCH.md`, `04-VALIDATION.md`, plan files, summary files, barcode Playwright coverage, and Deno tests for the Edge Function.
- Phase 5 already has `05-CONTEXT.md`, `05-RESEARCH.md`, `05-VALIDATION.md`, `05-UAT.md`, and targeted Playwright files `tests/pwa.spec.ts` and `tests/offline.spec.ts`.
- Phase 6 already has `06-CONTEXT.md`, `06-RESEARCH.md`, `06-VALIDATION.md`, `06-UAT.md`, and targeted Playwright files `tests/history.spec.ts` and `tests/recommendations.spec.ts`.

### Evidence asymmetry between phases
- Phase 4 has the strongest technical automation but the weakest documented manual checkpoint trail for device-only behavior.
- Phase 5 has strong browser automation plus a completed UAT artifact, but installability and standalone-mode claims remain manual-heavy.
- Phase 6 is the cleanest phase to verify because it already has dedicated UAT and browser coverage for the requirement surface.

Planning implication: do not force a one-size-fits-all verdict style. The verification docs should share a structure, but the evidence mix can differ per phase.

## Locked User Decisions From Phase 7 Context

These decisions should be treated as non-negotiable during planning:

- Verification is requirement-level, not just an overall phase narrative.
- Automated tests are the primary proof standard wherever they already exist.
- Code inspection can support a claim but does not replace missing requirement evidence by default.
- Partial evidence must remain partial and cannot be silently counted as covered.
- Phase 4 barcode verification uses a hybrid rule: browser/server automation can pass non-device behavior, but device-specific scan claims stay open unless backed by explicit manual evidence.
- Phase 5 installability and standalone-PWA claims require manual evidence; manifest/service-worker proof alone is not enough.
- Existing Phase 5 and Phase 6 tests/UAT can be reused as first-class evidence if the mapping is explicit and still matches current code.
- A concise written checkpoint note is sufficient manual evidence when manual-only proof exists.

## Recommended Verification Artifact Structure

Each `*-VERIFICATION.md` should use the same high-level shape so Phase 8 can consume them predictably:

1. Phase summary and verification date
2. Evidence inventory
3. Requirement-by-requirement mapping
4. Residual risks / open proof gaps
5. Phase verdict

Recommended requirement mapping fields:

- Requirement ID
- Requirement statement
- Evidence type
- Concrete evidence references
- Coverage verdict: `covered`, `partial`, or `missing`
- Notes / residual risk

The important planning constraint is that requirement coverage must be machine-readable enough for a later audit pass to inspect quickly, even if the format is markdown.

## Phase-Specific Research Findings

### Phase 4 verification posture

Recommended planning posture:
- Treat `tests/barcode.spec.ts` and `supabase/functions/barcode-lookup/index.test.ts` as primary automated evidence.
- Use `04-VALIDATION.md` as the source for which behaviors were intended to be manual-only.
- Separate device-only claims from browser/server evidence.
- If there is no sufficiently specific prior manual checkpoint for iPhone Safari or installed PWA scanning, mark those parts as open or partial instead of over-claiming.

Likely requirement mapping direction:
- `BARC-02`, `BARC-03`, `BARC-04` can lean heavily on function/browser tests plus code inspection.
- `BARC-01` and the iOS/PWA portion of `BARC-04` are where manual evidence pressure is highest.

### Phase 5 verification posture

Recommended planning posture:
- Reuse `tests/pwa.spec.ts`, `tests/offline.spec.ts`, `05-UAT.md`, and `05-VALIDATION.md`.
- Split `PWAF-01` internally into two evidence categories: browser-installability groundwork vs actual install/manual standalone behavior.
- Make residual risk explicit if there is no direct install note for one platform.

Likely requirement mapping direction:
- `PWAF-02` should be strongly covered by the offline Playwright suite plus UAT.
- `PWAF-01` should combine manifest/service worker evidence with manual/UAT notes where available.

### Phase 6 verification posture

Recommended planning posture:
- Reuse existing targeted browser tests and `06-UAT.md`.
- Focus on proving the mapping from requirement to existing route/query/test coverage, not on rediscovering the feature.
- Keep the verdict clear and likely positive unless code/UAT drift is found.

Likely requirement mapping direction:
- `HIST-02`, `RECD-01`, `RECD-02`, and `RECD-03` should each map to one or more explicit test cases plus relevant route/query files and the existing UAT artifact.

## Planning Risks And Pitfalls

### Pitfall 1: Rewriting history instead of verifying it
- Phase 7 is not a late feature-build phase.
- Plans should avoid editing product code unless verification finds a genuine blocking defect or missing evidence hook.
- Default output should be verification docs, not implementation changes.

### Pitfall 2: Overstating manual-only claims
- The context explicitly rejects silent soft-passes.
- If installability or physical-camera behavior lacks specific proof, the verification doc must say so.

### Pitfall 3: Mixing requirements together
- A phase-level “looks good” summary is not enough.
- Each orphaned ID must be named and mapped individually.

### Pitfall 4: Letting validation docs substitute for verification docs
- Existing `*-VALIDATION.md` files describe intended testing strategy during execution.
- They are evidence sources, not the final audit artifact.
- The new `*-VERIFICATION.md` files must synthesize actual evidence from code, tests, and UAT.

### Pitfall 5: Ignoring code drift
- Reused UAT/test evidence is only valid if the referenced code path still matches the delivered implementation.
- Plans should include a quick code-to-evidence consistency check before writing the final verdict.

## Reusable Inputs For The Planner

### Phase 4 inputs
- `.planning/phases/04-barcode-scanning/04-CONTEXT.md`
- `.planning/phases/04-barcode-scanning/04-RESEARCH.md`
- `.planning/phases/04-barcode-scanning/04-VALIDATION.md`
- `.planning/phases/04-barcode-scanning/04-01-SUMMARY.md`
- `.planning/phases/04-barcode-scanning/04-02-SUMMARY.md`
- `tests/barcode.spec.ts`
- `supabase/functions/barcode-lookup/index.test.ts`
- `src/lib/queries/barcode.ts`
- `src/lib/components/barcode/*.svelte`
- `src/routes/(protected)/lister/[id]/+page.svelte`

### Phase 5 inputs
- `.planning/phases/05-pwa-and-offline-support/05-CONTEXT.md`
- `.planning/phases/05-pwa-and-offline-support/05-RESEARCH.md`
- `.planning/phases/05-pwa-and-offline-support/05-VALIDATION.md`
- `.planning/phases/05-pwa-and-offline-support/05-UAT.md`
- `.planning/phases/05-pwa-and-offline-support/05-01-SUMMARY.md`
- `.planning/phases/05-pwa-and-offline-support/05-02-SUMMARY.md`
- `tests/pwa.spec.ts`
- `tests/offline.spec.ts`
- `src/service-worker.ts`
- `src/lib/offline/queue.ts`
- `src/lib/stores/offline.svelte.ts`
- `src/routes/(protected)/+layout.svelte`

### Phase 6 inputs
- `.planning/phases/06-history-view-and-recommendations/06-CONTEXT.md`
- `.planning/phases/06-history-view-and-recommendations/06-RESEARCH.md`
- `.planning/phases/06-history-view-and-recommendations/06-VALIDATION.md`
- `.planning/phases/06-history-view-and-recommendations/06-UAT.md`
- `.planning/phases/06-history-view-and-recommendations/06-01-SUMMARY.md`
- `.planning/phases/06-history-view-and-recommendations/06-02-SUMMARY.md`
- `.planning/phases/06-history-view-and-recommendations/06-03-SUMMARY.md`
- `.planning/phases/06-history-view-and-recommendations/06-04-SUMMARY.md`
- `tests/history.spec.ts`
- `tests/recommendations.spec.ts`
- `src/routes/(protected)/anbefalinger/+page.svelte`
- `src/routes/(protected)/anbefalinger/+page.server.ts`
- `src/lib/queries/history.ts`
- `src/lib/queries/recommendations.ts`

## Planning Guidance

The cleanest plan split is one plan per legacy phase, all in Wave 1:

### Plan 07-01: Verify barcode phase and write `04-VERIFICATION.md`
- Audit Phase 4 requirements against tests, code, validation notes, and any manual evidence
- Distinguish covered vs partial device-only claims
- Produce a formal verification artifact with a clear verdict

### Plan 07-02: Verify PWA/offline phase and write `05-VERIFICATION.md`
- Audit `PWAF-01` and `PWAF-02`
- Reuse browser tests and `05-UAT.md`
- Record residual risk explicitly where install/manual evidence is weaker than ideal

### Plan 07-03: Verify history/recommendation phase and write `06-VERIFICATION.md`
- Audit `HIST-02` and `RECD-01..03`
- Reuse existing test and UAT artifacts
- Produce a clear verdict and explicit requirement mapping

Each plan should be mostly documentation work with targeted evidence review. They are naturally parallel because they touch disjoint verification files.

## Validation Architecture

Phase 7 validation should verify the quality of the verification artifacts themselves while reusing the existing late-phase automated suites as spot checks.

### Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | markdown artifact audit + targeted Playwright/Deno reruns |
| Config file | `playwright.config.ts` and `supabase/functions/barcode-lookup/deno.json` |
| Quick run command | `deno test --allow-env --allow-net --allow-read supabase/functions/barcode-lookup/index.test.ts && npx playwright test tests/barcode.spec.ts tests/pwa.spec.ts tests/offline.spec.ts tests/history.spec.ts tests/recommendations.spec.ts --reporter=list` |
| Full suite command | `npx playwright test && deno test --allow-env --allow-net --allow-read supabase/functions/barcode-lookup/index.test.ts` |
| Estimated runtime | ~180 seconds |

### Phase Requirements → Validation Approach

| Requirement set | Validation approach |
|-----------------|--------------------|
| `BARC-01..04` | audit `04-VERIFICATION.md` against barcode code/tests/manual evidence references; rerun barcode suites if evidence freshness is unclear |
| `PWAF-01..02` | audit `05-VERIFICATION.md` against PWA/offline tests and UAT; ensure install/manual claims are not over-stated |
| `HIST-02`, `RECD-01..03` | audit `06-VERIFICATION.md` against history/recommendation tests and UAT; ensure each requirement is mapped explicitly |

### Required quality checks
- every Phase 7 plan task ends in a concrete verification file update
- every orphaned requirement ID appears in some verification artifact
- every verification artifact states whether a requirement is covered, partial, or missing
- residual risk is named explicitly rather than hidden in prose
- no verification doc claims manual-only behavior without citing a specific checkpoint note

## Conclusion

Phase 7 is a traceability-repair phase. The planner should keep it narrow, parallel, and evidence-driven. The main burden is not inventing new product behavior; it is producing three formal verification artifacts that truthfully connect the delivered late-phase code to the roadmap requirements.
