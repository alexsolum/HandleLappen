# Research: Phase 19 - Edge Function and DTO Enrichment

## Standard Stack
- **Supabase Edge Functions**: Deno-based runtime for secure, low-latency API proxying.
- **Kassal.app API v1**: Primary provider for Norwegian grocery data.
- **Open Food Facts API v2**: Secondary fallback provider with rich image metadata.
- **Web Streams API**: Recommended for binary data, though Phase 19 primarily handles URL pass-through.
- **TypeScript**: Shared types between Edge Functions and SvelteKit client.

## Architecture Patterns

### 1. Kassal-First Enrichment
Stick to the existing hierarchy:
1.  **Kassal.app**: Primary source. If found, we stop (even if image/brand is missing).
2.  **Open Food Facts**: Fallback source if Kassal returns no usable product.
3.  **Gemini**: Final "cleanup" pass for name normalization and category resolution (bypassed for brand/image).

### 2. DTO & Cache Schema
Enrich both the database cache and the client DTO with two new fields:
- `brand`: Raw string from provider (e.g., "Gilde").
- `image_url`: Full URL to a web-optimized thumbnail (e.g., Kassal's medium image or OFF's small image).

### 3. Smart Cache Backfill
To update existing cache entries without a massive migration:
- **Condition**: Re-fetch from providers if `(brand is null OR image_url is null)` AND `provider_fetched_at < '2026-03-14'`.
- **Throttling**: Once re-fetched, `provider_fetched_at` is updated to the current timestamp even if data is still missing, preventing infinite retry loops.

## Don't Hand-Roll

### 1. Image Validation
Do **not** perform `HEAD` or `GET` requests from the Edge Function to verify if image URLs are valid. This adds latency and cost.
- **Solution**: Rely on the client-side `onerror` handler in Phase 20 to provide a fallback icon.

### 2. Brand Normalization
Do **not** use Gemini to "clean up" brand names (e.g., "Tine SA" -> "Tine"). The cost/benefit ratio for LLM normalization of brands is too high.
- **Solution**: Use simple string trimming and a basic "junk filter" (see below).

### 3. Cloudinary Token Management
Do **not** attempt to calculate or sign Cloudinary URLs.
- **Solution**: Store the URL exactly as provided by Kassal.app. If the URL expires (rare but possible), the 30-day TTL in the cache will eventually trigger a fresh lookup.

## Common Pitfalls

### 1. Kassal API Array Response
The `/api/v1/products/ean/{ean}` endpoint returns a `data` object containing a `products` array.
- **Pitfall**: Current `extractKassalProduct` logic might fail if it doesn't correctly traverse `data.products[0]`.
- **Fix**: Use optional chaining and explicit array index checks.

### 2. Open Food Facts Image Localization
OFF provides multiple image sizes and localized versions.
- **Pitfall**: Using `image_url` (too large) or missing the Norwegian packaging.
- **Fix**: Prefer `image_front_no_small_url` (Norwegian front, ~400px), then `image_small_url`, then `image_thumb_url`.

### 3. Gemini Token Bloat
Sending long image URLs to Gemini increases token usage for no gain.
- **Fix**: The Gemini prompt must exclude `imageUrl` and explicitly instruct Gemini NOT to return a brand field.

### 4. Junk Brands
Providers often return placeholders like "None", "n/a", or "Ukjent".
- **Fix**: Implement a `isJunkBrand` utility to convert these to `null` before caching.

## Code Examples

### Robust Kassal Extraction
```typescript
function extractKassalProduct(payload: unknown): KassalProduct | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as any;
  
  // New v1 API structure: data.products[0]
  if (record.data?.products?.[0]) {
    return record.data.products[0];
  }
  
  // Fallback for older/alternate structures
  return record.product || (Array.isArray(record.data) ? record.data[0] : record);
}
```

### Junk Brand Filter
```typescript
const JUNK_BRANDS = new Set(['none', 'n/a', 'na', 'ukjent', 'null', 'undefined', '-']);

function filterBrand(brand: string | null): string | null {
  if (!brand) return null;
  const clean = brand.trim();
  if (JUNK_BRANDS.has(clean.toLowerCase())) return null;
  return clean;
}
```

### OFF Image Selection
```typescript
function getOFFImage(product: any): string | null {
  return (
    product.image_front_no_small_url || 
    product.image_front_small_url || 
    product.image_small_url ||
    product.image_thumb_url ||
    null
  );
}
```

### Cache Backfill Logic
```typescript
const ACTIVATION_DATE = '2026-03-14T00:00:00Z';

async function readCache(ean: string) {
  const { data } = await admin.from('barcode_product_cache').select('*').eq('ean', ean).maybeSingle();
  if (!data) return null;

  const needsBackfill = 
    (data.brand === null || data.image_url === null) && 
    (data.provider_fetched_at < ACTIVATION_DATE);

  if (needsBackfill) return null; // Force a fresh lookup
  return data;
}
```
