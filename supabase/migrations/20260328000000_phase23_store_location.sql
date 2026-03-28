-- Phase 23: Store Location Foundation
-- Adds chain identity and geographic coordinates to stores

alter table public.stores
  add column chain         text,
  add column location_name text,
  add column lat           double precision,
  add column lng           double precision;

-- Backfill: copy existing name into location_name
update public.stores set location_name = name;

-- Enforce NOT NULL on location_name after backfill
alter table public.stores
  alter column location_name set not null;

-- Drop the old name column (now redundant)
alter table public.stores drop column name;
