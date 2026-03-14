# Pitfalls Research

**Domain:** SvelteKit + Supabase PWA — adding barcode scanner improvement and product image/brand lookup to existing v2.0 family grocery app
**Researched:** 2026-03-14
**Confidence:** HIGH (iOS camera issues confirmed against WebKit bug tracker, STRICH KB, and multiple html5-qrcode GitHub issues; Kassal image URL format confirmed via kassal.app/api documentation; PostgreSQL ADD COLUMN lock behavior confirmed against Supabase official troubleshooting docs; Svelte 5 onerror timing confirmed against sveltejs/svelte#10352; layout shift prevention confirmed against web.dev CLS documentation)

---

## Critical Pitfalls

### Pitfall 1: iOS PWA Camera Black Screen — `playsinline` Applied Too Late

**What goes wrong:**
The existing `scanner.ts` sets `playsinline` on the `<video>` element *after* `startScanner` resolves — it queries the DOM for the video element and patches attributes after html5-qrcode has already started the stream. On iOS Safari in standalone PWA mode (home screen installed), the video stream starts playing without `playsinline`, Safari interprets the non-inline video as requiring fullscreen, fails to promote it to fullscreen automatically (PWA policy), and renders a black frame instead. The camera stream is running — the OS camera indicator light is on — but the preview is invisible.

**Why it happens:**
html5-qrcode inserts the `<video>` tag itself during `start()`. The `playsinline` patch in `startScanner` happens in the `.then()` continuation after `start()` resolves, but the first video frame may have already been rendered without the attribute. iOS requires `playsinline` on the element *before* the stream is bound to the video source. Developers testing in Safari on desktop or in Chrome on Android never reproduce this because those platforms don't enforce the same playsinline requirement in PWA mode.

**How to avoid:**
Use a `MutationObserver` on the scanner container element to intercept the `<video>` element the moment html5-qrcode inserts it — before the stream is attached. Set `playsinline`, `muted`, and `autoplay` attributes synchronously in the observer callback before `start()` even resolves. Alternatively, pre-populate the container with a dummy video element that already has these attributes before calling html5-qrcode's start; html5-qrcode will reuse an existing video element if one is already in the container in some configurations, though this is undocumented behavior.

A tested pattern:
```typescript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLVideoElement) {
        node.setAttribute('playsinline', 'true')
        node.setAttribute('muted', 'true')
        node.muted = true
        observer.disconnect()
      }
    }
  }
})
observer.observe(document.getElementById(elementId)!, { childList: true, subtree: true })
// then call html5Qrcode.start(...)
```

**Warning signs:**
- Camera light on device turns on (OS confirms stream is active) but scanner preview shows black
- Issue reproduces only on installed PWA (home screen), not when accessed via Safari URL bar
- `video.readyState` is 4 (HAVE_ENOUGH_DATA) but `video.videoWidth` is 0 in the browser console
- Issue affects iPhone but not Android Chrome

**Phase to address:** iOS scanner fix phase — this fix must be in the same phase as the black screen fix; it is the root cause, not a symptom.

---

### Pitfall 2: iOS PWA Camera Permission Re-Prompts Every Session

**What goes wrong:**
On iOS, camera permissions granted to a PWA (home screen app) do not persist across app launches the way they do in Safari tabs. WebKit bug 215884 (recurring permissions prompts in standalone mode) and bug 185448 (getUserMedia not working in home screen apps) remain open as of 2026. Users who install the app, grant camera permission once, and close and reopen the app will be prompted again on the next scan attempt. On some iOS versions (16.x), the permission prompt appears *multiple times within the same session* when the component unmounts and remounts (e.g., closing the scan sheet and reopening it).

**Why it happens:**
WebKit's PWA permission model treats standalone mode differently from browser mode. The origin-permission mapping used in Safari tabs is not shared with the home screen app context in the same way. Apple has not provided a guaranteed fix timeline. The current scanner implementation calls `startScanner` on every sheet open, which internally calls `getUserMedia` — this re-triggers the permission prompt on affected iOS versions.

**How to avoid:**
- Cache the `MediaStream` from the first successful `getUserMedia` call and reuse it across scanner sessions within the same app launch. Only call `getUserMedia` again if the cached stream has ended (`stream.active === false`).
- Keep the scanner container element alive in the DOM (hidden, not destroyed) between scans to avoid full teardown. Show/hide with CSS visibility rather than conditional rendering.
- Display explicit UI text warning users that iOS may ask for camera permission again and that this is expected behavior, not a bug in the app — reduces support confusion.
- Do not treat a new permission prompt as an error state. The current `onError` path showing "Kameratilgang er avslått" fires even when the user sees and dismisses (not denied, just dismissed) the prompt.

**Warning signs:**
- Camera permission prompt appears more than once during a shopping session
- `ScannerError` with `reason: 'permission-denied'` fires without the user ever explicitly denying access
- The issue affects users who report "scanner worked yesterday" — they are experiencing the per-launch re-prompt

**Phase to address:** iOS scanner fix phase — add stream caching and permission error UX distinction (dismissed vs. denied) in the same phase.

---

### Pitfall 3: Kassal CDN Image URLs Are Not Guaranteed to Be Stable

**What goes wrong:**
Kassal.app serves product images via Cloudinary CDN (`res.cloudinary.com/norgesgruppen/...`) and via `bilder.ngdata.no`. If the `image` field from the Kassal API response is stored directly in the `barcode_product_cache` table's `provider_payload` jsonb column (as it currently is), then displayed directly in the UI, users will see broken images when:
- Kassal rotates the Cloudinary version token in the URL (`v[timestamp]` segment changes)
- A product is reformulated and the supplier changes the product image
- Kassal changes CDN providers (they have done this at least once — `bilder.kassal.app` became `bilder.ngdata.no`)
- The image is copyright-restricted and Kassal removes it from the CDN

The app would then display broken image icons throughout the shopping list, scan result sheet, and Admin → Items — with no fallback and no mechanism to refresh.

**Why it happens:**
The `barcode_product_cache` has a 30-day TTL for found products. A URL that was valid on day 1 can be dead by day 30 without any cache invalidation. The current schema stores `provider_payload` as a jsonb blob — image URLs are buried inside it, not in a dedicated column — making it difficult to query and refresh them. Developers assume CDN URLs for commercial products are permanent, but Kassal's documentation explicitly states they do not own image rights and provides no stability guarantees.

**How to avoid:**
- Extract the `image_url` into a **dedicated nullable text column** in `barcode_product_cache` — do not rely on extracting it from `provider_payload` at runtime. This makes it queryable and independently refreshable.
- Do not store external Kassal image URLs directly in `household_item_memory` if you add an image column there. The memory table has no TTL — a URL stored 6 months ago is likely stale.
- Implement a background refresh edge function (or scheduled job) that queries `barcode_product_cache` rows where `expires_at` is approaching and re-fetches the Kassal product to refresh the image URL.
- In the UI, always render images with an `onerror` fallback to a local placeholder (see Pitfall 6 for the Svelte 5 `onerror` timing issue). Never show a broken `<img>` element.
- If long-term image stability is required, proxy and store images in Supabase Storage (private bucket, path: `product-images/{ean}.jpg`). This adds storage cost but eliminates CDN dependency.

**Warning signs:**
- Images display correctly immediately after scanning but break a few days later
- `provider_payload` jsonb contains `image` field URLs with version tokens like `v1234567890`
- No dedicated `image_url` column in the migration plan for `barcode_product_cache`

**Phase to address:** Product image storage phase — design the schema with a dedicated `image_url` column before writing any UI that reads images.

---

### Pitfall 4: Migration Adding Columns to `household_item_memory` With Live Data

**What goes wrong:**
`household_item_memory` is populated by a trigger on every `INSERT` and `UPDATE` to `list_items`. This table will have live rows for every active household at the time of the migration. When adding columns like `image_url` or `brand_name`:

1. **Adding `NOT NULL` without a default on a populated table** — PostgreSQL must rewrite the entire table (or add a constraint check on read for newer PG versions). On Supabase Free tier, this can hit the statement timeout limit and leave the migration in an inconsistent state.

2. **The trigger continues firing during migration** — if the migration is not transactional (e.g., if you add the column and separately update existing rows), the trigger can insert new rows between those steps with `NULL` for the new column while other rows have been backfilled. This creates a mixed state that breaks any `NOT NULL` constraint added afterward.

3. **Column backfill is not instant** — if you add `image_url` and then want to populate it from `barcode_product_cache` with an `UPDATE ... FROM ...`, that join can be slow on tables with thousands of rows and temporarily blocks reads on Supabase's Free tier due to lock escalation.

**Why it happens:**
Developers run migrations in development against an empty database (or a small seed dataset) where all of these operations are instantaneous. Production has real data, real concurrency, and tighter timeout limits. The trigger-driven population means the table is "always being written to" while the migration runs.

**How to avoid:**
- Add all new columns as `NULL` with no default in the migration. Never add `NOT NULL` to a new column on a populated live table in a single migration step.
- If a `NOT NULL` constraint is eventually needed, use the deferred approach: add `NULL`, backfill, then add the constraint in a separate migration after backfill is confirmed complete.
- For `image_url` and `brand_name` on `household_item_memory`: add them as `NULL`-able text columns. Accept that existing rows will have `NULL` until the next scan or item interaction naturally updates them via the trigger or a user-initiated scan.
- Do not attempt to backfill `household_item_memory` from `barcode_product_cache` in the same migration transaction. Run backfill as a separate, explicitly batched UPDATE if needed.
- Test migration against a production-sized local dataset before applying to production. Use `supabase db dump` to get a row count estimate.

**Warning signs:**
- Migration script adds `NOT NULL` to any column on `household_item_memory`, `list_items`, or `barcode_product_cache`
- Migration includes an `UPDATE ... SET image_url = ...` affecting the entire `household_item_memory` table
- Migration uses `ALTER TABLE ... ADD COLUMN image_url text NOT NULL DEFAULT ''` — a non-NULL default forces a full table rewrite in older PostgreSQL versions

**Phase to address:** Schema migration phase — must be designed with NULL-safe columns before any feature code references the new fields.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store Kassal image URL directly in `provider_payload` jsonb, parse at display time | No schema change needed | Image URL becomes a string-in-blob, impossible to query/refresh independently; every UI component must know the jsonb structure | Never — add a dedicated column |
| Use Kassal `image` URL directly in `<img src>` without fallback | Simple, no extra code | Broken images throughout the app when CDN URL rotates; no way to recover without a forced re-scan | Never in list views; acceptable in a temporary debug view |
| Skip stream caching, call `getUserMedia` on every sheet open | Simpler code | iOS re-permission prompt on every scan; users stop using scanner and enter EAN manually | Never — kills the feature's usefulness on iOS |
| Make `barcode_product_cache` accessible to authenticated users directly (drop `service_role` only restriction) | Simpler client queries | Users can query competitor product data, modify cache entries, or enumerate all scanned barcodes from other households | Never — keep cache restricted to `service_role` |
| Add `image_url` as `NOT NULL` with a default `''` in migration | Avoids NULL checks in Svelte | Full table rewrite on PostgreSQL; migration timeout on larger tables | Never for populated tables |
| Show Kassal image for all items in list view without size constraint | Easier layout | Layout shift on every list load; large images slow list scroll performance | Never — always fix dimensions |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Kassal API | Calling `https://kassal.app/api/v1/products/ean/{ean}` directly from client-side code | Always proxy through the `barcode-lookup` edge function — the API token must stay server-side; the edge function already handles this |
| Kassal API | Not handling HTTP 429 (rate limit) in the edge function | Add exponential backoff retry (max 2 retries) and return the cache hit if a 429 occurs mid-lookup; the 60 req/min limit can be hit during concurrent family scanning |
| Kassal API | Treating the `image` field as always present and always a valid URL | Field is nullable; some products have no image; some image URLs are CDN paths that return 403; validate and null-check before storing |
| html5-qrcode | Calling `scanner.stop()` and then `scanner.clear()` without checking `isScanning` | `stop()` throws if the scanner was never successfully started; the existing `stopScanner` guards with `isScanning ?? true` but this can still throw on iOS if the stream was never acquired; wrap in try/catch always |
| html5-qrcode | Initializing the `Html5Qrcode` instance with a container element ID that doesn't yet exist in the DOM | The element must be in the DOM before `new Html5Qrcode(elementId)` is called; if the dialog uses `display:none` instead of `visibility:hidden`, the element may not be measurable |
| Supabase edge function secrets | Hardcoding the `KASSAL_API_TOKEN` value directly in `index.ts` for testing | Token rotation requires redeployment; always use `Deno.env.get('KASSAL_API_TOKEN')` — it already does this, but do not introduce hardcoded fallbacks |
| Supabase `barcode_product_cache` | Querying this table from the client with an `authenticated` role | The table grants `select/insert/update/delete` to `service_role` only; authenticated clients will get an empty result (no error) due to RLS blocking — misleading behavior that looks like a cache miss |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Displaying Kassal images in list rows without fixed dimensions | List rows resize as images load; scroll position jumps; CLS score fails Core Web Vitals | Reserve exact space with fixed `width` and `height` attributes on `<img>` (or equivalent CSS `aspect-ratio`); use a gray placeholder background | Immediately on first load — even with 1 item in the list |
| Loading all product images in a long shopping list eagerly | Slow initial render; unnecessary bandwidth on mobile data (grocery store WiFi is often poor) | Add `loading="lazy"` to all `<img>` tags in list rows; only the visible viewport loads images | Shopping lists over ~10 items |
| Running image fetch (Kassal) AND Gemini enrichment serially on every cache miss | Scan-to-result latency can exceed 4-5 seconds on slow connections | Kassal fetch and Gemini call are already sequential in the edge function by design; if adding image storage to Supabase Storage (upload step), this adds more latency — consider making upload async, returning the lookup result immediately and uploading in background | Every cache miss scan |
| Storing brand name in `household_item_memory` and joining to it on every list query | Extra join on the hot shopping list read path | Keep `household_item_memory` additions additive and nullable; evaluate if brand is worth the join cost — it may be better to fetch from `barcode_product_cache` only on item detail view | Lists over 50 items, or families with many concurrent list subscriptions |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `barcode_product_cache` to `authenticated` role | Authenticated users could read product lookup history for all EANs (competitor price intelligence, purchase pattern inference) | Keep the table restricted to `service_role` only — the edge function handles all access |
| Storing Kassal API token in client-side code or environment variables accessible to the browser | Token is leaked in the bundle; can be used to exhaust the API quota | Always access via edge function secret (`KASSAL_API_TOKEN` in Supabase edge function environment) |
| Using a public Supabase Storage bucket for Kassal-proxied product images without path scoping | Any URL enumeration attack can list all product images | If storing to Supabase Storage, use a private bucket with RLS policies that do not require authentication for reads (since images are shown in list views) — or accept the small risk of a public bucket for non-sensitive product photos |
| Blindly storing any URL returned by Kassal as an `image_url` without validation | A compromised Kassal response could inject a URL pointing to an attacker-controlled server, tracking page loads | Validate that `image_url` starts with a known CDN prefix (`res.cloudinary.com/norgesgruppen`, `bilder.ngdata.no`, `bilder.kassal.app`) before storing; reject otherwise |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "Kameratilgang er avslått" when the iOS permission prompt was merely dismissed (not denied) | User thinks they explicitly denied access; does not understand they can try again | Distinguish between `NotAllowedError` where the user previously denied (show settings link) vs. a new prompt that was closed (show "Try again" with no alarm tone) |
| Spinning indefinitely during scan sheet open if camera permission is pending (iOS shows prompt above the sheet) | User sees a frozen loading state with no feedback for 10-15 seconds while interacting with the system prompt | Set a 10-second timeout on the `loading` state; if `startScanner` hasn't resolved by then, transition to `camera-failure` with a "Try again" option |
| Showing product image thumbnail immediately in the scan result before the image has loaded | Empty box flashes into image; layout shifts | Show a fixed-size placeholder (gray square with an icon) until the image `onload` fires; keep the same dimensions during transition |
| Displaying a broken image icon in shopping list rows | Broken images feel like app bugs, erode trust | Every `<img>` rendering a Kassal image must have an `onerror` handler that hides the image and shows the item's category icon instead |
| Not showing brand name alongside product name in the scan result | Users scan to confirm a product; brand is often the identifying information ("Q Meieriene" vs. generic) | Show brand name prominently in the scan result sheet even before the image loads; brand is available immediately from the lookup DTO |

---

## "Looks Done But Isn't" Checklist

- [ ] **iOS scanner fix:** Black screen appears fixed in Safari URL bar — verify it is also fixed in the *installed* home screen PWA; they are different code paths in WebKit
- [ ] **iOS scanner fix:** Permission error handling distinguishes "dismissed" from "denied" — verify by: dismissing the permission prompt on iOS and confirming the app shows "Prøv igjen" not "Kameraet er blokkert"
- [ ] **Image display:** Images display on the day of implementation — verify images also display 7 days later (check CDN URL stability) or that the fallback triggers correctly when they do not
- [ ] **Image display:** Images display in Safari mobile — verify with `crossorigin` attribute if Kassal CDN returns CORS headers; without it, `onerror` may not fire as expected on cross-origin failures in some Safari versions
- [ ] **Migration:** `ADD COLUMN` migration runs locally against an empty DB — verify it runs against a DB with at least 1000 rows in `household_item_memory` without timeout
- [ ] **Migration:** `household_item_memory` still populates correctly (trigger still fires) after schema change — verify by adding an item to a list and checking that memory is updated with the new nullable columns as `NULL` (not as an error)
- [ ] **Kassal cache:** `barcode_product_cache` stores `image_url` in the dedicated column — verify by querying the column directly after a scan; do not assume it is being populated because the scan result shows an image (it might be reading from `provider_payload`)
- [ ] **Rate limits:** Edge function handles Kassal 429 responses — verify by mocking a 429 response in the edge function test suite; the current test suite does not appear to cover this case
- [ ] **Fallback:** Open Food Facts fallback does not return an image — verify that the UI does not break (shows placeholder) when `image_url` is `NULL` because the lookup came from Open Food Facts or Gemini only

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CDN image URLs in cache are stale/broken | MEDIUM | Deploy a migration that nulls out `image_url` in `barcode_product_cache` for rows older than N days; trigger re-fetch on next scan (cache miss due to NULL image_url logic, or expire those rows) |
| Migration added `NOT NULL` column and timed out, leaving table locked | HIGH | Connect via Supabase SQL editor; check `pg_stat_activity` for blocking queries; `pg_terminate_backend` the migration process; restore from backup if table is in broken state; re-run migration with nullable column |
| Kassal API token expired and edge function returns 401 for all lookups | LOW | Update `KASSAL_API_TOKEN` secret in Supabase Dashboard → Edge Functions → Secrets; redeploy the function (or rely on Supabase hot-reloading secrets); cache will serve existing lookups during the gap |
| iOS users consistently get black screen after fix attempt | MEDIUM | Collect device/iOS version data; check if html5-qrcode has a newer release addressing the issue; consider replacing html5-qrcode with the native BarcodeDetector API (supported in iOS 17+ in Safari) as a progressive enhancement |
| Svelte 5 `onerror` doesn't fire on SSR-rendered img elements | LOW | Replace with inline `onerror` HTML attribute (non-Svelte event handler) for cross-origin image elements; this runs before Svelte hydrates and covers the SSR timing gap |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| iOS black screen — playsinline applied too late | iOS scanner fix (Phase 1 of milestone) | Test on a real iPhone in installed PWA mode; cannot verify in simulator |
| iOS permission re-prompt every session | iOS scanner fix (Phase 1 of milestone) | Close and reopen the PWA on iOS; confirm the camera opens without a new system prompt |
| Kassal CDN image URL instability | Product image storage design (Phase 2 of milestone) | Confirm `image_url` is in a dedicated column; confirm fallback renders when URL is NULL |
| Migration risks on live `household_item_memory` | Schema migration phase (before any feature code) | Run migration against a seeded DB with 1000+ rows; confirm no timeout; confirm trigger still fires |
| Layout shift from images in list view | Product image display phase (Phase 3 of milestone) | Measure CLS in Chrome Lighthouse; target 0; confirm fixed-size placeholders render before images |
| Kassal 429 rate limit during concurrent family scanning | Edge function improvement phase | Test with a mock returning 429; confirm the function returns cached data or degrades gracefully |
| Svelte 5 `onerror` timing on SSR-rendered images | Product image display phase (Phase 3 of milestone) | Load the shopping list page cold (hard refresh); confirm broken images show placeholder, not broken icon |
| Exposing `barcode_product_cache` to authenticated role | Schema migration phase | Verify via `supabase db diff` that no `GRANT SELECT ... TO authenticated` appears on that table |

---

## Sources

- [STRICH Knowledge Base — Camera Access Issues in iOS PWA/Home Screen Apps](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa)
- [WebKit Bug 185448 — getUserMedia not working in apps added to home screen](https://bugs.webkit.org/show_bug.cgi?id=185448)
- [WebKit Bug 215884 — getUserMedia recurring permissions prompts in standalone mode when hash changes](https://bugs.webkit.org/show_bug.cgi?id=215884)
- [WebKit Bug 252465 — In PWA, HTML Video Element may be unable to play stream from getUserMedia()](https://bugs.webkit.org/show_bug.cgi?id=252465)
- [html5-qrcode Issue #713 — Camera won't launch on iOS PWA](https://github.com/mebjas/html5-qrcode/issues/713)
- [html5-qrcode Issue #890 — iOS 17 Safari black screen after camera permission](https://github.com/mebjas/html5-qrcode/issues/890)
- [Kassal.app API Documentation](https://kassal.app/api) — rate limit (60 req/min), image URL format (Cloudinary CDN), copyright disclaimer
- [Svelte Issue #10352 — Svelte 5 onerror event not called on img element](https://github.com/sveltejs/svelte/issues/10352)
- [web.dev — Optimize Cumulative Layout Shift](https://web.dev/optimize-cls/)
- [Supabase Troubleshooting — Slow ALTER TABLE on Large Tables](https://supabase.com/docs/guides/troubleshooting/slow-execution-of-alter-table-on-large-table-when-changing-column-type-qmZRpZ)
- [Supabase GitHub Discussion — prisma db push timeout on Free Tier when altering larger table](https://github.com/orgs/supabase/discussions/39712)
- [SQLServerCentral — Nullable vs Non-Nullable and Adding Not Null Without Downtime in PostgreSQL](https://www.sqlservercentral.com/articles/nullable-vs-non-nullable-columns-and-adding-not-null-without-downtime-in-postgresql)

---
*Pitfalls research for: SvelteKit + Supabase PWA — barcode scanner improvement and product image/brand lookup (Milestone v2.0)*
*Researched: 2026-03-14*
