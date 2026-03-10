# Phase 04 Research: Barcode Scanning

**Researched:** 2026-03-10  
**Question:** What do I need to know to PLAN this phase well?

## Bottom Line

Plan this phase as one server-backed barcode workflow with three distinct layers:

1. A mobile-first scanner sheet in the list page.
2. A single Supabase Edge Function that owns lookup, fallback, AI enrichment, caching, and security.
3. A normalized result model that stores a canonical category label, then maps that label to the household's own categories before add-to-list.

The biggest planning mistake would be treating this as "just a camera feature". The risk is actually in:

- iOS Safari / installed PWA camera behavior
- provider auth and rate limits
- AI output normalization
- cache design across households
- validation on real devices

## Repo-Specific Context That Matters

- The list page already has the right extension point: [`src/routes/(protected)/lister/[id]/+page.svelte`](C:\Users\HP\Documents\Koding\HandleAppen\src\routes\(protected)\lister\[id]\+page.svelte).
- The UI pattern is already bottom-sheet driven, matching the phase context.
- Items are inserted directly into `list_items`, with category assignment handled separately today.
- Categories are household-specific, and store layouts are per-store overrides.
- Supabase Edge Functions are already the intended backend boundary for third-party calls.

Planning implication: the barcode cache must not store a household `category_id` as the canonical output. It should store a canonical category label/key, then map that to the current household category row at runtime.

## Standard Stack

- Scanner: `html5-qrcode` low-level API (`Html5Qrcode`), not its stock UI.
- Camera API: `navigator.mediaDevices.getUserMedia()` with `playsinline`, `muted`, explicit cleanup, and manual EAN fallback always available.
- Browser support strategy: feature-detect camera support; do not rely on native `BarcodeDetector` alone.
- Backend boundary: Supabase Edge Function invoked via `supabase.functions.invoke(...)`.
- Secrets: Supabase project secrets for Kassal and Gemini credentials.
- AI normalization: Gemini structured output with a strict JSON schema.
- Persistence: Postgres cache table for normalized barcode results plus optional raw provider payload storage.

## Architecture Patterns

### 1. Keep one lookup path

Both camera scan and manual EAN entry should call the same server function:

- input: `ean`, optional `listId`
- output: normalized `{ ean, itemName, canonicalCategory, confidence, source, found }`

Do not create separate "camera lookup" and "manual lookup" backends.

### 2. Use server-side orchestration only

The browser should never call Kassal, Open Food Facts, or Gemini directly. The Edge Function should:

1. Validate auth and input barcode.
2. Check cache.
3. Query Kassal first.
4. Query Open Food Facts only if Kassal is empty or insufficient.
5. Build one merged provider payload.
6. Pass that payload to Gemini for final name/category extraction.
7. Persist normalized result.
8. Return a small safe DTO to the client.

### 3. Model categories in two steps

Recommended split:

- `canonicalCategory`: fixed internal label/key such as `meieri_og_egg`, `drikke`, `snacks_og_godteri`
- `householdCategoryId`: resolved after lookup by matching the household's categories

This avoids poisoning the cache with household-specific IDs and keeps cached results reusable across users and devices.

### 4. Treat the confirm sheet as the state boundary

The scanner should stop as soon as it gets one valid code and transition into:

- loading state
- found / prefilled state
- not found state
- manual EAN retry state

Do not keep the live camera running behind the confirm sheet.

## Recommended Data Model

Minimum useful cache table:

```sql
create table public.barcode_product_cache (
  ean text primary key,
  normalized_name text,
  canonical_category text,
  confidence numeric,
  source text not null, -- kassal | off | kassal+off | gemini
  status text not null, -- found | not_found | failed
  provider_payload jsonb,
  provider_fetched_at timestamptz,
  ai_enriched_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Planning notes:

- Cache negative lookups too, with a short TTL.
- Keep provider payload server-side only.
- `provider_payload` is useful for debugging and future re-enrichment.
- `expires_at` should allow refresh without changing the client contract.

Inference: normalize cache keys to digits-only, and consider converting UPC-A to a canonical 13-digit form while retaining the raw scanned value for audit/debug.

## Provider Lookup Path

### Kassal.app primary

Kassal has a dedicated EAN endpoint and explicit API-key auth:

- endpoint: `/api/v1/products/ean/{ean}`
- auth: Bearer token
- default rate limit: 60 calls/minute

This should be the primary source because the app is Norway-first and Kassal has the most relevant product coverage.

### Open Food Facts fallback

Open Food Facts should be used only when Kassal misses or returns too little usable data.

Important planning constraints:

- read requests do not require auth, but do require a custom `User-Agent`
- read-product rate limit is 100 req/min
- OFF data is community-maintained and explicitly not guaranteed to be complete or reliable

Planning implication: OFF is a resilience source, not a trust anchor.

### Gemini enrichment

Gemini should receive the merged provider payload and return structured JSON like:

```json
{
  "itemName": "Pepsi Max",
  "canonicalCategory": "drikke",
  "confidence": 0.92,
  "reason": "..."
}
```

Use structured output, not prompt-parsed free text. The schema should restrict category values to your internal category enum.

Recommended rule:

- Every cache miss goes through Gemini once.
- Cached results are reused afterward.

That satisfies BARC-03 without paying the AI cost repeatedly.

## Scanner UI And iOS Safari / PWA Behavior

### What is stable enough

- `getUserMedia()` is the correct camera API.
- It requires a secure context.
- The scanner must be opened from explicit user interaction.

### What is not stable enough

- Native `BarcodeDetector` is still marked experimental by MDN.
- Current support tables still show Safari / iOS Safari as disabled by default.
- There are still open WebKit bugs for installed PWA camera failures in standalone mode.

Planning implication: do not design Phase 04 around native `BarcodeDetector`.

### Recommended scanner behavior

- Open scanner from a dedicated action near `ItemInput`.
- Render a custom sheet / overlay that matches existing bottom-sheet patterns.
- Use a low-level scanner library with fallback behavior (`html5-qrcode`) instead of building decode loops manually.
- Restrict formats to retail barcodes only: `EAN_13`, `EAN_8`, `UPC_A`, `UPC_E`.
- Lock on first valid read.
- Stop tracks immediately on success, close, route change, `visibilitychange`, and sheet dismiss.
- Always expose a visible "Skriv EAN manuelt" fallback.

### iOS-specific hardening

- `<video autoplay muted playsinline>`
- request `facingMode: { ideal: 'environment' }`
- surface clear recovery if permission is denied
- surface clear recovery if camera opens but stream fails
- expect standalone PWA camera issues on some devices even when Safari-in-browser works

Because of the open WebKit bugs, manual EAN entry is not just a nice fallback. It is required for a reliable v1.

## Caching Strategy

Recommended cache policy:

- Cache successful normalized results aggressively.
- Cache not-found results with a shorter TTL.
- Refresh stale rows asynchronously or on next request after expiry.
- Never re-hit Gemini if the cache is still fresh.

Suggested TTLs:

- found result: 30-90 days
- not found: 1-7 days

Reasoning:

- product identity changes rarely
- category inference changes rarely
- provider availability and data completeness may improve later

Avoid caching these client-side as the source of truth. Browser memory/session state is fine for current-screen UX, but the durable cache belongs in Postgres behind the Edge Function.

## Security Concerns

### Secrets and backend boundary

- Kassal Bearer token must stay server-side.
- Gemini key must stay server-side.
- Store both in Supabase secrets and read them via environment variables.

### Auth and abuse

- Keep JWT verification enabled for the function.
- Build the Supabase client inside the function using the request `Authorization` header so auth context is preserved.
- Add app-level rate limiting per user/session to avoid burning paid provider/API quota.

### Data minimization

- Return only normalized fields the UI needs.
- Do not send raw provider payloads to the client.
- Avoid storing or returning product images in this phase unless needed; Kassal notes image rights can be copyrighted.

### Prompt safety

- Do not feed raw provider JSON directly into an unconstrained prompt.
- Build a narrow Gemini input object from selected fields.
- Validate the model output against schema and category enum before use.
- If Gemini fails validation, return deterministic fallback values instead of raw model text.

## Don't Hand-Roll

- Do not hand-roll barcode frame capture and decoding loops.
- Do not hand-roll free-text AI parsing.
- Do not store household `category_id` in the shared barcode cache.
- Do not expose provider-specific failure states in the customer UI.
- Do not treat native `BarcodeDetector` as the main implementation path.

## Common Pitfalls

- Shipping a scanner that works in desktop Chrome and Android, but not reliably in iOS standalone mode.
- Forgetting to stop camera tracks when the sheet closes or the page hides.
- Re-querying providers and Gemini on every scan because no durable cache exists.
- Assuming OFF categories map cleanly to your household categories.
- Letting the provider response shape leak into the UI contract.
- Logging raw provider or AI payloads too aggressively.
- Returning provider-specific "Kassal failed / OFF failed" states instead of one user-facing not-found state.

## Test Strategy

Use three layers, because no single layer will cover this phase well.

### 1. Function-level contract tests

Test pure logic around:

- barcode normalization
- provider merge rules
- category mapping
- Gemini schema validation
- cache hit / miss / stale logic

This is the highest-value automation for the phase.

### 2. Browser E2E tests

Use Playwright for:

- opening the scanner flow
- permission denied -> manual EAN fallback
- manual EAN success -> confirm sheet -> add item
- not-found -> unified result state
- happy path with mocked lookup response

Do not depend on real camera access in CI.

### 3. Manual device validation

This phase requires real-device verification.

Minimum matrix:

- iPhone in Safari
- iPhone installed PWA standalone mode
- Android Chrome

Manual checks:

- first permission request
- repeat open/close
- scan success
- scan cancel
- permission denied
- stream failure
- manual EAN fallback
- sheet close / reopen
- background app -> resume

## Validation Architecture

Treat validation as a formal part of the phase plan, not a final afterthought.

Recommended gates:

1. Compile/type gate for app + function code.
2. Function contract tests with mocked upstreams.
3. Playwright flow tests with mocked scan/lookup.
4. Manual UAT on physical iPhone Safari and installed PWA.
5. Final verification that BARC-01 through BARC-04 are each explicitly demonstrated.

The manual gate matters most for this phase because the main risk is browser/device behavior, not just application logic.

## Planning Implications

The cleanest plan split is probably:

### Plan A: Backend lookup foundation

- schema for cache
- Edge Function
- Kassal + OFF merge
- Gemini normalization
- auth, secrets, rate limiting

### Plan B: Scanner and confirm UX

- scan trigger in list page
- scanner sheet
- manual EAN fallback
- result sheet
- final add-to-list integration

### Plan C: Hardening and validation

- cache refinement
- failure/retry states
- Playwright coverage
- physical-device validation checklist
- iOS standalone cleanup fixes

## Open Questions To Resolve During Planning

- Will you create the barcode cache in Phase 04 now, even though PERF-V2-01 is officially a v2 requirement? Recommendation: yes, because it materially reduces provider cost and complexity for BARC.
- Will Gemini run on every cache miss, or only when deterministic mapping is weak? Recommendation: every cache miss for v1, then cache the result.
- Will canonical categories be a fixed enum or a free-text label? Recommendation: fixed enum.
- Do you want negative-cache TTL to be short enough that newly indexed products become discoverable soon? Recommendation: yes.

## Sources

- Kassal API docs: https://kassal.app/api
- Open Food Facts API docs: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- MDN `BarcodeDetector`: https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- Can I use `BarcodeDetector`: https://caniuse.com/mdn-api_barcodedetector_barcodedetector
- MDN `getUserMedia()`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase function CORS guidance: https://supabase.com/docs/guides/functions/cors
- Supabase functions + secrets CLI docs: https://supabase.com/docs/reference/cli/supabase-encryption-get-root-key
- Supabase auth context in Edge Functions: https://supabase.com/docs/guides/functions/auth-legacy-jwt
- html5-qrcode docs: https://scanapp.org/html5-qrcode-docs/
- html5-qrcode supported formats: https://scanapp.org/html5-qrcode-docs/docs/supported_code_formats
- WebKit bug 273938: https://bugs.webkit.org/show_bug.cgi?id=273938
- WebKit bug 282327: https://bugs.webkit.org/show_bug.cgi?id=282327
