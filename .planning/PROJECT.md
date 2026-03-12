# HandleAppen

## What This Is

A family grocery shopping progressive web app that makes shopping efficient through store-layout-aware, category-sorted lists. Family members each have individual accounts under a shared household, with multiple shopping lists that sync in near real-time across all devices. Items can be added by typing a name or scanning a barcode, which fetches Norwegian product data automatically.

## Core Value

The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Family members can create individual accounts and join a shared household
- [ ] Multiple named shopping lists (per store or occasion)
- [ ] Items grouped by category, categories sorted by store layout
- [ ] One default category order, overridable per store
- [ ] Any family member can manage store layouts and categories
- [ ] Near real-time sync when items are added, removed, or checked off
- [ ] Items added by typing a name or scanning a barcode
- [ ] Barcode lookup via Kassal.app API and Open Food Facts for Norwegian product data
- [ ] History section: all checked-out items logged to database
- [ ] Recommendation section (bottom nav): history-based + co-purchase suggestions

### Out of Scope

- Native mobile app — PWA covers mobile use case
- Price comparison / cheapest store routing — too complex for v1
- Meal planning integration — separate concern, defer to later
- Push notifications — deferred to v2

## Context

- Norwegian market: barcode data comes from Kassal.app (Norwegian grocery price comparison API) and Open Food Facts as fallback
- Family use case: shared household with individual logins — similar to how apps like OurGroceries or AnyList work
- Store layout: categories have a default sequence (e.g., produce → dairy → meat → frozen) that reflects how most Norwegian grocery stores (Rema 1000, Kiwi, Meny, Spar) are laid out; each store can override
- Real-time sync is the core technical challenge — Supabase Realtime subscriptions handle this
- PWA requirement: installable, fast on mobile, works well offline or with poor connectivity during shopping

## Constraints

- **Tech stack**: Supabase (auth, database, edge functions, realtime) — already decided
- **Platform**: PWA only — no separate native apps
- **Market**: Norwegian — product naming, barcode sources, and store layouts are Norway-specific
- **Language**: App UI should support Norwegian (primary) with English as fallback

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for backend | Auth, DB, realtime, and edge functions in one platform — reduces infrastructure complexity | — Pending |
| PWA over native app | Family can install from browser, no app store friction | — Pending |
| Individual accounts + shared household | Individual identity for history/recommendations while sharing lists | — Pending |
| Kassal.app + Open Food Facts for barcodes | Best coverage for Norwegian products — try Kassal first, fall back to Open Food Facts | — Pending |
| Default layout + per-store overrides | Reduces setup burden while allowing store-specific precision | — Pending |

---
*Last updated: 2026-03-08 after initialization*
