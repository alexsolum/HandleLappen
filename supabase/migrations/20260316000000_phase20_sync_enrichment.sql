-- Phase 20: Client Image Display
-- This migration updates the household item memory system to store and retrieve brand names and product image URLs.

-- Drop the old upsert function that doesn't handle brand/image
drop function if exists public.upsert_household_item_memory(uuid, text, uuid, integer);

-- Update the upsert function to handle brand and product_image_url
create or replace function public.upsert_household_item_memory(
  p_household_id uuid,
  p_item_name text,
  p_category_id uuid,
  p_brand text,
  p_product_image_url text,
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
    brand,
    product_image_url,
    use_count,
    last_used_at,
    updated_at
  )
  values (
    p_household_id,
    v_normalized_name,
    v_display_name,
    p_category_id,
    p_brand,
    p_product_image_url,
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
    brand = coalesce(excluded.brand, memory.brand),
    product_image_url = coalesce(excluded.product_image_url, memory.product_image_url),
    use_count = memory.use_count + greatest(p_increment, 0),
    last_used_at = case
      when p_increment > 0 then now()
      else memory.last_used_at
    end,
    updated_at = now();
end;
$$;

-- Update the trigger function to pass new fields from list_items
create or replace function public.sync_household_item_memory()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    perform public.upsert_household_item_memory(
      (select household_id from public.shopping_lists where id = new.list_id),
      new.name,
      new.category_id,
      new.brand,
      new.product_image_url
    );
  end if;
  return new;
end;
$$;

-- Drop old sync triggers
drop trigger if exists sync_household_item_memory_after_update on public.list_items;

-- Recreate sync trigger for insert only
drop trigger if exists sync_household_item_memory_after_insert on public.list_items;
create trigger sync_household_item_memory_after_insert
after insert on public.list_items
for each row
execute function public.sync_household_item_memory();


-- Drop old search function
drop function if exists public.search_household_item_memory(text, integer);

-- Update the search function to return the new fields
create or replace function public.search_household_item_memory(
  p_household_id uuid,
  p_search_term text
)
returns table (
  id uuid,
  household_id uuid,
  display_name text,
  last_category_id uuid,
  brand text,
  product_image_url text,
  use_count integer,
  last_used_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    him.id,
    him.household_id,
    him.display_name,
    him.last_category_id,
    him.brand,
    him.product_image_url,
    him.use_count,
    him.last_used_at
  from
    public.household_item_memory him
  where
    him.household_id = p_household_id
    and (
      p_search_term is null
      or p_search_term = ''
      or him.display_name ilike '%' || p_search_term || '%'
    )
  order by
    him.last_used_at desc,
    him.use_count desc;
end;
$$;
