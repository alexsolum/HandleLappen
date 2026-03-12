-- Phase 1 Foundation Migration
-- Establishes: households table, profiles table, my_household_id() SECURITY DEFINER,
-- generate_invite_code(), and all Phase 1 RLS policies.
-- CRITICAL: my_household_id() must exist before any downstream table's RLS policies are written.

-- Enable pgcrypto for invite code generation
create extension if not exists pgcrypto with schema extensions;

-- ── INVITE CODE GENERATOR ──────────────────────────────────────────────────
-- Produces 8-char uppercase alphanumeric codes, excluding visually ambiguous chars (0/O/1/l/I)
-- Uses a UNIQUE constraint on households.invite_code for collision safety

create or replace function public.generate_invite_code()
  returns text
  language sql
  security definer
  set search_path = ''
  as $$
    select upper(
      substr(
        translate(
          encode(extensions.gen_random_bytes(8), 'base64'),
          '+/=0Ool1I',
          'ABCDEFGH'
        ),
        1, 8
      )
    )
  $$;

-- ── TABLES ────────────────────────────────────────────────────────────────

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null default public.generate_invite_code(),
  created_at  timestamptz default now()
);

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid references public.households on delete set null,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz default now()
);

create index on public.profiles(household_id);

-- ── SECURITY DEFINER FUNCTION ──────────────────────────────────────────────
-- MUST be created after the profiles table exists.
-- This function is the RLS anchor for every household-scoped table in the app.
-- SECURITY DEFINER bypasses RLS on profiles during lookup — prevents infinite recursion.
-- set search_path = '' hardens against search_path injection attacks.
-- (select auth.uid()) caches the result per query, not per row — required for performance.

create or replace function public.my_household_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select household_id
    from public.profiles
    where id = (select auth.uid())
  $$;

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.profiles   enable row level security;

-- households: any member can read their own household
create policy "households_select" on public.households for select
  using (id = public.my_household_id());

-- profiles: read all profiles in same household (for members view - HOUS-02)
create policy "profiles_select" on public.profiles for select
  using (household_id = public.my_household_id());

-- profiles: user can insert their own profile during onboarding
-- (allows unauthenticated-but-logged-in users on /velkommen to create their profile)
create policy "profiles_insert_own" on public.profiles for insert
  with check (id = (select auth.uid()));

-- profiles: user can update their own profile
create policy "profiles_update_own" on public.profiles for update
  using (id = (select auth.uid()));