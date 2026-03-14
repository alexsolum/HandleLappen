# Feature Research

**Domain:** Family grocery shopping PWA (Norwegian market)
**Researched:** 2026-03-08 (v1.0); updated 2026-03-13 (v1.2 additions); updated 2026-03-14 (v2.0 barcode improvement)
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

## v1.2 Feature Analysis: New Features Being Added

This section covers only the NEW features in v1.2. All v1.0/v1.1 features are already built.

### 1. Recipe Management Linked to Shopping Lists

**What users expect (table stakes for recipe features):**

OurGroceries, AnyList, and Plan to Eat have established the baseline expectation for recipe-to-list integration. Users who encounter a recipe tab expect:

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Recipe list view with cover images | Every recipe app from Allrecipes to AnyList shows a visual grid/list with food photography; text-only recipes feel like a database, not an app | LOW-MEDIUM | Cover image should be optional but visually dominant when present; fallback to a category icon or gradient when no image. |
| Recipe detail view with full ingredient list | After tapping a recipe, users expect to see all ingredients and the recipe source/notes | LOW | Ingredient names must link to the household item system — "Egg" in a recipe = the same "Egg" item already in the household. |
| "Add all to list" with list chooser | OurGroceries: single button below recipe adds all ingredients to their respective lists. AnyList: same. This is the primary purpose of the feature — reducing manual item entry | LOW | Must let user choose which shopping list. If household has one list, skip the chooser and add directly. |
| Individual ingredient selection | OurGroceries lets users tap individual ingredients to add only what they need to buy (skipping pantry items). AnyList does the same. This is expected because users already have some ingredients at home. | LOW | A checkbox or tap-to-select UI on each ingredient line. Selected items add to list; deselected skip. Ideally remembers which list each ingredient maps to. |
| Household-shared recipes | Since lists are shared per household, recipes must also be shared — one family member adds a recipe, all members see it | LOW | Recipes belong to household, not individual user. Any member can add/edit/delete. |

**Differentiators (what makes this implementation better than the baseline):**

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Ingredient linked to household item system | When a recipe ingredient is added to a list, it becomes the same item entity that has purchase history, category, custom picture, etc. — not a new anonymous text string. This is rare: OurGroceries and AnyList create new list items without linking to the item "memory." | MEDIUM | Requires ingredient resolution: "2 eggs" → household item "Egg". Matching by name on household items table. If no match, create new household item. |
| "Add all" respects existing list structure | Items added from a recipe are sorted into the correct category position — the list doesn't require resorting after adding recipe ingredients | LOW | Leverage the existing category sort system; items inserted at correct position automatically |
| Reuse as template | Recipes can function as reusable shopping templates (e.g., "Pizza Night" = always buy these 8 items). This is a pattern OurGroceries documents explicitly, worth supporting without extra effort since the data model already accommodates it. | NONE (emergent) | No additional code needed — this is a natural use pattern, just document it in the UI with a subtle hint |

**Anti-features to avoid:**

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Recipe import from URL / web scraping | High complexity, fragile parsers, recipe sites block scrapers, legal grey area. AnyList charges for this as a premium feature. | Manual recipe entry only for v1.2. User types or pastes ingredients. |
| Recipe scaling (2x, 0.5x servings) | Sounds easy, not easy — unit conversion (grams vs cups), rounding, fractional quantities add UI and logic complexity | Let users note the serving count in the recipe description; manual adjustment |
| Nutrition totals per recipe | Requires linking every ingredient to nutritional data from Kassal.app + quantity parsing — significant complexity | Out of scope; the app is a shopping tool not a nutrition tracker |
| Meal calendar / week planner | Separate product entirely, different UX paradigm | The recipe tab IS the meal planning touchpoint — cook what you like, add ingredients when needed. No calendar needed for v1.2. |
| AI recipe suggestions | High complexity, requires LLM integration, cost, latency | Recommendations tab already surfaces frequently bought items; that is the algorithmic layer |

**Expected interaction flow (HIGH confidence — matches OurGroceries + AnyList observed behavior):**

1. User opens Oppskrifter tab
2. Sees grid/list of household recipes with cover images
3. Taps a recipe → detail view shows ingredients and notes
4. User taps individual ingredients to select which to buy, OR taps "Legg til i liste"
5. If multiple lists exist: a bottom sheet or modal asks which list
6. Selected ingredients are added to the chosen list, in correct category order
7. User is returned to recipe detail (or optionally navigated to the list)

---

### 2. Admin Hub with Subpages

**What users expect:**

An "Admin" or "Settings" area that consolidates management functions is standard in family/household apps. The hub-and-spoke pattern (one overview page with nav to subpages) is the expected structure for mobile.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single entry point for management tasks | Users expect all settings and management in one place — scatter them across the app and users can't find them | LOW | Admin as a bottom nav tab makes it permanently accessible. Hub page = list of tappable sections. |
| Store management subpage (Butikker) | Already exists in v1.0 — users expect to add/edit/delete their stores and configure layouts | LOW | Moved to Admin hub; existing functionality preserved |
| Household management subpage (Husstand) | Managing members, invites, household name — standard in any family sharing app | LOW | Existing v1.0 feature relocated to Admin hub |
| History subpage (Historikk) | Users expect to see their shopping history. Already exists but was separate. | LOW | Relocated to Admin hub |
| Items management subpage | Users want to edit household items: rename, change category, add picture. This is new in v1.2. | MEDIUM | New functionality: a table/list of all household items with edit capability |
| User settings subpage (Brukerinnstillinger) | Dark mode and other preferences belong in a per-user settings page | LOW | New in v1.2; dark mode is the first preference |

**Admin hub UX pattern (MEDIUM confidence — based on Material Design + observed patterns in family apps):**

The hub page itself should be a sectioned list of tappable rows, each leading to a subpage. This is the iOS Settings / Android Settings paradigm and is universally understood. On mobile:
- Each row: icon + label + chevron
- Grouped by logical section (Store settings, Household settings, Account settings)
- No nested more than 2 levels deep (hub → subpage; no sub-subpages)

**Differentiators:**

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Consolidated management = less navigation confusion | Current v1.x likely scatters admin functions; consolidating removes "where is that setting?" friction for non-power users | LOW | The value is organizational, not technical |

**Anti-features:**

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Role-based admin (only household owner can edit) | Overengineered for a family app; adds friction | Any household member can manage. Trust within a family is assumed. |
| Analytics / usage dashboards in admin | Admin feels like a business SaaS if it shows charts | Keep admin purely management-focused; data exploration belongs in Historikk subpage |

---

### 3. Item Picture Management (Inventory View)

**What users expect:**

Bring!, AnyList, Listonic, and Pantry Check all support adding photos to items. The expectation is set: users want to attach a photo to reduce confusion at the store ("which brand of olive oil was it?").

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| View all household items in a list/grid | A management view for every item the household has used — needed to find items to edit | LOW | Sortable by name or category. Searchable. |
| Edit item name and category | Basic data correction — users misspell items or barcode scan assigns the wrong category | LOW | Inline edit or edit sheet. Category should be a dropdown of defined categories. |
| Attach a photo to any item | Reduces store confusion for ambiguous items (produce, specific brands) — AnyList, Bring, Listonic all support this | MEDIUM | Camera capture or gallery pick via HTML `<input type="file" accept="image/*" capture="environment">`. Image stored in Supabase Storage. |
| See item picture in shopping list | The photo attached to an item should appear on the list as a small thumbnail — otherwise why attach it? | LOW | Thumbnail next to item name in list view. Tap to enlarge. |

**Differentiators:**

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Photo persists across all lists | The item picture is attached to the household item entity, not to a specific list entry — so if "Kefir" has a photo, it shows that photo every time it appears on any list | LOW (architecture consequence) | This is correct behavior if items are a shared entity (which they already are in the existing system). Zero extra effort if data model is already item-centric. |
| Supabase Storage for images | Household-shared, authenticated, CDN-delivered — correct for multi-user PWA | MEDIUM | Use a public bucket with path-based access control (household_id/item_id/photo.jpg). Images should be resized before upload (client-side canvas resize to max 800px) to keep storage costs low and load times fast. |

**Anti-features:**

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Multiple photos per item | Inventory management apps do this; grocery list apps don't need it | One cover photo per item. Replace on re-upload. |
| AI product identification from photo | Accuracy unreliable, adds latency and cost | Manual photo attachment is the right UX — user controls what photo represents the item |
| Barcode-lookup auto-photo | Kassal.app may have product images, but they are not guaranteed and legal/licensing for reuse is unclear | User-uploaded photos only; barcode scan populates name/category, not photo |

**Image upload technical considerations (MEDIUM confidence — based on Supabase Storage docs + standard PWA patterns):**

- HTML `<input type="file" accept="image/*" capture="environment">` works on both iOS Safari and Android Chrome PWA — no special camera API needed
- Client-side resize before upload: canvas-based resize to max 800x800px, JPEG quality 0.8 — keeps uploads under 200KB typically
- Supabase Storage: organize as `{household_id}/{item_id}.jpg` — simple, one file per item, replacing on re-upload
- Display: use Supabase Storage public URL or signed URL depending on bucket policy. Public bucket is simpler and appropriate for household-shared images.
- Fallback: items without a photo show category icon or colored placeholder — never a broken image

---

### 4. User Settings with Dark Mode

**What users expect:**

Dark mode has been a baseline expectation since iOS 13 (2019) and Android 10 (2019). Any app without it feels dated. For a PWA used in the evening (meal planning, list prep), dark mode is especially relevant.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dark mode toggle | Users have come to expect every app to honor their OS dark mode preference, and provide a manual override | LOW | Toggle in user settings. Three states: System / Light / Dark. |
| Preference persisted across sessions | A preference that resets on reload is broken — users set it once and expect it to stick | LOW | Store in localStorage. Optionally sync to Supabase user_preferences table for cross-device persistence. |
| System preference respected by default | On first open, if OS is in dark mode, app should be dark — surprising the user with a white flash is poor UX | LOW | Read `prefers-color-scheme` on first load; store explicit preference only when user overrides. |
| No flash of wrong theme on load | The white flash before dark mode kicks in is a known PWA/SPA problem | LOW-MEDIUM | Apply theme class in `app.html` `<head>` via inline script before page renders; read from localStorage synchronously. This is the standard SvelteKit dark mode pattern. |

**Differentiators:**

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-user dark mode (synced to Supabase) | If a user logs in on a new device, their dark mode preference follows them — better than localStorage-only | LOW | Store preference in user_preferences table (user_id, key, value). Read on login, fall back to localStorage/system if not set. |

**Anti-features:**

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| PWA manifest theme_color dynamic update | Manifest is static JSON — cannot change theme_color based on user preference without a service worker trick that is fragile and poorly supported | Accept that the browser chrome color from manifest stays fixed. Dark mode applies to app content only; browser chrome color is a minor issue. |
| Custom theme colors / accent colors | Nice for customization apps, scope creep for a grocery tool | Dark / Light / System only for v1.2. Extend later if users request it. |
| Separate theme per household | No precedent in grocery apps; privacy preferences are per user | User-level setting only |

**SvelteKit implementation pattern (HIGH confidence — multiple verified sources):**

1. In `app.html`, add an inline `<script>` in `<head>` that reads localStorage `theme` key and sets `class="dark"` on `<html>` before any content renders — eliminates FOUC
2. In SvelteKit, use a Svelte store for current theme, writable and reactive
3. Toggle updates: store → localStorage → `document.documentElement.classList`
4. Tailwind dark mode variant: `darkMode: 'class'` in tailwind.config — then `dark:bg-gray-900` etc. works automatically
5. The `svelte-themes` library handles this in ~2 lines if the project wants to avoid hand-rolling it
6. CSS variables approach is the alternative: define `--color-background`, `--color-text` etc. and swap them under `.dark` class — more flexible for future theme expansion

---

## v1.2 Feature Dependencies

```
[Recipe management]
    └──requires──> [Household item system] (ingredients must map to household items)
    └──requires──> [Shopping lists] (already built)
    └──enhances──> [Shopping list UX] (auto-adds items in correct category order)

[Recipe cover image]
    └──requires──> [Supabase Storage] (may be new; check if storage already configured)

[Admin hub]
    └──requires──> [Routing restructure] (new /admin route, subpage routes)
    └──aggregates──> [Butikker, Husstand, Historikk] (existing pages become subpages)
    └──contains──> [Items management] (new subpage)
    └──contains──> [Brukerinnstillinger] (new subpage)

[Item picture management]
    └──requires──> [Supabase Storage] (file upload + CDN delivery)
    └──requires──> [Items management subpage] (the UI to edit items lives in Admin → Items)
    └──enhances──> [Shopping list view] (item photo thumbnail appears in list)
    └──enhances──> [Recipe ingredients] (ingredient photo shown in recipe detail)

[Dark mode toggle]
    └──requires──> [Brukerinnstillinger subpage] (the UI lives here)
    └──requires──> [Tailwind dark: variant or CSS variables] (already configured or low-effort addition)
    └──optionally──> [user_preferences table in Supabase] (for cross-device sync)

[Bottom nav restructure (4 tabs)]
    └──requires──> [Oppskrifter route] (new)
    └──requires──> [Admin route] (new)
    └──moves──> [Anbefalinger] (was separate, now tab 3)
    └──removes──> [current nav items] (Historikk, Butikker no longer top-level)
```

### v1.2 Dependency Notes

- **Recipe ingredients require household item linkage:** The most non-trivial dependency in v1.2. When a recipe ingredient is saved, it must resolve to (or create) a household item — not just a text string. This ensures category sorting works correctly when added to list, and item photos carry over. Build the item resolution logic before building the recipe ingredient add-to-list flow.
- **Item pictures require Supabase Storage:** If Storage is not yet configured in the project, this is a first-time setup step (create bucket, set policies). Likely a single configuration step, but should not be assumed already done.
- **Admin hub requires route restructure:** Butikker, Husstand, and Historikk currently live somewhere in the nav. Moving them under /admin means their routes change. Deep links (if any) break. Internal nav references need updating. The restructure should be done as one task before building any new Admin subpages.
- **Dark mode requires Tailwind dark: class variant:** If `darkMode: 'class'` is not already set in tailwind.config, that's a one-line change. If the app uses CSS custom properties instead, the pattern changes. Verify existing Tailwind config before assuming either approach.
- **Bottom nav restructure is the first task:** All four new tabs (Handleliste, Oppskrifter, Anbefalinger, Admin) gate everything else. Navigation must exist before building the pages behind it.

---

## v1.2 Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bottom nav 4-tab restructure | HIGH | LOW | P1 — gates everything |
| Admin hub (hub page + routing) | HIGH | LOW | P1 — gates Admin subpages |
| Recipe list + detail view | HIGH | MEDIUM | P1 — core new feature |
| Recipe "add all to list" | HIGH | LOW | P1 — primary recipe value |
| Individual ingredient selection | MEDIUM | LOW | P1 — expected by users who have pantry items |
| Recipe cover image | MEDIUM | MEDIUM | P1 — visual identity of recipes; no image = feels unfinished |
| Items management subpage | MEDIUM | LOW | P1 — needed for picture management |
| Item picture attach/display | MEDIUM | MEDIUM | P2 — differentiator, but items are usable without photos |
| Dark mode toggle | MEDIUM | LOW | P1 — user expectation; low cost |
| Dark mode cross-device sync | LOW | LOW | P2 — nice to have after localStorage version works |
| Recipe ingredient → item linkage | HIGH (for list quality) | MEDIUM | P1 — without this, added items lose category/sort fidelity |
| Butikker/Husstand/Historikk as subpages | LOW (relocation, not new) | LOW | P1 — part of nav restructure |
| User settings subpage | LOW | LOW | P1 — container for dark mode |

---

## v2.0 Feature Analysis: Barcode Scanner Improvement and Product Lookup

This section covers only the NEW features in v2.0. All v1.x features are already built and in production.

### What Is Already Built (Do Not Rebuild)

- Camera-based EAN barcode scanning via `html5-qrcode` with WASM polyfill
- Supabase edge function (`barcode-lookup`) proxying Kassal.app and Open Food Facts
- Gemini AI normalization of product name and canonical category
- `barcode_product_cache` table with 30-day TTL
- `BarcodeSheetModel` with `ean`, `itemName`, `quantity`, `categoryId`, `canonicalCategory`, `confidence`, `source`
- `BarcodeLookupSheet` (confirm dialog) and `BarcodeScannerSheet` (camera view dialog)
- `KassalProduct` type already defines `image` and `brand` fields — fetched but not surfaced
- `ReducedProviderPayload` already captures `brand` from both Kassal and Open Food Facts

**Key gap:** `image` and `brand` from Kassal.app are fetched and stored in `provider_payload` (JSONB column), but are not extracted into dedicated columns, not propagated through `BarcodeLookupDto`, and not shown anywhere in the UI.

---

### v2.0 Table Stakes

Features that users expect once the app has barcode scanning. Missing these makes the scanner feel broken for iOS users and the scan result feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Camera opens reliably on iOS (black screen fix) | iOS Safari's PWA standalone mode has a well-documented `getUserMedia` bug that causes the camera to open but show only black video, or silently fail. Users expect the scanner to work on their phone. | HIGH | Root cause: WebKit bug 252465. Current code sets `playsinline` and `muted` post-start, but does not handle first-play-failure or stream re-acquisition. Needs silent retry on failure + fallback messaging. |
| Scan feedback at moment of detection | Users must know instantly when a barcode was read. Currently: no feedback between decode and sheet appearing. | LOW | `navigator.vibrate(100)` on Android; brief visual flash on the scanner view. Vibration is silently ignored on iOS where the API is restricted. |
| Graceful permission-denied flow | iOS re-prompts for camera every PWA session. Users hit a dead end if the error message is unclear. | LOW | Already implemented; needs improved Norwegian message explaining Settings > Safari > Camera specifically. |
| Product name pre-filled and editable | User sees a name in the confirm sheet, not a blank field requiring manual entry. | LOW | Already implemented. Risk: Gemini over-normalizes (e.g., "Pepsi Max 1,5L" → "Cola"). Prompt tuning is the fix. |
| Category auto-selected on scan | Item lands in the correct aisle grouping automatically. | MEDIUM | Already implemented via canonical category resolution. Accuracy varies. |

### v2.0 Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Product image in scan result sheet | Instant visual confirmation — user sees a photo of the product before confirming. Reduces wrong-item adds. Grosh and Pantry Check both do this. | MEDIUM | Requires: (1) add `image_url` column to `barcode_product_cache`; (2) extract from `provider_payload.providers.kassal`; (3) extend `BarcodeLookupDto`; (4) display in `BarcodeLookupSheet` with `<img>` and graceful null fallback. |
| Brand name in scan result sheet | Confirms the right variant was scanned (e.g., "TINE Lettmelk" vs "Q-Meieriene Lettmelk"). | LOW | `brand` already captured in `ReducedProviderPayload`. Needs: add `brand` column to cache table, surface in `BarcodeLookupDto`, display as secondary line below name in sheet. |
| Product image in shopping list item rows | Thumbnail on each scanned item row helps shoppers visually confirm what they're picking up in the aisle. Grosh implements this pattern. | MEDIUM | Requires: add `image_url` to `list_items` table; copy from scan result at add-time; render as 36-40px left-aligned thumbnail in `ItemRow` only when non-null. No placeholder for manually-added items — consistent row height required. |
| Product image in Admin Items (Varekatalog) | Visual catalogue-style management — images confirm which item is which when household has many scanned products. | LOW | Reuses same `image_url` stored on list item or household item memory. Small thumbnail column in the items table view. |
| Improved product name accuracy | Raw Kassal.app names are often better for Norwegian products than Gemini-normalized versions. Gemini over-normalizes brand+variant info. | MEDIUM | Prompt engineering: instruct Gemini to preserve brand name, size/volume, and variant descriptors. Consider using `kassalProduct.name` directly when source is `kassal` and confidence is already high, skipping Gemini normalization. |

### v2.0 Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-add after scan with no confirmation | "Fewer taps" — feels faster | Misscans or adjacent-product reads are silently added with no correction. Especially bad on iOS where `html5-qrcode` can trigger on adjacent items. | Keep confirm step; reduce friction by pre-filling all fields correctly so the confirm tap is the only action needed. |
| Show images in all list views by default | Lists look richer with photos | Increases query cost (image_url join on every item), causes layout reflow on image load, breaks visual consistency for manually-added items without images. Partial image coverage looks unfinished. | Show thumbnail only when `image_url` is non-null. Consistent row height with and without image. |
| Cache product images in Supabase Storage | Avoid external CDN dependency | Image proxying adds latency, storage cost, and CDN complexity for images we don't control the copyright of. Kassal.app CDN is stable. | Store only the Kassal.app image URL string. Let browser cache the CDN response. Revisit only if Kassal.app CDN proves unreliable in production. |
| Price display on scan result | "How much does this cost?" | Kassal.app returns prices per store. Selecting the relevant store adds significant UX complexity. Price freshness degrades quickly. Explicitly out of scope per PROJECT.md. | Deep-link to Kassal.app product page if price info is needed. |
| Continuous scan mode | Power users want to scan a basket without closing the sheet | Requires a scan queue model — which confirm sheet is for which scan? Current architecture is one sheet per scan. Queue model is a significant rewrite. | After a scan confirm, automatically re-open the scanner. Simulates continuity without the queue complexity. |

---

## v2.0 Feature Dependencies

```
iOS camera reliability fix
    └──prerequisite for──> All scan flows on iOS
                            (scanner, image display, any new scan UX — worthless if camera doesn't open)

barcode_product_cache schema migration (add image_url, brand columns)
    └──required by──> Edge function image/brand extraction
                          └──required by──> BarcodeLookupDto image/brand fields
                                                └──required by──> Product image in BarcodeLookupSheet
                                                └──required by──> Brand in BarcodeLookupSheet

list_items schema migration (add image_url column)
    └──required by──> Copy image_url from scan result on add-item
                          └──required by──> Product thumbnail in ItemRow
                          └──required by──> Product thumbnail in Admin Items

Gemini prompt tuning
    └──independent (no schema change, no migration)
    └──enhances──> Product name accuracy in BarcodeLookupSheet
```

### v2.0 Dependency Notes

- **iOS fix first:** All other scan improvements are worthless if the scanner doesn't open on iOS. This is the gating work.
- **Single schema migration unlocks the image/brand tree:** Adding `image_url` and `brand` to `barcode_product_cache`, plus updating the edge function to extract and store them, is one cohesive migration. Once done, all display features become straightforward.
- **list_items.image_url is a separate migration:** The cache table stores the canonical product image. The list item stores a copy at add-time. Two separate migrations, two separate concerns.
- **Gemini prompt tuning is zero-risk:** No schema changes, no migrations. Can be iterated independently at any phase.

---

## v2.0 Kassal.app API Fields — Verified from Codebase

The `KassalProduct` type in `supabase/functions/_shared/barcode.ts` shows what the edge function already fetches from Kassal.app:

```
KassalProduct fields: id, ean, name, brand, category, categories, image
```

All fields are typed as nullable. The `image` field holds the product photo URL. The `brand` field holds the brand name (e.g., "TINE", "Q-Meieriene", "Nidar").

The `ReducedProviderPayload` type already captures `brand` from both Kassal and Open Food Facts (`payload.brand`). The `providers.kassal.name` and `providers.kassal.brand` are stored in the `provider_payload` JSONB column.

**The image URL is NOT currently stored in a dedicated column** — it is available inside the JSONB blob but requires parsing. Adding `image_url TEXT` and `brand TEXT` columns to `barcode_product_cache` and populating them in the edge function is the required step.

**Confidence:** HIGH — verified directly from type definitions in `supabase/functions/_shared/barcode.ts` and `src/lib/barcode/lookup.ts`.

---

## v2.0 iOS Camera Reliability — Root Cause and Fixes

**Problem (MEDIUM confidence — multiple WebKit bug reports and library issues confirm):**

WebKit on iOS has a recurring bug where `getUserMedia()` in PWA standalone mode produces a black video stream or silently fails. The camera permission indicator briefly appears then disappears. Known WebKit bugs: 185448, 252465.

**Current mitigations in codebase (from `scanner.ts`):**
- `playsinline="true"` and `muted` set post-start on the video element
- `bindVisibilityCleanup` stops scanner when app goes to background
- Error classification (`permission-denied` vs `camera-failure`) with retry UI

**Missing mitigations to implement:**
- Listen for `video.onplay` failure after stream acquisition; re-acquire stream once before surfacing error
- Silent single retry on `camera-failure` before showing the error state to user
- Verify that `{ facingMode: { ideal: 'environment' } }` constraint (already used) is the safest constraint for iOS — strict `exact` would fail more often
- Evaluate switching from `html5-qrcode` to `@zxing/browser` or the native BarcodeDetector API (Android Chrome only, not iOS — not applicable as a fix, but `@zxing/browser` has better iOS handling in some reports)

**Not fixable at app level:** Camera permission persistence in iOS PWA — iOS does not persist per-PWA camera permissions between sessions in the same way Safari persists them for websites. Users may be re-prompted each session. This is a WebKit limitation, not a code issue.

---

## v2.0 Scan UX Feedback Patterns (Industry Standard)

| Pattern | Implementation | Notes |
|---------|----------------|-------|
| Haptic on decode | `navigator.vibrate(100)` | Works on Android; silently ignored on iOS. One line. |
| Visual flash on decode | Brief border color change on scan box (green pulse) | CSS animation, triggered on scan success before sheet opens. |
| Timing | 150ms between feedback and UI transition | Gives user perceptual confirmation before camera closes. |
| No sound | N/A | Grocery stores are noisy; users often have phone silenced. Sound feedback adds no value here. |

Current `BarcodeScannerSheet.svelte` calls `onDetected` immediately on decode, which closes the scanner and opens the lookup sheet. A 150ms delay with a visual state change (e.g., `state = 'detected'`) would implement this pattern.

---

## v2.0 Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| iOS camera reliability fix | HIGH | HIGH | P1 |
| barcode_product_cache schema migration + edge function (image_url, brand) | HIGH | MEDIUM | P1 |
| Brand display in BarcodeLookupSheet | HIGH | LOW | P1 |
| Product image in BarcodeLookupSheet | HIGH | LOW | P1 |
| Scan detection feedback (vibrate + visual) | MEDIUM | LOW | P1 |
| list_items.image_url migration + ItemRow thumbnail | MEDIUM | MEDIUM | P2 |
| Admin Items thumbnail display | MEDIUM | LOW | P2 |
| Varekatalog thumbnail display | MEDIUM | LOW | P2 |
| Gemini prompt accuracy improvement | MEDIUM | LOW | P2 |
| Auto-reopen scanner after confirm | LOW | LOW | P3 |

**Priority key:**
- P1: Must have — core milestone deliverable
- P2: Should have — meaningful UX enrichment once P1 done
- P3: Nice to have, low risk

---

## v2.0 Competitor Feature Analysis

| Feature | Grosh | Pantry Check | OurGroceries | HandleAppen (before v2.0) | HandleAppen (v2.0 target) |
|---------|-------|--------------|--------------|--------------------------|--------------------------|
| Barcode scan | Yes | Yes | Yes | Yes | Yes (iOS fixed) |
| Product image in confirm sheet | Yes | Yes | No | No | Yes |
| Brand name on scan | Yes | Yes | No | No | Yes |
| Item thumbnail in list | Yes (optional) | No | No | No | Yes (when available) |
| Norwegian product database | No | No | No | Yes (Kassal.app) | Yes |
| Store-layout sorted list | No | No | No | Yes | Yes |
| Scan haptic feedback | Yes | Yes | No | No | Yes |

---

## Sources

- Codebase inspection: `supabase/functions/_shared/barcode.ts`, `src/lib/barcode/scanner.ts`, `src/lib/types/database.ts`, `src/lib/components/barcode/*.svelte` (HIGH confidence — direct verification)
- [Kassal.app API](https://kassal.app/api) — product fields `image` and `brand` confirmed via codebase type definitions (HIGH)
- [STRICH KB: Camera Access Issues in iOS PWA](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa) — iOS PWA camera failure root causes (MEDIUM)
- [WebKit Bug 252465](https://bugs.webkit.org/show_bug.cgi?id=252465) — getUserMedia black screen in standalone PWA (MEDIUM — official bug tracker)
- [WebKit Bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448) — getUserMedia not working in home screen apps (MEDIUM)
- [NN/G: Mobile List Thumbnails](https://www.nngroup.com/articles/mobile-list-thumbnail/) — left vs right placement, size guidance (HIGH — authoritative UX research)
- [Scandit: Scanning at Scale UX Insights](https://www.scandit.com/blog/scanning-at-scale-ux-insights/) — 150ms feedback timing, haptic patterns (MEDIUM)
- [CodeCorp: Barcode Scanner Feedback Mechanisms](https://codecorp.com/about/blog/barcode-scanner-feedback/) — visual/audio/haptic confirmation patterns (MEDIUM)
- [Grosh barcode scan feature](https://groshapp.com/scan-grocery-barcode/) — product image in scan confirm, thumbnail in list (MEDIUM — product page)

---

*Feature research for: Family grocery shopping PWA (Norwegian market)*
*Researched: 2026-03-08 (v1.0 baseline); updated 2026-03-13 (v1.2 new features); updated 2026-03-14 (v2.0 barcode improvement)*
