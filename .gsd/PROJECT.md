# HandleAppen

## Current Milestone: Completed M001 — v1.1 Mobile UX and Smart Item Entry

**Outcome:** The signed-in shopping flow now behaves like a more polished mobile app: dialogs stay inside the viewport, the bottom navigation is pinned and thumb-friendly, quantity can be edited inline from the list, and recurring household items can be re-added through inline suggestions with remembered categories.

**Delivered in M001:**
- Mobile-safe dialogs and layouts with no horizontal overflow
- Larger fixed bottom navigation with better touch ergonomics
- Inline quantity controls on the main list with default quantity `1`
- Household item memory with typeahead suggestions and remembered categories

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
- ✓ Mobile dialogs fit fully within the viewport and never cause sideways scrolling — M001
- ✓ Mobile screens do not allow accidental sideways app scrolling during normal use — M001
- ✓ Bottom navigation stays fixed to the screen bottom and is easier to tap with a thumb — M001
- ✓ Quantity can be adjusted directly from the main list without opening item details — M001
- ✓ Newly added items default to quantity `1` unless explicitly changed — M001
- ✓ Previously added household items appear as typeahead suggestions while typing — M001
- ✓ Picking a remembered item suggestion reuses its last known category automatically — M001

### Active

- None currently tracked for post-M001 follow-up in this file.

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
- v1.1 was driven by real mobile usage feedback: dialogs overflowed on phones, horizontal drag/scroll broke the app feel, tap targets were too small, and recurring-item entry was too repetitive

## Constraints

- **Tech stack**: Supabase (auth, database, edge functions, realtime) — already decided
- **Platform**: PWA only — no separate native apps
- **Market**: Norwegian — product naming, barcode sources, and store layouts are Norway-specific
- **Language**: App UI should support Norwegian (primary) with English as fallback
- **Compatibility**: Mobile Safari and Android Chrome must both feel stable in standalone/PWA use — improvements cannot depend on desktop-only interactions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for backend | Auth, DB, realtime, and edge functions in one platform — reduces infrastructure complexity | Established |
| PWA over native app | Family can install from browser, no app store friction | Established |
| Individual accounts + shared household | Individual identity for history/recommendations while sharing lists | Established |
| Kassal.app + Open Food Facts for barcodes | Best coverage for Norwegian products — try Kassal first, fall back to Open Food Facts | Established |
| Default layout + per-store overrides | Reduces setup burden while allowing store-specific precision | Established |
| v1.1 targets mobile UX before broad feature expansion | Current user pain is interaction friction on phones, not missing major workflows | Completed in M001 |

---
*Last updated: 2026-03-12 after completing milestone M001*
