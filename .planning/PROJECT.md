# HandleAppen

## Current Milestone: v2.1 Audit Closure and Verification Artifacts

**Goal:** Close audit-driven correctness and documentation gaps after v2.0 by hardening offline replay integrity and finishing missing verification artifacts.

**Target features:**
- Ensure mixed offline replay outcomes are idempotent and do not duplicate `item_history`
- Protect recommendation source counts from replay-retry skew
- Restore missing verification artifacts for milestone audit closure (Phase 22)

## What This Is

An installable family grocery shopping web app that makes shopping efficient through store-layout-aware, category-sorted lists. Family members each have individual accounts under a shared household, with multiple shopping lists that sync in near real-time across devices, plus barcode-assisted item entry, shopping history, and household recommendations.

## Core Value

The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.

## Requirements

### Validated

- ✓ Family members can create accounts, join a household, and stay signed in across app reopen — v1.0
- ✓ Shared shopping lists support add, remove, check-off, and near real-time sync across devices — v1.0
- ✓ Items are grouped by grocery categories and can follow default or per-store layouts — v1.0
- ✓ Barcode scanning can auto-fill item name and category through Supabase edge-function lookups — v1.0
- ✓ Shopping history and recommendation views are available from the app navigation — v1.0
- ✓ Offline replay now uses survivor-only retry so mixed reconnect outcomes do not duplicate history rows or skew recommendations — validated in Phase 21 (2026-03-28)
- ✓ Phase 22 closed milestone audit verification artifacts with deterministic rerun evidence and passed verification — validated in Phase 22 (2026-03-28)

### Active

- [ ] Bottom navigation has four tabs: Handleliste, Oppskrifter, Anbefalinger, Admin
- [ ] Household-shared recipes with cover images and ingredient lists linked to household items
- [ ] Recipe ingredients can be added individually or all at once to a chosen shopping list
- [ ] Admin hub consolidates Butikker, Husstand, Historikk, Items, and Brukerinnstillinger
- [ ] All household items are editable (name, category, picture) from Admin → Items
- [ ] User can toggle dark mode from Brukerinnstillinger

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
- v1.1 is driven by real mobile usage feedback: dialogs overflow on phones, horizontal drag/scroll breaks the app feel, tap targets are too small, and recurring-item entry is too repetitive

## Constraints

- **Tech stack**: Supabase (auth, database, edge functions, realtime) — already decided
- **Platform**: PWA only — no separate native apps
- **Market**: Norwegian — product naming, barcode sources, and store layouts are Norway-specific
- **Language**: App UI should support Norwegian (primary) with English as fallback
- **Compatibility**: Mobile Safari and Android Chrome must both feel stable in standalone/PWA use — improvements cannot depend on desktop-only interactions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for backend | Auth, DB, realtime, and edge functions in one platform — reduces infrastructure complexity | — Pending |
| PWA over native app | Family can install from browser, no app store friction | — Pending |
| Individual accounts + shared household | Individual identity for history/recommendations while sharing lists | — Pending |
| Kassal.app + Open Food Facts for barcodes | Best coverage for Norwegian products — try Kassal first, fall back to Open Food Facts | — Pending |
| Default layout + per-store overrides | Reduces setup burden while allowing store-specific precision | — Pending |
| v1.1 targets mobile UX before broad feature expansion | Current user pain is interaction friction on phones, not missing major workflows | — Pending |
| v1.2 restructures nav and adds recipes | Weekly dinner planning drives shopping — recipes as first-class objects reduces manual item entry | — Pending |
| v2.0 focuses on barcode scanner improvement and product lookup | Barcode is a key differentiator — iOS reliability and richer product data (image, brand) increase daily usage | Implemented |
| v2.1 prioritizes audit closure and replay integrity | Reliable recommendations depend on idempotent replay and complete verification evidence | Complete |

---
*Last updated: 2026-03-28 after Phase 22 completion*
