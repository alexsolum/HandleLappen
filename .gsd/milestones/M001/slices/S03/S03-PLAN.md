# S03: Store Layouts And Category Ordering

**Goal:** Create the database foundation for Phase 3: three new tables (categories, stores, store_layouts), add category_id to list_items, seed 12 default Norwegian grocery categories via a reusable Postgres function, wire the seed call into the onboarding flow, and create the Wave 0 Playwright test scaffold.
**Demo:** Create the database foundation for Phase 3: three new tables (categories, stores, store_layouts), add category_id to list_items, seed 12 default Norwegian grocery categories via a reusable Postgres function, wire the seed call into the onboarding flow, and create the Wave 0 Playwright test scaffold.

## Must-Haves


## Tasks

- [x] **T01: Plan 01**
  - Create the database foundation for Phase 3: three new tables (categories, stores, store_layouts), add category_id to list_items, seed 12 default Norwegian grocery categories via a reusable Postgres function, wire the seed call into the onboarding flow, and create the Wave 0 Playwright test scaffold.

Purpose: Every subsequent plan in this phase depends on these tables existing with correct RLS and the seed data function being callable. The onboarding wiring ensures every real household created after Phase 3 deploys starts with categories populated — without this, all items show as "Andre varer" for new users.
Output: One SQL migration applied to the local Supabase instance, two new test files (categories.spec.ts + helpers/categories.ts), and an updated +page.server.ts that calls the seed RPC.
- [x] **T02: Plan 02**
  - Refactor the list detail view to display items grouped by category in Norwegian store order. Add TanStack Query factories for categories and store layouts. Add the StoreSelector component (Butikk pill + bottom sheet). Wire session-only store selection into the grouping logic.

Purpose: Delivers CATG-01 and CATG-02 — the primary product differentiator (store-layout-ordered list).
Output: A working categorized list view, new query factories, two new components.
- [x] **T03: Plan 03**
  - Activate the Butikker tab and build the full store management system: store list screen, per-store drag-to-reorder category layout screen, and the default layout screen with category CRUD. Install and wire svelte-dnd-action. Add Realtime subscription for the categories table.

Purpose: Delivers CATG-03 (per-store layouts) and CATG-04 (category add/rename/delete with Realtime sync).
Output: Three new route files, two new components, one new query file, svelte-dnd-action installed.
- [x] **T04: Plan 04**
  - Add per-item category assignment: long-press gesture on item rows opens an edit detail sheet; auto-appearing category picker modal after item add; optimistic category assignment mutation that moves items to the correct group immediately.

Purpose: Delivers CATG-05 — users can assign or change any item's category from the list view.
Output: Two new components (CategoryPickerModal, ItemDetailSheet), updates to ItemRow and items.ts, list page wiring.

## Files Likely Touched

