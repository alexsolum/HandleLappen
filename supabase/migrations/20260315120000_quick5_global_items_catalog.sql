-- Global items catalog for seed data (top products from Kassal)
-- This table stores a curated list of popular grocery products for quick add

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text null,
  brand text null,
  image_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint on name for upsert
alter table public.items
  add constraint items_name_unique unique (name);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on public.items
  for each row
  execute function public.set_updated_at();

-- Public read access (items catalog is global, no household scoping)
alter table public.items enable row level security;

create policy "items_select_authenticated"
  on public.items for select
  to authenticated
  using (true);
