# M001: Migration

**Vision:** **Goal:** Make the shopping flow feel like a real mobile app and reduce friction when adding recurring items.

## Success Criteria


## Slices

- [x] **S01: Auth And Household Foundation** `risk:medium` `depends:[]`
  > After this: Scaffold the SvelteKit project with full Supabase wiring, apply the Phase 1 database migration (households + profiles tables, my_household_id() SECURITY DEFINER function, invite-code generator, all RLS policies), and install Playwright with test stubs so every subsequent task has an automated verify command available.
- [x] **S02: Shopping Lists And Core Loop** `risk:medium` `depends:[S01]`
  > After this: Lay the complete foundation for Phase 2: database schema, TypeScript types, TanStack Query client setup, and Wave 0 test scaffolds.
- [x] **S03: Store Layouts And Category Ordering** `risk:medium` `depends:[S02]`
  > After this: Create the database foundation for Phase 3: three new tables (categories, stores, store_layouts), add category_id to list_items, seed 12 default Norwegian grocery categories via a reusable Postgres function, wire the seed call into the onboarding flow, and create the Wave 0 Playwright test scaffold.
- [x] **S04: Barcode Scanning** `risk:medium` `depends:[S03]`
  > After this: Build the server-side barcode lookup foundation for Phase 4: cache table, authenticated Supabase Edge Function, Kassal primary lookup, Open Food Facts fallback, Gemini normalization, and Wave 0 barcode test scaffolding.
- [x] **S05: Pwa And Offline Support** `risk:medium` `depends:[S04]`
  > After this: Install and configure `@vite-pwa/sveltekit` with a custom TypeScript service worker, PWA manifest, and static icons to make the app installable on Android home screens — satisfying PWAF-01.
- [x] **S06: History View And Recommendations** `risk:medium` `depends:[S05]`
  > After this: Create the Phase 6 history foundation: durable history metadata, grouped household history queries, and the initial protected history surface that satisfies HIST-02.
- [x] **S07: Verification And Evidence Closure** `risk:medium` `depends:[S06]`
  > After this: Produce `.
- [x] **S08: Traceability Reconciliation And Milestone Reaudit** `risk:medium` `depends:[S07]`
  > After this: unit tests prove traceability-reconciliation-and-milestone-reaudit works
- [x] **S09: Mobile Layout Hardening** `risk:medium` `depends:[S08]`
  > After this: Create the shared mobile layout contract for Phase 9 by hardening the protected shell and normalizing all existing bottom-sheet dialogs.
- [x] **S10: Inline Quantity Controls** `risk:medium` `depends:[S09]`
  > After this: Add inline quantity editing to active shopping-list rows without breaking the current list interaction model.
- [x] **S11: Household Item Memory And Suggestions** `risk:medium` `depends:[S10]`
  > After this: Create the household-scoped remembered-item data source and query layer that Phase 11 needs for typeahead suggestions and category reuse.
