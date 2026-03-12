alter table public.item_history
  add column if not exists list_name text,
  add column if not exists store_id uuid references public.stores on delete set null,
  add column if not exists store_name text;

create index if not exists item_history_store_id_idx on public.item_history(store_id);

update public.item_history ih
set list_name = l.name
from public.lists l
where ih.list_id = l.id
  and ih.list_name is null;
