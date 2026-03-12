# Backlog: HandleAppen

## Functional Tech Debt (v1.0 Residuals)

These items are known issues or verification gaps from the v1.0 milestone that are accepted for release but should be addressed in the next cycle.

- **[TD-01] Phase 1: Flaky Auth Smoke Tests:** Playwright auth tests occasionally timeout during CI/headless runs even when manual verification passes. (Source: 01-VERIFICATION.md)
- **[TD-02] Phase 4: Scanner Hardware Variance:** Real-world performance (autofocus, lighting) varies by device; verified via mock but requires broader field testing. (Source: 04-VERIFICATION.md)
- **[TD-03] Phase 5: Safari PWA Standalone Verification:** Manual-only verification for "Add to Home Screen" behavior on iOS Safari. (Source: 05-VERIFICATION.md)
- **[TD-04] Phase 5: Offline Queue Assertion Flakiness:** `offline.spec.ts` occasionally fails to detect the pending count during optimistic updates due to race conditions. (Source: 05-VERIFICATION.md)
- **[TD-05] Phase 6: Recommendation Cold Start:** Suggestions are hidden until 10 sessions are completed. While intentional, this results in an "empty" state for new households. (Source: 06-VERIFICATION.md)

## Future Features (v2.0)

Planned capabilities deferred to the next milestone.

### Authentication & Onboarding
- **AUTH-V2-01**: User receives email verification after signup.
- **AUTH-V2-02**: User can reset password via email link.

### Household Management
- **HOUS-V2-01**: User can invite family members via a shareable invite link or code.
- **HOUS-V2-02**: Any household member can remove another member.

### Performance & Caching
- **PERF-V2-01**: Scanned product data is cached in the database (so the same EAN is never fetched twice).
- **PERF-V2-02**: Service worker provides fast first load and offline app shell caching.

### Notifications
- **NOTF-V2-01**: User receives notification when another family member makes changes to the active list.
