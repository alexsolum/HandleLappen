# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

## Active

### R001 — Google OAuth login completes session exchange
- Class: primary-user-loop
- Status: active
- Description: When a user chooses Google sign-in from the login screen, the OAuth callback is exchanged into a real Supabase session and the user ends up signed in rather than stranded on a raw callback URL.
- Why it matters: Google login is part of the real entry path; if the callback flow breaks, the user cannot enter the app through that method.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M002/S02, M002/S03
- Validation: mapped
- Notes: Current reported failure lands on `/?code=...` and leaves the user logged out.

### R002 — Failed Google OAuth returns user to `/logg-inn` with a clear retryable error
- Class: failure-visibility
- Status: active
- Description: If the Google callback code cannot be exchanged into a session, the user is redirected back to `/logg-inn` and sees a clear retryable error instead of a dead-end callback route.
- Why it matters: Auth failures need a recoverable path, not a confusing stuck state.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S03
- Validation: mapped
- Notes: User explicitly chose `/logg-inn` as the failure destination.

### R003 — Google OAuth callback behavior has automated regression coverage
- Class: quality-attribute
- Status: active
- Description: The repaired OAuth success and failure routing contract is covered by automated tests in the local harness.
- Why it matters: OAuth flows are brittle; without regression coverage the callback path can quietly break again.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: M002/S01, M002/S02
- Validation: mapped
- Notes: Coverage may use route-level or browser-level proof depending on what is practical in the local environment.

### R004 — Shared Google OAuth entry points use one valid callback contract across login and registration
- Class: integration
- Status: active
- Description: The Google sign-in initiation path is consistent across `/logg-inn` and any related registration entry point that shares the same callback mechanism.
- Why it matters: One screen should not drift into a different OAuth contract than another when both rely on the same Supabase callback flow.
- Source: inferred
- Primary owning slice: M002/S02
- Supporting slices: M002/S03
- Validation: mapped
- Notes: User reported the failure from `/logg-inn`; registration should be checked and aligned if it uses the same callback path.

## Validated

### V001 — Family members can create accounts, join a household, and stay signed in across app reopen
- Class: primary-user-loop
- Status: validated
- Description: Email/password auth, household onboarding, and protected-route session persistence work.
- Why it matters: This is the baseline app entry path already proven before M002.
- Source: execution
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: validated
- Notes: Established in M001 summaries and verification.

### V002 — Shared shopping lists support add, remove, check-off, and near real-time sync across devices
- Class: primary-user-loop
- Status: validated
- Description: Household list collaboration works across devices with realtime updates.
- Why it matters: This is the core shopping loop of the product.
- Source: execution
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S10
- Validation: validated
- Notes: Proven through targeted Playwright coverage in M001.

### V003 — Items are grouped by grocery categories and can follow default or per-store layouts
- Class: core-capability
- Status: validated
- Description: Lists can be viewed and managed using default category order and store-specific overrides.
- Why it matters: Store-layout-aware grouping is part of the app’s core usefulness in real shopping.
- Source: execution
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: validated
- Notes: Proven in Phase 3 category/store coverage.

### V004 — Barcode scanning can auto-fill item name and category through Supabase edge-function lookups
- Class: integration
- Status: validated
- Description: Barcode lookup and scanner UI can populate item details through the app’s barcode flow.
- Why it matters: Barcode-assisted entry reduces manual typing for common products.
- Source: execution
- Primary owning slice: M001/S04
- Supporting slices: M001/S10
- Validation: validated
- Notes: Proven through focused barcode tests and function coverage.

### V005 — Shopping history and recommendation views are available from the app navigation
- Class: differentiator
- Status: validated
- Description: Users can browse grouped history and act on recommendations from the main app navigation.
- Why it matters: This supports continuity and faster recurring shopping loops.
- Source: execution
- Primary owning slice: M001/S06
- Supporting slices: M001/S07
- Validation: validated
- Notes: Verified in targeted history and recommendation suites.

### V006 — Mobile dialogs fit within the viewport without sideways overflow
- Class: quality-attribute
- Status: validated
- Description: Mobile sheets and related dialogs stay inside the viewport width.
- Why it matters: The app must feel stable on phones.
- Source: execution
- Primary owning slice: M001/S09
- Supporting slices: none
- Validation: validated
- Notes: Proven in mobile layout coverage.

### V007 — Bottom navigation stays fixed and thumb-friendly on mobile
- Class: quality-attribute
- Status: validated
- Description: The bottom navigation is pinned and usable on narrow mobile screens.
- Why it matters: Primary navigation must stay reliably tappable during shopping.
- Source: execution
- Primary owning slice: M001/S09
- Supporting slices: none
- Validation: validated
- Notes: Proven in mobile layout coverage.

### V008 — Quantity can be edited inline from the main list and new items default to quantity 1
- Class: core-capability
- Status: validated
- Description: Main-list steppers work and add flows share quantity `1` as the default baseline.
- Why it matters: This removes friction in the primary shopping loop.
- Source: execution
- Primary owning slice: M001/S10
- Supporting slices: none
- Validation: validated
- Notes: Proven in item, barcode, and mobile regression tests.

### V009 — Previously added household items appear as suggestions and reuse remembered categories
- Class: differentiator
- Status: validated
- Description: Household item memory powers inline suggestions and remembered category reuse.
- Why it matters: Recurring item entry is faster and less repetitive.
- Source: execution
- Primary owning slice: M001/S11
- Supporting slices: none
- Validation: validated
- Notes: Proven in item-memory and mobile regression tests.

## Deferred

None currently tracked.

## Out of Scope

### O001 — General auth redesign beyond the Google callback flow
- Class: anti-feature
- Status: out-of-scope
- Description: M002 does not redesign the broader auth system, login UX, or unrelated session flows.
- Why it matters: This keeps the milestone focused on the reported Google OAuth defect.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Follow-up auth improvements can become a later milestone if needed.

### O002 — Non-Google provider work
- Class: anti-feature
- Status: out-of-scope
- Description: This milestone does not add or repair other OAuth providers.
- Why it matters: It prevents the callback bug fix from expanding into general provider support.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Scope is intentionally limited to Google.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | active | M002/S01 | M002/S02, M002/S03 | mapped |
| R002 | failure-visibility | active | M002/S02 | M002/S03 | mapped |
| R003 | quality-attribute | active | M002/S03 | M002/S01, M002/S02 | mapped |
| R004 | integration | active | M002/S02 | M002/S03 | mapped |
| V001 | primary-user-loop | validated | M001/S01 | none | validated |
| V002 | primary-user-loop | validated | M001/S02 | M001/S03, M001/S10 | validated |
| V003 | core-capability | validated | M001/S03 | none | validated |
| V004 | integration | validated | M001/S04 | M001/S10 | validated |
| V005 | differentiator | validated | M001/S06 | M001/S07 | validated |
| V006 | quality-attribute | validated | M001/S09 | none | validated |
| V007 | quality-attribute | validated | M001/S09 | none | validated |
| V008 | core-capability | validated | M001/S10 | none | validated |
| V009 | differentiator | validated | M001/S11 | none | validated |
| O001 | anti-feature | out-of-scope | none | none | n/a |
| O002 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 4
- Mapped to slices: 4
- Validated: 9
- Unmapped active requirements: 0
