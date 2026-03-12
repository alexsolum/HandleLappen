# Requirements: HandleAppen

**Defined:** 2026-03-08
**Core Value:** The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.

## v1.1 Requirements

### Mobile Experience

- [ ] **MOBL-01**: User can open add-item and related mobile dialogs without any content overflowing past the viewport width
- [ ] **MOBL-02**: User cannot accidentally scroll the app sideways on mobile screens during normal use
- [ ] **MOBL-03**: User can reliably tap the bottom navigation on mobile because it stays fixed to the bottom and uses larger touch targets

### List Interaction

- [ ] **LIST-07**: User can increase or decrease an item's quantity directly from the main shopping list without opening the item details view
- [ ] **LIST-08**: Newly added items always default to quantity `1` unless the user explicitly changes it

### Smart Item Entry

- [x] **SUGG-01**: As user types an item name, the app shows suggestions from items previously added in that household
- [x] **SUGG-02**: Suggestions narrow as the typed query becomes more specific
- [x] **SUGG-03**: When user picks a remembered item suggestion, the app reuses its last known category automatically

## Future Requirements

### Authentication & Onboarding

- **AUTH-V2-01**: User receives email verification after signup
- **AUTH-V2-02**: User can reset password via email link

### Household Management

- **HOUS-V2-01**: User can invite family members via a shareable invite link or code
- **HOUS-V2-02**: Any household member can remove another member

### Notifications

- **NOTF-V2-01**: User receives notification when another family member makes changes to the active list

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS / Android app | PWA remains the delivery model; this milestone improves the mobile web experience instead |
| Price comparison across stores | Still outside the core shopping-flow value |
| Meal planning / recipe integration | Separate domain, would dilute the milestone |
| Push notifications in v1.1 | Not needed to solve the current mobile usability problems |
| Broad recommendation/ML expansion | This milestone focuses on remembered items and faster entry, not new recommendation surfaces |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOBL-01 | Phase 9 | Pending |
| MOBL-02 | Phase 9 | Pending |
| MOBL-03 | Phase 9 | Pending |
| LIST-07 | Phase 10 | Pending |
| LIST-08 | Phase 10 | Pending |
| SUGG-01 | Phase 11 | Complete |
| SUGG-02 | Phase 11 | Complete |
| SUGG-03 | Phase 11 | Complete |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-12 after defining milestone v1.1*
