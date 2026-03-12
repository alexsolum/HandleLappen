create or replace function public.normalize_item_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(lower(trim(coalesce(p_name, ''))), '\s+', ' ', 'g');
$$;

create table public.household_item_memory (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  normalized_name text not null,
  display_name text not null,
  last_category_id uuid references public.categories on delete set null,
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, normalized_name)
);

create index household_item_memory_household_name_idx
  on public.household_item_memory(household_id, normalized_name);

create index household_item_memory_household_rank_idx
  on public.household_item_memory(household_id, use_count desc, last_used_at desc);

alter table public.household_item_memory enable row level security;

create policy "household_item_memory_select" on public.household_item_memory for select
  using (household_id = public.my_household_id());

create policy "household_item_memory_insert" on public.household_item_memory for insert
  with check (household_id = public.my_household_id());

create policy "household_item_memory_update" on public.household_item_memory for update
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create or replace function public.upsert_household_item_memory(
  p_household_id uuid,
  p_item_name text,
  p_category_id uuid default null,
  p_increment integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_name text;
  v_display_name text;
begin
  v_normalized_name := public.normalize_item_name(p_item_name);
  v_display_name := trim(coalesce(p_item_name, ''));

  if p_household_id is null or v_normalized_name = '' or v_display_name = '' then
    return;
  end if;

  insert into public.household_item_memory as memory (
    household_id,
    normalized_name,
    display_name,
    last_category_id,
    use_count,
    last_used_at,
    updated_at
  )
  values (
    p_household_id,
    v_normalized_name,
    v_display_name,
    p_category_id,
    greatest(p_increment, 0),
    now(),
    now()
  )
  on conflict (household_id, normalized_name)
  do update set
    display_name = excluded.display_name,
    last_category_id = case
      when p_category_id is null and p_increment > 0 then memory.last_category_id
      else p_category_id
    end,
    use_count = memory.use_count + greatest(p_increment, 0),
    last_used_at = case
      when p_increment > 0 then now()
      else memory.last_used_at
    end,
    updated_at = now();
end;
$$;

create or replace function public.sync_household_item_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_increment integer := case when tg_op = 'INSERT' then 1 else 0 end;
begin
  select l.household_id
  into v_household_id
  from public.lists l
  where l.id = new.list_id;

  if v_household_id is null then
    return new;
  end if;

  perform public.upsert_household_item_memory(
    v_household_id,
    new.name,
    new.category_id,
    v_increment
  );

  return new;
end;
$$;

drop trigger if exists sync_household_item_memory_after_insert on public.list_items;
create trigger sync_household_item_memory_after_insert
after insert on public.list_items
for each row
execute function public.sync_household_item_memory();

drop trigger if exists sync_household_item_memory_after_update on public.list_items;
create trigger sync_household_item_memory_after_update
after update of name, category_id on public.list_items
for each row
when (
  old.name is distinct from new.name
  or old.category_id is distinct from new.category_id
)
execute function public.sync_household_item_memory();

create or replace function public.search_household_item_memory(
  p_query text,
  p_limit integer default 5
)
returns table (
  item_name text,
  normalized_name text,
  last_category_id uuid,
  use_count integer,
  last_used_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with input as (
    select public.normalize_item_name(p_query) as query
  )
  select
    memory.display_name as item_name,
    memory.normalized_name,
    memory.last_category_id,
    memory.use_count,
    memory.last_used_at
  from public.household_item_memory memory
  cross join input
  where input.query <> ''
    and memory.household_id = public.my_household_id()
    and memory.normalized_name like '%' || input.query || '%'
  order by
    case
      when memory.normalized_name = input.query then 0
      when memory.normalized_name like input.query || '%' then 1
      when memory.normalized_name like '% ' || input.query || '%' then 2
      else 3
    end,
    memory.use_count desc,
    memory.last_used_at desc,
    memory.display_name asc
  limit least(greatest(coalesce(p_limit, 5), 1), 5);
$$;

grant execute on function public.search_household_item_memory(text, integer) to authenticated;
