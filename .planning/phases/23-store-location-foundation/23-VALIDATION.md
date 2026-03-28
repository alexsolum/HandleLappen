---
phase: 23
slug: store-location-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | STORELOC-01 | migration | `npm run test` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | STORELOC-01 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 23-02-01 | 02 | 2 | STORELOC-02 | manual | see manual verifications | N/A | ⬜ pending |
| 23-02-02 | 02 | 2 | STORELOC-02 | manual | see manual verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/stores/__tests__/store-location.test.ts` — stubs for STORELOC-01 (coordinate persistence, type safety)
- [ ] Existing vitest infrastructure covers framework requirement

*Wave 0 installs test stubs before implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map pin placement and visual marker display | STORELOC-02 | Requires browser interaction with Leaflet map | Open store edit page, click map to place pin, verify marker appears at click location |
| Pin persists after page reload | STORELOC-02 | Requires browser state + DB round-trip verification | Save store with pin, reload page, verify pin renders at same coordinates |
| OpenStreetMap tiles load without API key | STORELOC-02 | Network/browser tile loading cannot be unit tested | Open edit page on fresh session, confirm map tiles render from OpenStreetMap CDN with no auth errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
