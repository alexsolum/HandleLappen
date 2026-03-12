create table public.barcode_product_cache (
  ean text primary key,
  normalized_name text,
  canonical_category text,
  confidence numeric,
  source text not null,
  status text not null,
  provider_payload jsonb,
  provider_fetched_at timestamptz,
  ai_enriched_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barcode_product_cache_ean_digits_only check (ean ~ '^[0-9]{8,14}$'),
  constraint barcode_product_cache_status_check check (status in ('found', 'not_found')),
  constraint barcode_product_cache_confidence_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create index barcode_product_cache_expires_at_idx
  on public.barcode_product_cache (expires_at);

create index barcode_product_cache_status_expires_at_idx
  on public.barcode_product_cache (status, expires_at);

alter table public.barcode_product_cache enable row level security;

revoke all on public.barcode_product_cache from anon;
revoke all on public.barcode_product_cache from authenticated;
grant select, insert, update, delete on public.barcode_product_cache to service_role;
