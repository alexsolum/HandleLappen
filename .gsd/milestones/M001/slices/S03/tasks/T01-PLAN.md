# T01: Plan 01

**Slice:** S03 — **Milestone:** M001

## Description

Create the database foundation for Phase 3: three new tables (categories, stores, store_layouts), add category_id to list_items, seed 12 default Norwegian grocery categories via a reusable Postgres function, wire the seed call into the onboarding flow, and create the Wave 0 Playwright test scaffold.

Purpose: Every subsequent plan in this phase depends on these tables existing with correct RLS and the seed data function being callable. The onboarding wiring ensures every real household created after Phase 3 deploys starts with categories populated — without this, all items show as "Andre varer" for new users.
Output: One SQL migration applied to the local Supabase instance, two new test files (categories.spec.ts + helpers/categories.ts), and an updated +page.server.ts that calls the seed RPC.
