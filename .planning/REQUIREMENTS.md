# Requirements: HandleAppen

**Defined:** 2026-03-08
**Core Value:** The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: User can sign in with Google OAuth
- [x] **AUTH-03**: User session persists across browser refresh and app reopen

### Household

- [x] **HOUS-01**: User can create a household (family group) during onboarding
- [x] **HOUS-02**: User can view the members of their household

### Shopping Lists

- [x] **LIST-01**: User can create a named shopping list
- [x] **LIST-02**: User can delete a shopping list
- [x] **LIST-03**: User can add an item to a list by typing a name
- [x] **LIST-04**: User can remove an item from a list
- [x] **LIST-05**: User can check off an item while shopping (marks as done)
- [x] **LIST-06**: Changes to a list (add, remove, check off) sync to all family devices within a few seconds

### Categories & Store Layout

- [ ] **CATG-01**: Items in a list are grouped by category (e.g., Produce, Dairy, Meat, Frozen)
- [ ] **CATG-02**: Categories are sorted by a default store layout order that reflects how Norwegian grocery stores are structured
- [ ] **CATG-03**: Any family member can create a per-store layout — a custom category order for a specific store
- [ ] **CATG-04**: Any family member can add, rename, or delete categories
- [ ] **CATG-05**: User can manually assign or change an item's category

### Barcode & Product Identification

- [ ] **BARC-01**: User can open a camera view and scan a product barcode to add it to the list
- [ ] **BARC-02**: App fetches product data from Kassal.app (Norwegian products) with Open Food Facts as fallback
- [ ] **BARC-03**: App passes product data to Gemini AI to identify the product name and category intelligently
- [ ] **BARC-04**: Item name and category are auto-filled from the barcode scan result

### History

- [x] **HIST-01**: Every item checked off during shopping is logged to the database (item name, category, list, store, timestamp, who checked it off)
- [ ] **HIST-02**: User can browse a history view showing past shopping sessions grouped by date and list

### Recommendations

- [ ] **RECD-01**: App recommends items the household frequently buys, based on purchase history (frequency-based, SQL-driven)
- [ ] **RECD-02**: App recommends items frequently bought together with items already on the list (co-purchase patterns)
- [ ] **RECD-03**: Recommendations are shown in a dedicated section accessible from the bottom navigation

### PWA

- [ ] **PWAF-01**: App is installable on mobile home screen via browser "Add to Home Screen"
- [ ] **PWAF-02**: App displays the last cached shopping list when the device is offline or has poor signal

## v2 Requirements

### Authentication & Onboarding

- **AUTH-V2-01**: User receives email verification after signup
- **AUTH-V2-02**: User can reset password via email link

### Household Management

- **HOUS-V2-01**: User can invite family members via a shareable invite link or code
- **HOUS-V2-02**: Any household member can remove another member

### Performance & Caching

- **PERF-V2-01**: Scanned product data is cached in the database (so the same EAN is never fetched twice)
- **PERF-V2-02**: Service worker provides fast first load and offline app shell caching

### Notifications

- **NOTF-V2-01**: User receives notification when another family member makes changes to the active list

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS / Android app | PWA covers mobile use case — no app store needed |
| Price comparison across stores | Mattilbud already does this better; not core value |
| Meal planning / recipe integration | Separate domain, dilutes focus |
| Push notifications (v1) | Unreliable on iOS PWA; defer to v2 |
| Collaborative filtering / ML recommendations | Household data too sparse; frequency SQL is sufficient |
| Multi-language UI | Norwegian-first; English fallback acceptable later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| HOUS-01 | Phase 1 | Complete |
| HOUS-02 | Phase 1 | Complete |
| LIST-01 | Phase 2 | Complete |
| LIST-02 | Phase 2 | Complete |
| LIST-03 | Phase 2 | Complete |
| LIST-04 | Phase 2 | Complete |
| LIST-05 | Phase 2 | Complete |
| LIST-06 | Phase 2 | Complete |
| HIST-01 | Phase 2 | Complete |
| CATG-01 | Phase 3 | Pending |
| CATG-02 | Phase 3 | Pending |
| CATG-03 | Phase 3 | Pending |
| CATG-04 | Phase 3 | Pending |
| CATG-05 | Phase 3 | Pending |
| BARC-01 | Phase 4 | Pending |
| BARC-02 | Phase 4 | Pending |
| BARC-03 | Phase 4 | Pending |
| BARC-04 | Phase 4 | Pending |
| PWAF-01 | Phase 5 | Pending |
| PWAF-02 | Phase 5 | Pending |
| HIST-02 | Phase 6 | Pending |
| RECD-01 | Phase 6 | Pending |
| RECD-02 | Phase 6 | Pending |
| RECD-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

**Phase change notes (vs. initial draft):**
- HIST-01 moved from Phase 5 to Phase 2: history logging must start when check-off is built to avoid cold-start data loss
- HIST-02 separated from HIST-01: the history VIEW requires data to be useful; placed in Phase 6 alongside recommendations
- PWAF-01 and PWAF-02 moved from Phase 7 to Phase 5: offline support is its own coherent phase; no Phase 7 needed
- Phase 5 (PWA/Offline) is now the correct home for both PWAF requirements; Phase 6 is the final phase

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation (traceability updated to 6-phase structure)*
