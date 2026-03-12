# T01: Plan 01

**Slice:** S01 — **Milestone:** M001

## Description

Scaffold the SvelteKit project with full Supabase wiring, apply the Phase 1 database migration (households + profiles tables, my_household_id() SECURITY DEFINER function, invite-code generator, all RLS policies), and install Playwright with test stubs so every subsequent task has an automated verify command available.

Purpose: This plan is the load-bearing foundation. Every downstream plan in this phase and every downstream phase depends on the database schema (especially my_household_id()) and the Supabase client setup being correct before auth or household code is built.

Output: Running SvelteKit dev server, Supabase local stack with migrations applied, typed Supabase clients, Playwright configured, test stub files in place.
