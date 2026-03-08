import { test } from '@playwright/test'

// Verifies my_household_id() exists and RLS is active on both tables.
// These run against the local Supabase stack — no browser needed.

test('my_household_id function exists', async () => {
  test.skip(true, 'Stub — DB integration test; run separately with npx supabase db test')
  // SELECT routine_name FROM information_schema.routines WHERE routine_name = 'my_household_id'
  // Expect: 1 row
})

test('households table has RLS enabled', async () => {
  test.skip(true, "Stub — verify via: SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity")
  // After Phase 1: this query must return zero rows
})

test('profiles table has RLS enabled', async () => {
  test.skip(true, 'Stub — same as above')
})