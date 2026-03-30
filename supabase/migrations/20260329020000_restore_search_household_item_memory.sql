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
