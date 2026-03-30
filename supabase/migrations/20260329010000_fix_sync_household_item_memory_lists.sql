-- Fix: phase20 sync function referenced deprecated public.shopping_lists table.
-- list_items now references public.lists, so household lookup must read from public.lists.

create or replace function public.sync_household_item_memory()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    perform public.upsert_household_item_memory(
      (select household_id from public.lists where id = new.list_id),
      new.name,
      new.category_id,
      new.brand,
      new.product_image_url
    );
  end if;
  return new;
end;
$$;

