# Feature Research

**Domain:** Family grocery shopping PWA (Norwegian market)
**Researched:** 2026-03-08
**Confidence:** MEDIUM-HIGH (core features HIGH; Norwegian-specific integrations MEDIUM)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time list sync across devices | Every competitor (OurGroceries, AnyList, Bring) offers this; users share lists while one person is already in the store | MEDIUM | Supabase Realtime handles this; core challenge is conflict resolution when two users edit simultaneously. Timestamp-based merge is standard. |
| Add items by typing | Most basic list interaction; any app missing this is broken | LOW | Autocomplete from item history is expected too — OurGroceries surfaces every item ever entered |
| Check off items while shopping | The act of shopping; users tap to strike through items | LOW | Checked state must sync in near-real-time — this is the moment another family member sees progress |
| Multiple named lists | Families organize by store, occasion, or week; a single list is too rigid | LOW | e.g., "Kiwi mandag", "Spar helg", "Fest lørdag" |
| Household / family sharing | Core use case — one list, multiple shoppers | MEDIUM | OurGroceries uses shared account email; AnyList uses invite links; individual accounts under a shared household is the right model for history-per-person |
| Item grouping by category | Users expect items to be grouped, not a flat dump — all major apps do this | LOW | Categories: produce, dairy, meat, bakery, frozen, dry goods, beverages, household, personal care |
| Barcode scanning to add items | OurGroceries (17M product DB), AnyList, and Bring all support this — users expect it for packaged goods | MEDIUM | Kassal.app API covers ~100,000 Norwegian products via EAN; Open Food Facts as fallback. Camera access required in PWA (works on mobile Chrome/Safari). |
| Offline / poor-connectivity support | Grocery stores often have weak signal — app must work in the aisle | HIGH | Service worker + IndexedDB for optimistic local mutations; sync on reconnect. This is the hardest table-stakes item technically. |
| Item history / quick re-add | OurGroceries remembers every item ever entered; users re-buy the same ~70% of items weekly | LOW | Surface history as autocomplete suggestions when typing; also used for recommendations |
| Norwegian product names | App is for Norwegian families; UI language and product names must be Norwegian | LOW | Kassal.app returns Norwegian product names natively; UI strings in Norwegian (bokmål primary) |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Store-layout-aware category ordering | The core value of HandleAppen — you shop in aisle order, never backtrack. No major competitor does this automatically for Norwegian stores. | MEDIUM | One default ordering (produce → dairy → meat → bakery → frozen → dry goods → beverages → household) tuned to common Norwegian store layouts (Rema 1000, Kiwi, Meny, Spar all share similar flow). Per-store overrides via drag-and-drop reordering. Any family member can edit. |
| Per-store layout overrides | Rema 1000 differs from Meny in layout; power users want precision per store | MEDIUM | The default layout reduces setup friction. Override is optional but unlocks precision. Stored per named list or per store entity. |
| History-based recommendations | ~70% of grocery items are repetitive; surfacing "you usually buy X on Mondays" reduces cognitive load | HIGH | Requires purchase history log (items checked off = purchased). Co-purchase suggestions (items bought together) add value. Supabase edge function for aggregation logic. This is a long-term differentiator — gets better over time. |
| Individual accounts + shared household | Users get personal history and personal recommendations while sharing lists — better than pure shared-account models (OurGroceries) | MEDIUM | Who added what, who checked it off — richer data for recommendations. AnyList and OurGroceries use simpler shared-account approaches. |
| Kassal.app barcode data (Norwegian-first) | Norwegian product names, prices, allergen data, nutritional info — not available in international databases like Open Food Facts for many local products | LOW (integration) | 100,000 Norwegian products. EAN lookup returns product name, brand, category, ingredients, nutritional data. Free tier: 60 req/min. |
| PWA installability (no app store) | Families can install from browser link without Play Store / App Store friction — important for less tech-savvy family members | LOW (PWA manifest) | Requires HTTPS, web app manifest, service worker. Works on Android Chrome fully; iOS Safari has some PWA limitations (no push notifications in older iOS). |
| Clean Norwegian UI (no ads, no monetization clutter) | Bring runs sponsored product ads from Nestlé/Unilever; Listonic is ad-supported; users are frustrated. A clean, private-first app for family use is a real differentiator. | LOW | No third-party data sharing, no sponsored placements |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Price comparison across stores | Users want cheapest option; Kassal.app has price data | Requires tracking real-time prices per store per product — data is stale quickly, Kassal.app data lags. Becomes the entire product focus at expense of list UX. Mattilbud and Kassal.app already do this better. | Out of scope for v1. If needed, deep-link to Kassal.app for price lookup on a specific product. |
| Meal planning integration | Recipe-driven lists are popular (AnyList's main differentiator) | Different use case, different UX, significant scope expansion. Splits focus between two product identities. | Defer to v2+. The purchase history + recommendations approach satisfies "what did we eat last week?" without full meal planning. |
| Push notifications for list changes | "Notify me when someone adds to the list" is frequently requested | iOS PWA push notification support is unreliable pre-iOS 16.4 and still buggy. Adds backend complexity (web-push service). Real-time sync already surfaces changes immediately when the app is open. | Show an in-app indicator when new items were added since last view. Defer push notifications to v2 after PWA push support matures. |
| Native mobile app (iOS / Android) | Better performance, push notifications, deeper OS integration | Doubles development and maintenance burden. PWA covers the core mobile use case adequately. Separate codebases diverge over time. | PWA installable on home screen. Revisit if PWA limitations become blockers. |
| Receipt scanning / OCR | "Scan receipt to log what you bought" — automatic history | OCR accuracy on Norwegian grocery receipts is poor; receipt formats vary per chain; maintenance burden for parsing rules is high | Manual check-off during shopping is the correct logging mechanism — it captures intent, not receipt |
| Budget tracking / spending stats | Most-requested missing feature across OurGroceries, AnyList, Bring | Requires price data per item per store at time of purchase — either manual entry (friction) or price API integration (complexity + staleness). Scope creep that dilutes shopping list focus. | Surface Kassal.app price on barcode scan (read-only, no tracking). Defer budget tracking to v2+ if validated. |
| Social / community features (sharing with neighbors, public lists) | Some apps experiment with community bulk-buying | Wrong audience for family grocery tool; privacy concerns; moderation overhead | Keep scope firmly on private household use |
| AI-powered image recognition for adding items | "Take photo of fridge, AI adds what's missing" | Accuracy is low for fresh/unpackaged produce (escarole vs frisée problem); creates wrong expectations; UX for reviewing AI output adds friction | Barcode scan for packaged goods + text search for produce. Clear beats clever here. |

---

## Feature Dependencies

```
[Household / family sharing]
    └──requires──> [Individual user accounts]
                       └──requires──> [Auth system (Supabase Auth)]

[Store-layout-aware category ordering]
    └──requires──> [Item grouping by category]
                       └──requires──> [Category data model]

[Per-store layout overrides]
    └──requires──> [Store-layout-aware category ordering]
    └──requires──> [Named lists (per store)]

[History-based recommendations]
    └──requires──> [Item history / purchase log]
                       └──requires──> [Check-off action logged to DB]
                       └──requires──> [Individual accounts] (for per-user history)

[Barcode scanning]
    └──requires──> [Kassal.app API integration]
    └──enhances──> [Item history] (product identified = richer history entry)

[Offline support]
    └──requires──> [Service worker]
    └──requires──> [IndexedDB local cache]
    └──enhances──> [Real-time sync] (sync-on-reconnect pattern)

[Real-time sync]
    └──requires──> [Supabase Realtime subscriptions]
    └──requires──> [Auth system] (authenticated channels)

[Co-purchase recommendations]
    └──requires──> [Item history / purchase log]
    └──requires──> [Multiple shopping sessions] (cold-start problem — useless for new users)
```

### Dependency Notes

- **Store-layout ordering requires categories:** You cannot sort by store layout without a category system. Categories must be built before layout ordering.
- **Recommendations require history:** The recommendations section (bottom nav) has a cold-start problem for new users. It should show history-based "you bought these recently" before co-purchase logic kicks in. Usable from day one, gets better over time.
- **Offline support enhances real-time sync:** These are not alternatives — offline-first means optimistic local mutations that sync when reconnected. Both are needed simultaneously.
- **Individual accounts required for per-user history:** If history is attached to household only (OurGroceries model), you lose the ability to surface "you personally buy X" vs "household buys X". Individual accounts are a prerequisite for high-quality recommendations.
- **Barcode scan enhances history quality:** A text-typed "melk" vs a barcode-scanned "Q-Meieriene Lettmelk 1L" are different history entries. Barcode scanning makes history richer and recommendations more specific.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Individual accounts + household joining — users need identity to share lists
- [ ] Multiple named shopping lists — the container for everything else
- [ ] Add items by typing with autocomplete from history — primary input method
- [ ] Item grouping by category with default Norwegian store layout order — the core differentiator; must ship in v1 or product is generic
- [ ] Real-time sync across household members — table stakes; without this it is just a notes app
- [ ] Check off items while shopping — core shopping interaction
- [ ] Barcode scanning via Kassal.app + Open Food Facts fallback — differentiates from plain text lists; solves packaged goods naming
- [ ] Offline support (read list, check items, add items when offline; sync on reconnect) — required for grocery store use where signal is unreliable
- [ ] Purchase history log (items checked off → logged) — feeds recommendations; must start logging from day one to build history
- [ ] Norwegian UI (bokmål) — language must match market

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Per-store layout overrides — add when users report their store differs from default; build drag-and-drop category reordering
- [ ] History-based recommendations section (bottom nav) — add once sufficient purchase history exists in production; minimum ~4-6 weeks of real data
- [ ] Co-purchase suggestions — layer on top of recommendations once history is established
- [ ] Nutritional / allergen data display on barcode scan — Kassal.app provides this; surface it after scan UX is stable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Push notifications for list changes — defer until iOS PWA push support is reliable; prioritize in-app notifications first
- [ ] Meal planning integration — separate product concern; only if user demand is validated
- [ ] Price tracking / budget features — requires sustained price data investment; validate demand first
- [ ] Native iOS / Android app — only if PWA limitations (push, background sync) become user-reported blockers at scale

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Real-time sync | HIGH | MEDIUM | P1 |
| Add items by typing | HIGH | LOW | P1 |
| Check off items | HIGH | LOW | P1 |
| Multiple named lists | HIGH | LOW | P1 |
| Household / family sharing | HIGH | MEDIUM | P1 |
| Item grouping by category | HIGH | LOW | P1 |
| Store-layout category ordering | HIGH | LOW-MEDIUM | P1 |
| Offline support | HIGH | HIGH | P1 |
| Norwegian UI (bokmål) | HIGH | LOW | P1 |
| Barcode scanning (Kassal.app) | MEDIUM-HIGH | MEDIUM | P1 |
| Purchase history log | HIGH | LOW | P1 (foundation for P2 features) |
| Per-store layout overrides | MEDIUM | MEDIUM | P2 |
| History-based recommendations | MEDIUM | HIGH | P2 |
| Co-purchase suggestions | MEDIUM | HIGH | P2 |
| Nutritional data on barcode scan | LOW | LOW | P2 |
| Push notifications | LOW | HIGH | P3 |
| Meal planning | MEDIUM | HIGH | P3 |
| Budget / price tracking | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | OurGroceries | AnyList | Bring | HandleAppen (planned) |
|---------|--------------|---------|-------|----------------------|
| Real-time sync | Yes (free) | Yes (free tier) | Yes | Yes (Supabase Realtime) |
| Household sharing | Yes (shared account) | Yes (invite) | Yes | Yes (individual accounts + household) |
| Barcode scanning | Yes (17M products, international) | Yes | No | Yes (Kassal.app Norwegian-first + OFF fallback) |
| Category grouping | Yes | Yes | Yes | Yes |
| Store layout ordering | No (alpha or custom drag only) | Manual drag | Manual drag | Yes (default + per-store override) |
| Offline support | Partial | Partial | Partial | Yes (service worker + IndexedDB) |
| Purchase history | Basic (item name recall) | Basic | No | Yes (full log → recommendations) |
| Recommendations | No | No | Basic (trending) | Yes (history-based + co-purchase) |
| Norwegian product data | No (international DB) | No | No | Yes (Kassal.app) |
| No ads | No ($6/yr to remove) | Yes (paid) | No (sponsored placements) | Yes |
| PWA / installable | Yes (web app) | Yes (web premium) | No (native only) | Yes (PWA-first) |
| Meal planning | No | Yes (core feature) | No | No (out of scope) |
| Norwegian market focus | No | No | Partial (European) | Yes |

---

## Norwegian Market Specifics

### Store Chains and Layout

The major Norwegian grocery chains — Rema 1000, Kiwi, Meny, Spar, Coop (Prix/Extra/Mega/Obs) — share a broadly similar store layout pattern despite being different chains:

**Common Norwegian store category flow (confidence: MEDIUM — inferred from store descriptions; exact order varies by location):**

1. Produce (frukt og grønt)
2. Bakery (bakeri / brød)
3. Deli / cold cuts / cheese (delikatesse / pålegg / ost)
4. Meat and fish (kjøtt og fisk)
5. Dairy (meieri — melk, yoghurt, smør, egg)
6. Frozen (frysedisk)
7. Dry goods / pantry (tørrvarer — pasta, ris, hermetikk, mel)
8. Beverages (drikke — juice, brus, vann)
9. Snacks / confectionery (snacks / godteri)
10. Household and cleaning (husholdning / rengjøring)
11. Personal care (personlig pleie)

This default ordering is the reasonable starting point. Per-store overrides handle deviations (Meny premium stores differ more; larger Coop Obs stores have different flows).

### Norwegian-Specific Features

- **Kassal.app API:** 100,000 Norwegian products, EAN barcode lookup, Norwegian product names, price history, allergens, nutritional data. Free tier: 60 req/min. No bulk EAN limitation beyond 100 per request. This is the right primary source — no equivalent international API covers Norwegian products well.
- **Open Food Facts fallback:** International DB covers imported products that Kassal.app may miss. Important for non-Norwegian brands.
- **Loyalty card apps (Æ / Rema 1000, Kiwi app, Trumf / NorgesGruppen):** These are separate chain-owned apps. HandleAppen does NOT integrate with them — they require store partnerships. Users manage these separately. Anti-feature for v1.
- **Mattilbud app:** Norwegian deal aggregator across all chains. Separate concern — do not replicate. Could deep-link if needed.
- **Language:** Norwegian bokmål (bokmål) as primary UI language. English fallback acceptable for dev but Norwegian is the shipped experience.

---

## Sources

- OurGroceries User Guide: https://www.ourgroceries.com/user-guide
- SmartCart Family comparison (Listonic, Bring, AnyList, OurGroceries): https://smartcartfamily.com/en/blog/grocery-apps-comparison
- Bring collaborative features: https://www.getbring.com/en/features/collaborative
- Kassal.app API documentation: https://kassal.app/api
- NerdWallet grocery app comparison 2025: https://www.nerdwallet.com/finance/learn/best-grocery-list-apps
- Scandit barcode scanning UX guide: https://www.scandit.com/resources/guides/barcode-scanning-challenges/
- Norwegian supermarkets overview: https://www.lifeinnorway.net/supermarkets-in-norway/
- NLS Norway: Rema 1000, Kiwi, Meny guide: https://nlsnorwayrelocation.no/a-guide-to-norwegian-supermarkets-rema-1000-kiwi-and-meny-explained/
- PWA offline sync patterns: https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/
- Grocery app trends 2026: https://www.elitemcommerce.com/blog/2025/09/12/building-the-ultimate-grocery-app-trends-to-watch-in-2026/

---
*Feature research for: Family grocery shopping PWA (Norwegian market)*
*Researched: 2026-03-08*
