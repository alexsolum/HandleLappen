-- ── TABLES ────────────────────────────────────────────────────────────────

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

create index on public.lists(household_id);

create table public.list_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists on delete cascade,
  name       text not null,
  quantity   integer,
  is_checked boolean not null default false,
  checked_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create index on public.list_items(list_id);
create index on public.list_items(list_id, is_checked);

create table public.item_history (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists on delete cascade,
  item_id     uuid references public.list_items on delete set null,
  item_name   text not null,
  checked_by  uuid references auth.users on delete set null,
  checked_at  timestamptz not null default now()
);

create index on public.item_history(list_id);
create index on public.item_history(checked_at);

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.lists        enable row level security;
alter table public.list_items   enable row level security;
alter table public.item_history enable row level security;

create policy "lists_select" on public.lists for select
  using (household_id = public.my_household_id());
create policy "lists_insert" on public.lists for insert
  with check (household_id = public.my_household_id());
create policy "lists_delete" on public.lists for delete
  using (household_id = public.my_household_id());

create policy "list_items_select" on public.list_items for select
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "list_items_insert" on public.list_items for insert
  with check (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "list_items_update" on public.list_items for update
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "list_items_delete" on public.list_items for delete
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));

create policy "item_history_select" on public.item_history for select
  using (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));
create policy "item_history_insert" on public.item_history for insert
  with check (list_id in (
    select id from public.lists where household_id = public.my_household_id()
  ));

-- ── REALTIME PUBLICATION ──────────────────────────────────────────────────
-- Both tables must be in the publication for postgres_changes events to fire.
-- item_history is NOT added — it is write-only in Phase 2 (no realtime reads needed).

alter publication supabase_realtime add table public.list_items;
alter publication supabase_realtime add table public.lists;
