-- Phase 1 hotfix
-- Allows authenticated users to create households during onboarding.

create policy "households_insert_authenticated" on public.households for insert
  with check ((select auth.uid()) is not null);
