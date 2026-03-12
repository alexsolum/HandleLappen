-- Phase 1 hotfix
-- Allow authenticated users to look up households by invite code during onboarding.

create policy "households_select_authenticated" on public.households for select
  using ((select auth.uid()) is not null);
