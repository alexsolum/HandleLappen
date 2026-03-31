alter table public.profiles
  add column automatic_store_selection_enabled boolean not null default false;
