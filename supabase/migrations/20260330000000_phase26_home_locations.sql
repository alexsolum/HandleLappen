create table public.user_home_locations (
  user_id uuid primary key references auth.users on delete cascade,
  lat_4dp numeric(8, 4) not null,
  lng_4dp numeric(8, 4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_home_locations_lat_4dp_check
    check (lat_4dp = round(lat_4dp, 4) and lat_4dp between -90 and 90),
  constraint user_home_locations_lng_4dp_check
    check (lng_4dp = round(lng_4dp, 4) and lng_4dp between -180 and 180)
);

create or replace function public.round_user_home_location_4dp()
returns trigger
language plpgsql
as $$
begin
  new.lat_4dp = round(new.lat_4dp, 4);
  new.lng_4dp = round(new.lng_4dp, 4);
  return new;
end;
$$;

create trigger user_home_locations_round_4dp
  before insert or update on public.user_home_locations
  for each row
  execute function public.round_user_home_location_4dp();

create trigger user_home_locations_set_updated_at
  before update on public.user_home_locations
  for each row
  execute function public.set_updated_at();

alter table public.user_home_locations enable row level security;

create policy "user_home_locations_select_own"
  on public.user_home_locations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_home_locations_insert_own"
  on public.user_home_locations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_home_locations_update_own"
  on public.user_home_locations
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_home_locations_delete_own"
  on public.user_home_locations
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
