-- Phase 14-01: Recipe Backend Foundation

-- ── TABLES ────────────────────────────────────────────────────────────────

-- 1. Create recipes table
create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  description  text,
  image_url    text,
  created_at   timestamptz not null default now()
);

-- 2. Create recipe_ingredients table
create table public.recipe_ingredients (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name      text not null,
  position  integer not null default 0
);

-- ── INDEXES ───────────────────────────────────────────────────────────────

create index on public.recipes(household_id);
create index on public.recipe_ingredients(recipe_id);

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

-- Recipes Policies
create policy "recipes_select" on public.recipes for select
  using (household_id = public.my_household_id());

create policy "recipes_insert" on public.recipes for insert
  with check (household_id = public.my_household_id());

create policy "recipes_update" on public.recipes for update
  using (household_id = public.my_household_id());

create policy "recipes_delete" on public.recipes for delete
  using (household_id = public.my_household_id());

-- Recipe Ingredients Policies
create policy "recipe_ingredients_select" on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes
      where id = recipe_ingredients.recipe_id
      and household_id = public.my_household_id()
    )
  );

create policy "recipe_ingredients_insert" on public.recipe_ingredients for insert
  with check (
    exists (
      select 1 from public.recipes
      where id = recipe_ingredients.recipe_id
      and household_id = public.my_household_id()
    )
  );

create policy "recipe_ingredients_update" on public.recipe_ingredients for update
  using (
    exists (
      select 1 from public.recipes
      where id = recipe_ingredients.recipe_id
      and household_id = public.my_household_id()
    )
  );

create policy "recipe_ingredients_delete" on public.recipe_ingredients for delete
  using (
    exists (
      select 1 from public.recipes
      where id = recipe_ingredients.recipe_id
      and household_id = public.my_household_id()
    )
  );

-- ── STORAGE ───────────────────────────────────────────────────────────────

-- Create the 'recipes' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('recipes', 'recipes', true)
on conflict (id) do nothing;

-- Storage Policies for 'recipes' bucket
-- Note: household_id is used as the first folder level in the path

-- INSERT: Authenticated users can upload to recipes/{household_id}/*
create policy "recipes_upload_policy"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipes' AND
  (storage.foldername(name))[1] = public.my_household_id()::text
);

-- SELECT: Authenticated users can read recipes/{household_id}/*
create policy "recipes_select_policy"
on storage.objects for select
to authenticated
using (
  bucket_id = 'recipes' AND
  (storage.foldername(name))[1] = public.my_household_id()::text
);

-- UPDATE: Authenticated users can modify recipes/{household_id}/*
create policy "recipes_update_policy"
on storage.objects for update
to authenticated
using (
  bucket_id = 'recipes' AND
  (storage.foldername(name))[1] = public.my_household_id()::text
);

-- DELETE: Authenticated users can delete recipes/{household_id}/*
create policy "recipes_delete_policy"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'recipes' AND
  (storage.foldername(name))[1] = public.my_household_id()::text
);
