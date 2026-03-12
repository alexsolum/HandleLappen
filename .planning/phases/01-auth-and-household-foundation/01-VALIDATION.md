---
phase: 1
slug: auth-and-household-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (SvelteKit official scaffold) |
| **Config file** | `playwright.config.ts` — Wave 0 creates this |
| **Quick run command** | `npx playwright test --grep @smoke` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds (smoke), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --grep @smoke`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green + `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` returns empty
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-01, HOUS-01 | DB integration | `npx supabase db test` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-01 | E2E | `npx playwright test --grep "email signup"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | AUTH-01, AUTH-03 | E2E | `npx playwright test --grep @smoke` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | AUTH-01, AUTH-02 | E2E | `npx playwright test --grep "email signup"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | AUTH-02 | Manual + E2E | `npx playwright test --grep "google oauth"` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | AUTH-03 | E2E | `npx playwright test --grep "session persistence"` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 3 | HOUS-01 | E2E | `npx playwright test --grep "create household"` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 3 | HOUS-01 | E2E | `npx playwright test --grep "join household"` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 3 | HOUS-02 | E2E | `npx playwright test --grep "members view"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth.spec.ts` — stubs for AUTH-01, AUTH-03 (email signup + session persistence)
- [ ] `tests/household.spec.ts` — stubs for HOUS-01, HOUS-02 (create/join household, members view)
- [ ] `tests/rls.spec.ts` — stubs for `my_household_id()` function, RLS policies
- [ ] `playwright.config.ts` — configure baseURL for local dev server
- [ ] `tests/helpers/auth.ts` — shared test helper for creating authenticated test users via Supabase Admin API
- [ ] `npm install -D @playwright/test` + `npx playwright install chromium` (if not in scaffold)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth full redirect flow | AUTH-02 | Requires Google Cloud Console credentials and browser redirect — cannot be fully automated without mocking OAuth provider | 1. Configure OAuth in Google Cloud Console + Supabase dashboard. 2. Click "Fortsett med Google" on `/logg-inn`. 3. Complete Google sign-in. 4. Verify redirect to `/velkommen` (no household) or home (existing household). 5. Check Supabase Auth dashboard for new user. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
