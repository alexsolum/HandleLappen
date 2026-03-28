# Requirements: HandleAppen

**Defined:** 2026-03-08
**Core Value:** The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.

## v1.0 Requirements (Complete)

### Barcode Scanning (BARC)

- [x] **BARC-01**: User taps a "Scan" button, the camera opens, and a detected barcode triggers a product lookup without any additional user action
- [x] **BARC-02**: Kassal.app is the primary provider; when Kassal does not find the EAN, Open Food Facts is used as a silent fallback — the user sees one result or a clear "not found" message, never two separate provider results
- [x] **BARC-03**: Scanned product name and canonical category are normalized via Gemini and pre-filled in the confirmation sheet within 2 seconds for a recognized Norwegian product EAN
- [x] **BARC-04**: Barcode scanning works in iOS Safari PWA standalone mode using the html5-qrcode WASM polyfill; no native BarcodeDetector API is required, and the Kassal.app Bearer token never appears in browser DevTools network requests

### History and Recommendations (HIST/RECD)

- [ ] **HIST-02**: User can browse household shopping history grouped by date/list and add items back to an active list
- [ ] **RECD-01**: User sees frequency-based recommendations built from household history
- [ ] **RECD-02**: User sees co-purchase recommendations derived from same-session history patterns

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
- [x] **RECPE-02**: User can add ingredients to a recipe by selecting from the household's known items
- [ ] **RECPE-03**: User can edit a recipe's name, cover image, and ingredient list
- [ ] **RECPE-04**: User can delete a recipe
- [ ] **RECPE-05**: Recipe list shows each recipe's cover image (if set) and name
- [x] **RECPE-06**: User can view a recipe and add individual ingredients to a chosen shopping list
- [x] **RECPE-07**: User can add all recipe ingredients to a chosen shopping list in one action

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

## v2.0 Requirements

Requirements for milestone v2.0: Barcode Scanner Improvement and Product Lookup.

### Scanner Reliability (SCAN)

- [x] **SCAN-01**: Barcode scanner camera opens without black screen on iOS Safari in PWA standalone mode
- [x] **SCAN-02**: When camera access is denied, app shows a distinct "go to Settings" message; when only dismissed, shows "Try again" without alarming UI
- [x] **SCAN-03**: Scanner provides haptic feedback on successful barcode detection

### Product Data Enrichment (ENRICH)

- [ ] **ENRICH-01**: Scanned product's brand name is fetched from Kassal.app and stored in the barcode cache
- [ ] **ENRICH-02**: Scanned product's image URL is fetched from Kassal.app and stored in the barcode cache
- [ ] **ENRICH-03**: Product brand and image URL are written to list items at scan-add time
- [ ] **ENRICH-04**: Product brand and image URL are written to household item memory for future scan suggestions

### Product Display (DISP)

- [ ] **DISP-01**: Scan result sheet shows product image and brand before user confirms adding to list
- [ ] **DISP-02**: Shopping list item rows show a product thumbnail when one is available, with graceful fallback if image fails to load
- [ ] **DISP-03**: Admin → Items shows product image and brand per item
- [ ] **DISP-04**: Varekatalog shows product image and brand per item

## v2.2 Requirements

Requirements for milestone v2.2: Location Smartness.

### Store Location (STORELOC)

- [x] **STORELOC-01**: User can place a pin on a map in the store admin page to save the store's geographic coordinates
- [x] **STORELOC-02**: User can see a store's saved location displayed on a map when editing that store

### Location Detection (LOCATE)

- [ ] **LOCATE-01**: App detects the user's proximity to saved stores while the app is in the foreground using battery-safe geolocation polling
- [ ] **LOCATE-02**: App requests geolocation permission with a clear explanation of why it's needed
- [ ] **LOCATE-03**: When geolocation is unavailable or denied, the user can manually select a store to enter shopping mode

### Shopping Mode (SHOP)

- [ ] **SHOP-01**: App enters shopping mode automatically when the user is within 150m of a saved store for at least 90 seconds
- [ ] **SHOP-02**: Shopping mode displays a branded banner showing the store name with chain-specific colors (Rema 1000 blue, Kiwi green, Meny red, Coop Extra yellow/red)
- [ ] **SHOP-03**: Shopping mode auto-selects the detected store's category layout for list sorting
- [ ] **SHOP-04**: User can dismiss shopping mode manually via a close control on the banner

### Check-off Behavior (CHKOFF)

- [ ] **CHKOFF-01**: Items checked off while in shopping mode are recorded in shopping history with the detected store context
- [ ] **CHKOFF-02**: Items checked off while near the user's home location are treated as deletions and not recorded in shopping history
- [ ] **CHKOFF-03**: User can set their home location once from user settings (map pin placement)

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
| Background geofencing (app closed) | PWAs have no reliable background geolocation on iOS; foreground-only is the correct scope |
| Indoor aisle-level tracking | Requires BLE beacons or store infrastructure; category sorting already solves navigation |
| Push notification on store arrival | Depends on background geofencing; push notifications already out of scope |
| Continuous high-accuracy GPS | Drains battery in 30–40 min; Wi-Fi/cell accuracy sufficient for 150m geofence |
| Raw location history server-side | GDPR risk; store only matched storeId and timestamp on check-off |
| Auto-create stores from GPS | Creates garbage records; admin-managed stores ensure layout quality |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BARC-01 | Phase 4 | Complete |
| BARC-02 | Phase 4 | Complete |
| BARC-03 | Phase 4 | Complete |
| BARC-04 | Phase 4 | Complete |
| HIST-02 | Phase 21 | Pending |
| RECD-01 | Phase 21 | Pending |
| RECD-02 | Phase 21 | Pending |
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
| RECPE-02 | Phase 14 | Complete |
| RECPE-03 | Phase 14 | Pending |
| RECPE-04 | Phase 14 | Pending |
| RECPE-05 | Phase 14 | Pending |
| RECPE-06 | Phase 14 | Complete |
| RECPE-07 | Phase 14 | Complete |
| ITEMS-01 | Phase 15 | Pending |
| ITEMS-02 | Phase 15 | Pending |
| ITEMS-03 | Phase 15 | Pending |
| ITEMS-04 | Phase 15 | Pending |
| USRSET-01 | Phase 16 | Pending |
| SCAN-01 | Phase 18 | Complete |
| SCAN-02 | Phase 18 | Complete |
| SCAN-03 | Phase 18 | Complete |
| ENRICH-01 | Phase 19 | Pending |
| ENRICH-02 | Phase 19 | Pending |
| ENRICH-03 | Phase 20 | Pending |
| ENRICH-04 | Phase 20 | Pending |
| DISP-01 | Phase 20 | Pending |
| DISP-02 | Phase 20 | Pending |
| DISP-03 | Phase 20 | Pending |
| DISP-04 | Phase 20 | Pending |
| STORELOC-01 | Phase 23 | Complete |
| STORELOC-02 | Phase 23 | Complete |
| LOCATE-01 | Phase 24 | Pending |
| LOCATE-02 | Phase 24 | Pending |
| LOCATE-03 | Phase 24 | Pending |
| SHOP-01 | Phase 25 | Pending |
| SHOP-02 | Phase 25 | Pending |
| SHOP-03 | Phase 25 | Pending |
| SHOP-04 | Phase 25 | Pending |
| CHKOFF-01 | Phase 25 | Pending |
| CHKOFF-02 | Phase 26 | Pending |
| CHKOFF-03 | Phase 26 | Pending |

**Coverage:**
- v1.0 requirements: 7 total
- v1.1 requirements: 8 total (part of v1.2 release)
- v1.2 requirements: 18 total
- v2.0 requirements: 11 total
- v2.2 requirements: 12 total — all mapped to phases 23-26 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-28 after v2.2 roadmap created — all 12 v2.2 requirements mapped to phases 23-26*
