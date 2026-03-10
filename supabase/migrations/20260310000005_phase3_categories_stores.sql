create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  position     integer not null default 0,
  created_at   timestamptz default now()
);

create index on public.categories(household_id);
create index on public.categories(household_id, position);

create table public.stores (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

create index on public.stores(household_id);

create table public.store_layouts (
  store_id    uuid not null references public.stores on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  position    integer not null default 0,
  primary key (store_id, category_id)
);

create index on public.store_layouts(store_id, position);

alter table public.list_items
  add column category_id uuid references public.categories on delete set null;

create index on public.list_items(category_id);

alter table public.categories enable row level security;

create policy "categories_select" on public.categories for select
  using (household_id = public.my_household_id());
create policy "categories_insert" on public.categories for insert
  with check (household_id = public.my_household_id());
create policy "categories_update" on public.categories for update
  using (household_id = public.my_household_id());
create policy "categories_delete" on public.categories for delete
  using (household_id = public.my_household_id());

alter table public.stores enable row level security;

create policy "stores_select" on public.stores for select
  using (household_id = public.my_household_id());
create policy "stores_insert" on public.stores for insert
  with check (household_id = public.my_household_id());
create policy "stores_update" on public.stores for update
  using (household_id = public.my_household_id());
create policy "stores_delete" on public.stores for delete
  using (household_id = public.my_household_id());

alter table public.store_layouts enable row level security;

create policy "store_layouts_select" on public.store_layouts for select
  using (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));
create policy "store_layouts_insert" on public.store_layouts for insert
  with check (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));
create policy "store_layouts_update" on public.store_layouts for update
  using (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));
create policy "store_layouts_delete" on public.store_layouts for delete
  using (store_id in (
    select id from public.stores where household_id = public.my_household_id()
  ));

alter publication supabase_realtime add table public.categories;

create or replace function public.seed_default_categories(p_household_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.categories (household_id, name, position) values
    (p_household_id, 'Frukt og grønt',      10),
    (p_household_id, 'Brød og bakevarer',   20),
    (p_household_id, 'Pålegg og kjøtt',     30),
    (p_household_id, 'Meieri og egg',       40),
    (p_household_id, 'Kjøtt og fisk',       50),
    (p_household_id, 'Hermetikk og glass',  60),
    (p_household_id, 'Pasta, ris og korn',  70),
    (p_household_id, 'Snacks og godteri',   80),
    (p_household_id, 'Drikke',              90),
    (p_household_id, 'Rengjøring',         100),
    (p_household_id, 'Helse og hygiene',   110),
    (p_household_id, 'Kjøl og frys',       120);
$$;
