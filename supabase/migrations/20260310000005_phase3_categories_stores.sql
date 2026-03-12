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
    (p_household_id, 'Urter og ferdigkuttede grønnsaker',   20),
    (p_household_id, 'Brød og bakervarer',                  30),
    (p_household_id, 'Frokostblanding og havregryn',        40),
    (p_household_id, 'Meieriprodukter',                     50),
    (p_household_id, 'Ost',                                 60),
    (p_household_id, 'Egg',                                 70),
    (p_household_id, 'Ferskt kjøtt',                        80),
    (p_household_id, 'Kylling og kalkun',                   90),
    (p_household_id, 'Fisk og sjømat',                     100),
    (p_household_id, 'Ferdigretter og delikatesse',        110),
    (p_household_id, 'Frysevarer',                         120),
    (p_household_id, 'Pasta, ris og kornprodukter',       130),
    (p_household_id, 'Bakevarer og bakeingredienser',      140),
    (p_household_id, 'Hermetikk og glassvarer',            150),
    (p_household_id, 'Sauser og matoljer',                 160),
    (p_household_id, 'Krydder',                            170),
    (p_household_id, 'Snacks',                             180),
    (p_household_id, 'Sjokolade og godteri',               190),
    (p_household_id, 'Drikkevarer',                        200),
    (p_household_id, 'Kaffe og te',                        210),
    (p_household_id, 'Øl og cider',                        220),
    (p_household_id, 'Husholdningsartikler',               230),
    (p_household_id, 'Personlig hygiene',                  240),
    (p_household_id, 'Dyremat',                            250);
$$;
