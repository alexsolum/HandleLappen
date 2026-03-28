# Feature Research

**Domain:** Location-aware shopping mode for grocery PWA (HandleAppen v2.2)
**Researched:** 2026-03-28
**Confidence:** MEDIUM — table stakes and differentiators derived from competitor analysis and geolocation/geofencing research; PWA-specific constraints verified against official sources

## Context

This is a subsequent milestone research document. HandleAppen v2.2 adds location-aware shopping mode to an already-built app with: shared lists, real-time sync, store layouts with category ordering, barcode scanning, shopping history, offline support, household item memory, and recipes.

All features below concern ONLY the new location-aware capabilities. Dependencies on existing infrastructure are called out explicitly.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once "location detection" is offered. Missing these makes the feature feel half-finished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Permission prompt with clear explanation | Browser requires it; users deny without clear "why" | LOW | Must explain "to detect when you're at a store" — vague prompts get denied and cannot be re-triggered |
| Visual confirmation of detected store | Users need to know detection worked and which store was found | LOW | A banner or header change is the standard pattern (Meijer, Target, Walmart all use visible in-store mode indicators) |
| Manual store selection as fallback | GPS fails indoors; stores in basements or dense buildings — always needed | LOW | Tap to select store from list; existing store management in admin already supplies the store list |
| Dismiss / exit shopping mode | Users must be able to leave mode intentionally (wrong detection, browsing from home) | LOW | Persistent close/exit control on banner; mode must not be sticky |
| Store layout auto-selected in shopping mode | Core value of HandleAppen is category sorting — mode must trigger layout | LOW | Existing store layout logic wires in; layout selection is the trigger, not new logic |
| Location data not persisted without consent | GDPR expectation in Norwegian market; privacy-first is non-negotiable | MEDIUM | Store only proximity boolean or matched storeId — never raw coordinates server-side |

### Differentiators (Competitive Advantage)

Features that make HandleAppen's location mode better than competitors or more coherent with its existing design.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Branded store banner (Rema 1000 blue, Kiwi green, Meny red, Coop Extra yellow/red) | Immediate visual orientation — user sees which store they're in at a glance, no ambiguity | LOW-MEDIUM | Brand colors are well-known to Norwegian users; requires brand color constants and chain name/logo per chain; purely client-side data |
| Home location — check-offs treated as deletions | Solves the "I deleted it at home vs. bought it at store" ambiguity that poisons shopping history accuracy | MEDIUM | Home location set once in settings; proximity match to home suppresses history write on check-off |
| Store proximity — check-offs recorded as shopping history | Makes history and recommendations reflect real purchases, not at-home list edits | MEDIUM | Requires pairing check-off events with detected store context; existing history table and recommendation logic depend on this signal being clean |
| 100m geofence auto-activation | App switches mode without user action — removes the "remember to tap" friction before entering store | MEDIUM | Most grocery apps require manual store selection; auto-detection is the differentiator. Requires watchPosition polling while app is in foreground; background mode unavailable on PWA |
| Store location set by admin via map pin or address | Admin can place stores precisely so the geofence radius is accurate, not approximate | MEDIUM | Requires geocoding (address to lat/lng) or map pin UI in admin; adds lat/lng columns to stores table in DB |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Background geofencing (auto-detection when app is closed) | "Why does the app need to be open?" | PWAs have no reliable background geolocation on iOS or Android. iOS terminates background tasks aggressively; Background Sync is unreliable on iOS. True background detection requires native apps. Implementing this will fail silently on iOS and drain battery on Android. | Accept foreground-only detection; guide users to open the app when arriving at the store — this is the normal grocery app interaction pattern already |
| Indoor aisle-level location tracking | "Show me where item X is in the store" | Requires BLE beacons or store-provided indoor maps — entirely outside the PWA's control, requires per-store infrastructure deals | Category-sorted list already solves navigation without indoor GPS; this is HandleAppen's core differentiator |
| Push notification on store arrival | "Notify me to open the app when I'm near a store" | Requires background geofencing (unavailable in PWA), plus HandleAppen deferred push notifications to v2+ as already out of scope | Deferred to future milestone; depends on resolving PWA notification limitations first |
| Continuous high-accuracy GPS (enableHighAccuracy: true always on) | Seems like it would be more accurate | enableHighAccuracy uses the GPS chip continuously — drains battery within 30–40 minutes during a shop. For a 100m radius, Wi-Fi/cell-based location (20–50m accuracy) is sufficient and far less power-intensive. | Use enableHighAccuracy: false for proximity polling; only enable high accuracy if the first fix fails or accuracy reported is too low |
| Persistent raw location history server-side | "We could analyze shopping patterns" | Raw location data is a GDPR risk in Norwegian market. Storing coordinates long-term requires explicit consent and data retention policies — disproportionate to the feature value. | Store only the matched storeId and timestamp on check-off; never persist raw coordinates |
| Automatic store creation from GPS | "If I'm somewhere new, create a store for me" | Creates garbage store records; app has admin-managed stores for a reason — quality control matters for layout correctness | Admin sets locations explicitly via map pin or address entry |

---

## Feature Dependencies

```
[Store location saved (lat/lng in DB)]
    └──required by──> [Proximity detection / geofence check]
                          └──required by──> [Shopping mode auto-activation]
                                                └──enables──> [Store layout auto-selection]
                                                └──enables──> [Branded store banner]
                                                └──enables──> [History-aware check-off behavior]

[Home location setting (user settings)]
    └──required by──> [Home-location check-off suppression]
                          └──complements──> [History-aware check-off behavior]

[Shopping mode state (active store context)]
    └──required by──> [Check-off to shopping history write]
    └──required by──> [Branded store banner]
    └──required by──> [Store layout auto-selection]

[Existing: store layout system]
    └──consumed by──> [Store layout auto-selection in shopping mode]

[Existing: shopping history write logic]
    └──modified by──> [History-aware check-off behavior]

[Manual store selection (fallback)]
    └──alternative path to──> [Shopping mode auto-activation]
```

### Dependency Notes

- **Store lat/lng requires admin store location management first:** Stores must have coordinates before any geofencing can work. Admin map pin/address entry is the first feature to build — everything else blocks on it.
- **Shopping mode state is the central context object:** Banner, layout selection, and check-off behavior all read from "are we in shopping mode, and which store?" — this single state object gates everything else.
- **Home location is independent of store proximity:** The two proximity checks (near store, near home) are separate. Home detection is simpler — a single fixed point set once in user settings.
- **Check-off behavior modification touches existing shopping history logic:** This is the highest-risk dependency — existing history write code must be conditioned on shopping mode context without breaking the offline replay behavior validated in Phase 21. The conditional must be additive, not a rewrite.
- **Manual store selection must exist before auto-detection:** Auto-detection is an enhancement on top of manual selection. Manual selection is the fallback that makes the feature usable even when GPS fails or is denied.

---

## MVP Definition

### Launch With (v2.2 milestone scope)

- [ ] Admin: save store location via map pin placement or address entry (creates lat/lng on store record)
- [ ] User settings: set home location once (fixed point for home-proximity detection)
- [ ] Proximity polling: watchPosition while app is in foreground; check distance against saved stores at 100m radius
- [ ] Shopping mode activation: auto on store proximity match OR manual store selection from list
- [ ] Branded store banner: color and name of detected chain displayed while in shopping mode
- [ ] Store layout auto-selected when shopping mode activates (wire into existing layout selection)
- [ ] Check-off behavior: near store writes shopping history; near home treats check-off as deletion (suppresses history)
- [ ] Dismiss shopping mode: explicit exit control on banner

### Add After Validation (post v2.2)

- [ ] Refined radius tuning per store (some stores are in malls or dense areas — 100m may need adjustment) — trigger: user reports of wrong-store detection
- [ ] Store location verification UI in admin (show current GPS on map to compare to saved pin) — trigger: admin frustration with placement accuracy
- [ ] "You just left the store" exit prompt (offer to clear checked items) — trigger: user feedback on post-shop cleanup friction

### Future Consideration (v3+)

- [ ] Push notification on store arrival — requires resolving PWA notification limitations and background geofencing gap; defer until native-like push is viable
- [ ] Indoor navigation or aisle hints — requires store partnerships or BLE infrastructure; out of scope for family grocery PWA
- [ ] Price comparison routing to cheapest store — already declared out of scope in PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Store lat/lng in admin | HIGH — gates everything else | LOW | P1 |
| Home location setting | HIGH — history accuracy depends on it | LOW | P1 |
| Proximity polling and mode activation | HIGH — the core UX | MEDIUM | P1 |
| Branded store banner | HIGH — immediate orientation feedback | LOW | P1 |
| Store layout auto-selection | HIGH — core HandleAppen value | LOW (wires existing logic) | P1 |
| History-aware check-off (store vs. home) | HIGH — history accuracy | MEDIUM (touches existing offline replay logic) | P1 |
| Manual store selection fallback | HIGH — GPS fails indoors | LOW | P1 |
| Dismiss / exit shopping mode | MEDIUM — usability guard | LOW | P1 |
| Radius tuning per store | MEDIUM — accuracy edge cases | LOW | P2 |
| Post-shop cleanup prompt | LOW — convenience | LOW | P2 |
| Push notification on arrival | MEDIUM — convenience | HIGH (PWA limitation blocker) | P3 |

**Priority key:**
- P1: Must have for v2.2 launch — these ARE the milestone scope
- P2: Add after validation if user feedback surfaces the need
- P3: Future milestone — blocked by platform constraints or prior scope decisions

---

## Competitor Feature Analysis

| Feature | AnyList | Bring! | OurGroceries | HandleAppen v2.2 |
|---------|---------|--------|--------------|------------------|
| Location-based list reminders | Yes (manual store assignment, location reminder) | Not documented | No | Auto-detect from saved stores — no manual assignment needed |
| Auto store detection on arrival | No — manual store assignment only | No | No | Yes — 100m geofence while app is open |
| Branded in-store UI | No | Colorful UI but not store-branded | No | Yes — chain-specific colors and name |
| Layout sorted by store | No | No | No | Yes — existing core feature, auto-selected in shopping mode |
| Check-off behavior differs by location | No | No | No | Yes — store check-off writes history; home check-off is deletion |
| Home location setting | No | No | No | Yes |
| Background detection | No (native reminder only) | No | No | No — accepted PWA limitation |

HandleAppen's combination of auto-detection, store-specific layout, and history-accurate check-off behavior is unique among family grocery apps at this feature tier. No documented competitor has all three.

---

## Sources

- Competitor analysis: [AnyList features](https://www.anylist.com/features), [SmartCart comparison of Listonic/Bring/AnyList/OurGroceries](https://smartcartfamily.com/en/blog/grocery-apps-comparison), [NerdWallet best grocery list apps 2026](https://nerdwallet.com/finance/learn/best-grocery-list-apps)
- Geofencing accuracy and radius guidance: [Radar — how accurate is geofencing](https://radar.com/blog/how-accurate-is-geofencing), [Android geofencing developer guide](https://developer.android.com/develop/sensors-and-location/location/geofencing), [GeoPlugin accuracy practices](https://www.geoplugin.com/resources/geofencing-accuracy-best-practices-for-improvements/)
- In-store UX patterns: [Radar geofencing for grocery](https://radar.com/blog/geofencing-for-grocery), [PlotProjects geofencing for supermarkets](https://www.plotprojects.com/blog/10-geofencing-strategies-for-supermarkets-grocery-chains/)
- PWA geolocation limitations: [PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [PWAs on iOS 2025 real capabilities](https://ravi6997.medium.com/pwas-on-ios-in-2025-why-your-web-app-might-beat-native-0b1c35acf845), [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation)
- Battery and accuracy tradeoffs: [PWA geolocation integration guide](https://simicart.com/blog/pwa-geolocation/), [Geolocation API complete guide](https://digitalthriveai.com/en-nz/resources/docs/web-development/geolocation/)
- Norwegian grocery context: [Norwegian supermarkets guide](https://www.lifeinnorway.net/supermarkets-in-norway/), [NorgesGruppen market share](https://nlsnorwayrelocation.no/a-guide-to-norwegian-supermarkets-rema-1000-kiwi-and-meny-explained/)

---
*Feature research for: location-aware shopping mode (HandleAppen v2.2)*
*Researched: 2026-03-28*
