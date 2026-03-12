create or replace function public.history_session_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from (
    select distinct
      date(ih.checked_at),
      coalesce(ih.store_name, ''),
      ih.list_id
    from public.item_history ih
    join public.lists l on l.id = ih.list_id
    where l.household_id = public.my_household_id()
  ) sessions;
$$;

create or replace function public.frequency_recommendations(p_limit integer default 8)
returns table (
  item_name text,
  purchase_count bigint,
  last_checked_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    min(trim(ih.item_name)) as item_name,
    count(*) as purchase_count,
    max(ih.checked_at) as last_checked_at
  from public.item_history ih
  join public.lists l on l.id = ih.list_id
  where l.household_id = public.my_household_id()
    and ih.checked_at >= now() - interval '90 days'
  group by lower(trim(ih.item_name))
  order by purchase_count desc, last_checked_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.copurchase_recommendations(p_list_id uuid, p_limit integer default 4)
returns table (
  item_name text,
  purchase_count bigint,
  paired_with text,
  last_checked_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with target_list as (
    select id
    from public.lists
    where id = p_list_id
      and household_id = public.my_household_id()
  ),
  active_items as (
    select lower(trim(li.name)) as normalized_name
    from public.list_items li
    join target_list tl on tl.id = li.list_id
  ),
  session_matches as (
    select distinct
      ih.list_id,
      date(ih.checked_at) as session_date,
      coalesce(ih.store_name, '') as session_store
    from public.item_history ih
    join public.lists l on l.id = ih.list_id
    where l.household_id = public.my_household_id()
      and ih.checked_at >= now() - interval '90 days'
      and lower(trim(ih.item_name)) in (select normalized_name from active_items)
  )
  select
    min(trim(candidate.item_name)) as item_name,
    count(*) as purchase_count,
    min(trim(anchor.item_name)) as paired_with,
    max(candidate.checked_at) as last_checked_at
  from session_matches session_matches
  join public.item_history candidate
    on candidate.list_id = session_matches.list_id
   and date(candidate.checked_at) = session_matches.session_date
   and coalesce(candidate.store_name, '') = session_matches.session_store
  join public.item_history anchor
    on anchor.list_id = session_matches.list_id
   and date(anchor.checked_at) = session_matches.session_date
   and coalesce(anchor.store_name, '') = session_matches.session_store
  where lower(trim(anchor.item_name)) in (select normalized_name from active_items)
    and lower(trim(candidate.item_name)) not in (select normalized_name from active_items)
  group by lower(trim(candidate.item_name))
  order by purchase_count desc, last_checked_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.history_session_count() to authenticated;
grant execute on function public.frequency_recommendations(integer) to authenticated;
grant execute on function public.copurchase_recommendations(uuid, integer) to authenticated;
