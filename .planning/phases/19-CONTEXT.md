# Context: Phase 19 - Edge Function and DTO Enrichment

## Objective
Enrich the barcode scanning pipeline with brand names and image URLs from Kassal.app and Open Food Facts. Ensure this data is cached in `barcode_product_cache` and delivered to the client via an updated `BarcodeLookupDto`, while bypassing Gemini for these specific fields to minimize token costs and latency.

## Decisions

### 1. Brand Normalization
- **Strict Pass-Through**: The brand name will be passed through exactly as provided by the source (Kassal.app or Open Food Facts).
- **Junk Filtering**: Common "empty" strings returned by providers (e.g., "None", "N/A", "Ukjent", "n/a") must be filtered out and stored as `null`.
- **Gemini Context**: The brand name should be included in the prompt sent to Gemini to aid in **category resolution**, but Gemini will **not** be responsible for returning or normalizing the brand field.

### 2. Image Prioritization & Quality
- **Strict Provider Priority**: Stick to the "Kassal-first" approach. If a product is found in Kassal.app, do not call Open Food Facts, even if Kassal lacks an image.
- **Thumbnail Quality**: When fetching from Open Food Facts, prefer `image_small_url` or `image_thumb_url` over the high-resolution `image_url` to optimize for mobile bandwidth and list-view performance.
- **No Image Validation**: The Edge Function will not verify the reachability of the image URL (no `HEAD` requests). Broken images will be handled by the client-side `onerror` fallback in Phase 20.

### 3. Cache Backfill Strategy
- **Activation-Date Safeguard**: To handle existing cache records that lack brand/image data, the Edge Function will trigger a fresh lookup if **both** `brand` and `image_url` are `null` **AND** the record's `provider_fetched_at` is older than the Phase 19 deployment date (e.g., `2026-03-14`).
- **One-Time Backfill**: Once a product is re-fetched and found to still have no data, the `provider_fetched_at` will be updated to the current timestamp, preventing further re-fetches until the 30-day TTL expires.

### 4. DTO & Schema Integration
- **BarcodeLookupDto**: Update to include `brand: string | null` and `imageUrl: string | null`.
- **BarcodeCacheRow**: Update to include `brand: string | null` and `image_url: string | null`.
- **Gemini Prompt**: Ensure the Gemini response schema remains focused on `itemName`, `canonicalCategory`, and `confidence`, explicitly excluding brand/image.

## Code Context

### Key Files
- `supabase/functions/barcode-lookup/index.ts`: The main entry point for the edge function lookup logic.
- `supabase/functions/_shared/barcode.ts`: Shared types and normalization utilities used by the edge function.
- `src/lib/barcode/lookup.ts`: Client-side DTO and mapping logic.

### Integration Points
- **Kassal API**: Requires an updated Bearer token (to be configured as an Edge Function secret).
- **Supabase Cache**: `barcode_product_cache` table must have the columns added in Phase 17 before this phase can be fully verified.

## Risk Mitigation
- **Infinite Re-fetch**: Mitigated by the "Activation Date" check in the cache read logic.
- **Cloudinary URL Rotation**: Handled by the 30-day TTL and client-side `onerror` fallbacks (deferred to Phase 20).
- **Gemini Latency**: Mitigated by keeping the brand/image flow outside of the Gemini request/response cycle.
