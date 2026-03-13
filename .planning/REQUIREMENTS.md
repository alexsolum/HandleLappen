# Requirements: HandleAppen

**Defined:** 2026-03-08
**Core Value:** The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.

## v1.1 Requirements (Complete)

### Mobile Experience

- [x] **MOBL-01**: User can open add-item and related mobile dialogs without any content overflowing past the viewport width
- [x] **MOBL-02**: User cannot accidentally scroll the app sideways on mobile screens during normal use
- [x] **MOBL-03**: User can reliably tap the bottom navigation on mobile because it stays fixed to the bottom and uses larger touch targets

### List Interaction

- [x] **LIST-07**: User can increase or decrease an item's quantity directly from the main shopping list without opening the item details view
- [x] **LIST-08**: Newly added items always default to quantity `1` unless the user explicitly changes it

### Smart Item Entry

- [x] **SUGG-01**: As user types an item name, the app shows suggestions from items previously added in that household
- [x] **SUGG-02**: Suggestions narrow as the typed query becomes more specific
- [x] **SUGG-03**: When user picks a remembered item suggestion, the app reuses its last known category automatically

## v1.2 Requirements

Requirements for milestone v1.2: Navbar Restructure and Recipes.

### Navigation (NAV)

- [x] **NAV-01**: User sees four bottom nav tabs: Handleliste, Oppskrifter, Anbefalinger, Admin
- [x] **NAV-02**: Historikk is no longer a bottom nav tab and is accessible from the Admin hub instead

### Recipes (RECPE)

- [ ] **RECPE-01**: User can create a recipe with a name and optional cover image (upload or URL)
- [ ] **RECPE-02**: User can add ingredients to a recipe by selecting from the household's known items
- [ ] **RECPE-03**: User can edit a recipe's name, cover image, and ingredient list
- [ ] **RECPE-04**: User can delete a recipe
- [ ] **RECPE-05**: Recipe list shows each recipe's cover image (if set) and name
- [ ] **RECPE-06**: User can view a recipe and add individual ingredients to a chosen shopping list
- [ ] **RECPE-07**: User can add all recipe ingredients to a chosen shopping list in one action

### Admin Hub (ADMIN)

- [ ] **ADMIN-01**: Admin tab shows a hub page linking to Butikker, Husstand, Historikk, Items, and Brukerinnstillinger
- [ ] **ADMIN-02**: Butikker (store management) is accessible as an Admin subpage
- [ ] **ADMIN-03**: Husstand (household management) is accessible as an Admin subpage
- [ ] **ADMIN-04**: Historikk (shopping history) is accessible as an Admin subpage

### Item Management (ITEMS)

- [ ] **ITEMS-01**: Admin items page lists all items ever added by the household
- [ ] **ITEMS-02**: User can edit an item's name from the items page
- [ ] **ITEMS-03**: User can change an item's category from the items page
- [ ] **ITEMS-04**: User can add or update a picture for an item (upload from device or paste URL)

### User Settings (USRSET)

- [ ] **USRSET-01**: User can toggle dark mode from the user settings page

## Future Requirements

### Authentication & Onboarding

- **AUTH-V2-01**: User receives email verification after signup
- **AUTH-V2-02**: User can reset password via email link

### Household Management

- **HOUS-V2-01**: User can invite family members via a shareable invite link or code
- **HOUS-V2-02**: Any household member can remove another member

### Notifications

- **NOTF-V2-01**: User receives notification when another family member makes changes to the active list

### Recipes (future)

- **RECPE-F01**: Recipe ingredients include quantities and units (e.g., "2 dl fløte")
- **RECPE-F02**: User preferences sync across devices via Supabase user_preferences table

### User Settings (future)

- **USRSET-F01**: Additional accessibility and notification preferences

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS / Android app | PWA remains the delivery model |
| Price comparison across stores | Outside the core shopping-flow value |
| Push notifications | Deferred to future milestone |
| Fuzzy/AI ingredient name matching | Exact + normalized name match is sufficient; adds complexity |
| Recipe ingredient quantities/units in v1.2 | Adds parsing complexity; household picks items from memory which handles names and categories |
| Community/shared recipes across households | Requires separate public storage model; private household-scoped is sufficient |
| Supabase image transforms (CDN resize) | Requires Pro plan; client-side compression used instead |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOBL-01 | Phase 9 | Complete |
| MOBL-02 | Phase 9 | Complete |
| MOBL-03 | Phase 9 | Complete |
| LIST-07 | Phase 10 | Complete |
| LIST-08 | Phase 10 | Complete |
| SUGG-01 | Phase 11 | Complete |
| SUGG-02 | Phase 11 | Complete |
| SUGG-03 | Phase 11 | Complete |
| NAV-01 | Phase 12 | Complete |
| NAV-02 | Phase 12 | Complete |
| ADMIN-01 | Phase 13 | Pending |
| ADMIN-02 | Phase 13 | Pending |
| ADMIN-03 | Phase 13 | Pending |
| ADMIN-04 | Phase 13 | Pending |
| RECPE-01 | Phase 14 | Pending |
| RECPE-02 | Phase 14 | Pending |
| RECPE-03 | Phase 14 | Pending |
| RECPE-04 | Phase 14 | Pending |
| RECPE-05 | Phase 14 | Pending |
| RECPE-06 | Phase 14 | Pending |
| RECPE-07 | Phase 14 | Pending |
| ITEMS-01 | Phase 15 | Pending |
| ITEMS-02 | Phase 15 | Pending |
| ITEMS-03 | Phase 15 | Pending |
| ITEMS-04 | Phase 15 | Pending |
| USRSET-01 | Phase 16 | Pending |

**Coverage:**
- v1.2 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-13 after defining milestone v1.2*
