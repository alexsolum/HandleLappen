# Stack Research

**Domain:** Family grocery shopping PWA with Supabase backend
**Researched:** 2026-03-13 (updated for v1.2); updated 2026-03-14 for v2.0; updated 2026-03-28 for v2.2
**Confidence:** HIGH (v1.2 sections); MEDIUM (v2.0 sections — iOS workarounds from community reports; Kassal API from official docs); HIGH (v2.2 sections — browser APIs and PostGIS from official docs; Leaflet SSR pattern from multiple consistent community sources)

---

## Existing Stack (validated, do not re-research)

| Package | Version in package.json | Status |
|---------|------------------------|--------|
| `@sveltejs/kit` | ^2.50.2 | Validated |
| `svelte` | ^5.51.0 | Validated, Svelte 5 runes in use |
| `tailwindcss` + `@tailwindcss/vite` | ^4.2.1 | Tailwind v4, no config file |
| `@supabase/supabase-js` | ^2.98.0 | Validated |
| `@supabase/ssr` | ^0.9.0 | Validated |
| `@tanstack/svelte-query` | ^6.1.0 | Validated |
| `idb-keyval` | ^6.2.2 | Validated |
| `@vite-pwa/sveltekit` | ^1.1.0 | Validated |
| `svelte-dnd-action` | ^0.9.69 | Validated |
| `html5-qrcode` | ^2.3.8 | Validated (barcode scanning) — **being replaced in v2.0** |

---

## v2.2 New Capabilities: Stack Analysis

**Researched:** 2026-03-28

This section covers only the four new technical surfaces in v2.2: continuous geolocation watching, geofence detection, map widget for admin store pin placement, and reverse geocoding for address-based store entry.

---

### Summary of New Packages

| Package | Add/Remove | Reason |
|---------|-----------|--------|
| `leaflet` | **ADD** (prod dep) | Map widget for admin pin placement |
| `@types/leaflet` | **ADD** (dev dep) | TypeScript types for Leaflet |
| No other packages | — | Geolocation, geofencing, and reverse geocoding are handled by browser APIs, PostGIS (existing Supabase), and direct `fetch` calls |

```bash
npm install leaflet
npm install -D @types/leaflet
```

---

### 1. Continuous Geolocation: Browser API Only

**Verdict: Zero new npm packages.**

Use `navigator.geolocation.watchPosition` directly. This is a 15-line native implementation and is the correct level of abstraction for this use case.

**Why not `svelte-geolocation` (metonym/svelte-geolocation v1.0.0):**
- Last published July 2024; Svelte 5 rune compatibility is not confirmed in documentation or changelog
- The API it wraps is simple enough that the wrapper saves no meaningful code
- Avoiding it eliminates a low-maintenance dependency risk

**Implementation pattern (Svelte 5 runes):**

```typescript
// src/lib/location.svelte.ts
let coords = $state<GeolocationCoordinates | null>(null);
let watchId: number | null = null;

export const geolocation = {
  get coords() { return coords; },

  start() {
    if (!navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(
      (pos) => { coords = pos.coords; },
      (err) => { console.warn('Geolocation error', err); },
      {
        enableHighAccuracy: true,   // GPS, not cell-tower; needed for 100m geofence
        maximumAge: 10_000,         // Accept cached position up to 10s old
        timeout: 15_000             // Give up after 15s if no fix
      }
    );
  },

  stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }
};
```

**Battery drain mitigation:** `enableHighAccuracy: true` is required for reliable 100m geofence detection but does activate GPS hardware. Mitigate by calling `geolocation.stop()` when the app is backgrounded (use `visibilitychange` event) and `geolocation.start()` on foreground return. Do not watch continuously while at home.

**PWA / mobile browser support:** `watchPosition` works in PWA standalone mode on both iOS Safari (14+) and Android Chrome. Permission must be granted once by the user. iOS Safari does not persist permission across PWA sessions (WebKit limitation, no workaround). The UI must handle re-prompting gracefully.

---

### 2. Geofence Detection: Supabase PostGIS

**Verdict: Enable the PostGIS extension in the Supabase dashboard. Zero new npm packages.**

PostGIS is already included in every Supabase project — it only needs to be enabled. Using it keeps all spatial logic server-side, avoids client-side math, and leverages Supabase's existing spatial index capability.

**Why not client-side Haversine formula:**
- Works, but runs JS on every GPS position update
- Requires fetching all household store coordinates to the client on every session
- Harder to test; easier to get the coordinate-order (lat/lng vs lng/lat) wrong
- PostGIS `ST_DWithin` with a geography column is purpose-built for this and is trivially correct

**Enabling PostGIS:** Dashboard → Database → Extensions → search "postgis" → enable. Choose the `extensions` schema (default).

**Migration steps:**

```sql
-- 1. Add geography column to stores table
ALTER TABLE stores
  ADD COLUMN location geography(POINT, 4326);

-- 2. Spatial index for proximity queries
CREATE INDEX stores_location_gist_idx ON stores USING GIST (location);

-- 3. RPC function for geofence check
CREATE OR REPLACE FUNCTION stores_near_point(
  lat double precision,
  lng double precision,
  radius_m double precision DEFAULT 100
)
RETURNS SETOF stores
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM stores
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_m
  );
$$;
```

**Client call pattern:**

```typescript
// In the geolocation $effect — called when coords change
const { data: nearbyStores } = await supabase.rpc('stores_near_point', {
  lat: coords.latitude,
  lng: coords.longitude,
  radius_m: 100
});
```

**Integration with TanStack Query:** The geofence check is a side effect of position change, not a user-initiated query. Use a Svelte 5 `$effect` that watches `geolocation.coords` and calls the RPC directly. Do not wrap in `useQuery` — this is a reactive event loop, not a cache-keyed request.

---

### 3. Map Widget for Admin Store Pin Placement: Leaflet 1.9.4

**Recommendation: `leaflet@^1.9.4` with raw dynamic import inside `onMount`. No Svelte wrapper.**

**Version:** 1.9.4 is the current stable release (confirmed on npm). Leaflet 2.0.0-alpha.1 was released August 2025 but is not production-ready — it removes the `L` global and requires a module system rewrite, breaking existing 1.x patterns.

**Why Leaflet over alternatives:**
- No API key required (tiles served from `tile.openstreetmap.org`)
- ~42 KB gzipped — smallest viable interactive map for this use case
- Mature SSR workaround for SvelteKit is well-documented and consistent across community sources
- The admin map is low-complexity: display a tile map, allow a single marker drag/place, emit coordinates

**Why not a Svelte wrapper library (`sveaflet`, `svelte-leafletjs`):**
- `sveaflet` is at v0.1.4, last published ~May 2025; Svelte 5 compatibility is stated but the package has minimal adoption and activity
- The SSR problem (Leaflet needs `window`) is solved by the same `onMount + dynamic import` pattern regardless of wrapper
- A wrapper adds abstraction that makes it harder to control marker lifecycle precisely
- Raw Leaflet is 30 lines of component code — the wrapper saves nothing meaningful

**SvelteKit SSR integration pattern:**

```typescript
// src/lib/components/StoreMapPicker.svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';

  let { lat = 59.91, lng = 10.75, onPinMoved } = $props<{
    lat?: number;
    lng?: number;
    onPinMoved: (lat: number, lng: number) => void;
  }>();

  let container: HTMLDivElement;
  let map: any; // Leaflet types via @types/leaflet but loaded dynamically

  onMount(async () => {
    if (!browser) return;
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    map = L.map(container).setView([lat, lng], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onPinMoved(pos.lat, pos.lng);
    });

    map.on('click', (e: any) => {
      marker.setLatLng(e.latlng);
      onPinMoved(e.latlng.lat, e.latlng.lng);
    });
  });

  onDestroy(() => {
    map?.remove();
  });
</script>

<div bind:this={container} class="h-64 w-full rounded-lg" />
```

**OSM tile usage policy:** The tile policy at `tile.openstreetmap.org` permits normal interactive viewing by humans. It prohibits bulk prefetching for offline use. The admin map widget is online-only (admin flow) — no service worker tile caching needed. Exclude `tile.openstreetmap.org` from the existing service worker precache config.

**Default map center:** Oslo (59.91°N, 10.75°E) is a reasonable default for Norway. The component accepts `lat`/`lng` props to center on an existing store location when editing.

---

### 4. Reverse Geocoding: Nominatim (OpenStreetMap) via Direct Fetch

**Verdict: Zero new npm packages. Call Nominatim directly via `fetch`.**

Nominatim is the geocoding engine behind openstreetmap.org. Norwegian address coverage in Nominatim is thorough for city and town addresses (confirmed by OSM Norway community data quality). The example in Nominatim's own reverse API docs includes a Norwegian address (`Løvenbergvegen, Ullensaker, Akershus, Norway`).

**Use case scope:** Reverse geocoding is called only when an admin user places a pin on the map and wants to see a human-readable address for confirmation — one call per pin placement. The 1 req/sec rate limit is never approached.

**API call pattern:**

```typescript
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    {
      headers: {
        // Required by Nominatim usage policy — identifies the application
        'User-Agent': 'HandleAppen/2.2 (family grocery PWA; contact@example.com)'
      }
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.display_name ?? null;
}
```

**Rate limit:** Maximum 1 request per second across all users of the application. The admin flow is single-user triggered and very low frequency — this is never a concern in practice.

**Nominatim usage policy compliance requirements:**
- Include a valid `User-Agent` header identifying the application (shown above)
- Do not implement autocomplete using Nominatim (not applicable here)
- Cache results where possible (the coordinates are saved to Supabase immediately; no repeat lookups)

**Fallback if Nominatim quality is insufficient for rural Norwegian addresses:**
Use Kartverket's free Norwegian geocoding API: `https://ws.geonorge.no/adresser/v1/punktsok?lat={lat}&lon={lng}&radius=100&utkoordsys=4326`. This is Norwegian government data with no rate limit and superior rural coverage. Switch to Kartverket if users report bad address results.

**Why not Google Geocoding API:** Requires API key, has usage billing, adds credential management overhead. Not justified for a low-frequency admin UI action.

---

### v2.2 Package Changes

```bash
# Add map widget dependencies only
npm install leaflet
npm install -D @types/leaflet

# No other additions. Geolocation uses browser API directly.
# Geofencing uses PostGIS via existing supabase.rpc().
# Reverse geocoding uses fetch() directly against Nominatim.
```

**PostGIS:** Enable in Supabase dashboard (no npm change). Add migration for `location` column and `stores_near_point` RPC function.

---

### v2.2 Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Raw Leaflet 1.9.4 + `onMount` dynamic import | Google Maps JS API | If the project already has a Google Cloud billing account and needs Street View, routing, or high-volume geocoding — adds API key management and cost |
| Raw Leaflet 1.9.4 + `onMount` dynamic import | Mapbox GL JS | If vector tiles or custom branded map styles are needed — overkill for a single-marker admin widget |
| Raw Leaflet 1.9.4 + `onMount` dynamic import | Leaflet 2.0 (when stable) | Upgrade when 2.0 reaches a stable release — removes the `L` global, improves tree-shaking; not ready as of March 2026 |
| Nominatim (OSM) via `fetch` | Kartverket `ws.geonorge.no` | If Nominatim quality proves insufficient for Norwegian rural addresses — Kartverket has no rate limit and government-grade precision |
| Nominatim (OSM) via `fetch` | Google Geocoding API | Only if Kartverket also fails and volume is still trivial — last resort; adds billing |
| PostGIS `ST_DWithin` via Supabase RPC | Client-side Haversine formula | If PostGIS cannot be enabled (e.g., Supabase project plan restriction) — functional fallback, adds ~15 lines of TS math |
| Browser `navigator.geolocation.watchPosition` (raw) | `svelte-geolocation` wrapper | If Svelte 5 compatibility is confirmed and the team prefers declarative component syntax |

---

### What NOT to Add for v2.2

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `svelte-geolocation` | v1.0.0 last published July 2024; Svelte 5 rune compatibility unconfirmed; wraps 15 lines of native API | `navigator.geolocation.watchPosition` directly in a `$effect` |
| `sveaflet` or `svelte-leafletjs` wrapper | Low activity; thin abstraction that does not solve the SSR problem; raw Leaflet inside `onMount` is the same code volume with no wrapper risk | Raw `leaflet` + dynamic import inside `onMount` |
| Google Maps JS API | API key required, billing, ~250 KB SDK for a feature used only in admin | `leaflet@^1.9.4` with OSM tiles |
| Leaflet 2.0-alpha | Not production-stable; breaking changes to module system and `L` global; no stable release as of March 2026 | `leaflet@^1.9.4` stable |
| Mapbox GL JS | Requires API token, commercial licensing thresholds above free tier, higher bundle cost | Leaflet for simple single-marker admin use |
| Client-side Haversine geofence loop | Runs JS math on every GPS update; requires all store coords to be loaded client-side; harder to test | PostGIS `ST_DWithin` via `supabase.rpc()` |
| Prefetching OSM tiles into the service worker | Violates OSM tile usage policy (bulk prefetch prohibited at `tile.openstreetmap.org`) | Exclude tile CDN from SW precache; map widget is online-only in admin |
| Any paid geocoding API for initial launch | Rate is 1 call per admin action; Nominatim is free, no key required, and sufficient for Norway | Nominatim via direct `fetch`; Kartverket as fallback |

---

### v2.2 Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `leaflet@^1.9.4` | `@types/leaflet@^1.9.21` | Types cover the full 1.x stable API; do not install `@types/leaflet` 2.x types against Leaflet 1.x |
| `leaflet@^1.9.4` | `svelte@^5.51.0` + `@sveltejs/kit@^2.50.2` | No native compatibility issue; SSR isolation handled by `onMount` + dynamic import pattern |
| `leaflet@^1.9.4` | `vite@^7.3.1` | Vite handles the CSS import (`leaflet/dist/leaflet.css`) via dynamic import without additional config |
| PostGIS extension | `@supabase/supabase-js@^2.98.0` | `supabase.rpc('stores_near_point', {...})` works with the existing client; no client-side changes beyond the RPC call |

---

### v2.2 Sources

- [Supabase PostGIS docs](https://supabase.com/docs/guides/database/extensions/postgis) — ST_DWithin, geography column, spatial index, rpc() pattern (HIGH confidence)
- [MDN Geolocation API — watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition) — options, PWA compatibility, clearWatch (HIGH confidence)
- [Nominatim Reverse API docs](https://nominatim.org/release-docs/latest/api/Reverse/) — endpoint, params, response, Norwegian address example (HIGH confidence)
- [OSM Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) — 1 req/sec max, User-Agent requirement (HIGH confidence)
- [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) — bulk prefetch prohibition, normal interactive viewing permitted (HIGH confidence)
- [leaflet npm](https://www.npmjs.com/package/leaflet) — v1.9.4 current stable confirmed (HIGH confidence)
- [Leaflet 2.0 Alpha announcement](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html) — alpha status, breaking changes to module system (MEDIUM confidence — post-cutoff)
- [Khromov: Using Leaflet with SvelteKit](https://khromov.se/using-leaflet-with-sveltekit/) — dynamic import + onMount SSR pattern (MEDIUM confidence — consistent with multiple community sources)
- [svelte-geolocation GitHub](https://github.com/metonym/svelte-geolocation) — v1.0.0 July 2024, Svelte 5 compatibility unconfirmed (LOW confidence on Svelte 5 support)
- [sveaflet npm](https://www.npmjs.com/package/sveaflet) — v0.1.4 last published ~May 2025 (MEDIUM confidence on stability)

---

## v2.0 New Capabilities: Stack Analysis

**Researched:** 2026-03-14

### Problem Diagnosis: iOS Black Screen in html5-qrcode

The existing `html5-qrcode` scanner has known, persistent black screen failures on iOS Safari. Issue tracker analysis (GitHub issues #890, #822, #895, #951) reveals these root causes:

1. **iOS 17+ auto-fullscreen bug**: iOS Safari enters fullscreen mode automatically when a video element plays inline, producing a black display even though the camera feed is running. Scanning continues in the background but nothing is visible to the user.

2. **Missing video element attributes at attachment time**: Without `playsinline`, `muted`, and `autoplay` set *before* the stream is assigned to `video.srcObject`, iOS refuses to render the video inline. `html5-qrcode` sets `playsinline` via `setAttribute` *after* calling `start()` — too late on some iOS versions.

3. **PWA camera permission non-persistence**: iOS PWAs do not persist camera permission between sessions. Every app open requires re-prompting. This is a WebKit limitation (bug #185448) with no library workaround.

4. **`html5-qrcode` is not receiving iOS fixes**: Latest release is v2.3.8 (April 15, 2025) but iOS-specific camera init bugs remain unresolved in the issue tracker. The underlying ZXing-js engine is also in maintenance mode (security-only patches accepted).

**Root fix:** The `<video>` element must be created and attributed by the app before any stream is attached. Libraries that own DOM element creation internally (html5-qrcode, @zxing/browser) cannot be fixed from the outside. The solution is to switch to the `BarcodeDetector` API pattern where the app controls the video element lifecycle.

---

### 1. Scanner Library: Replace html5-qrcode

**Recommendation: Replace with `@undecaf/barcode-detector-polyfill`.**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@undecaf/barcode-detector-polyfill` | ^0.9.23 | WASM BarcodeDetector polyfill — primary scanner on iOS and as fallback on Android | ZBar compiled to WASM; EAN-13, EAN-8, UPC-A, UPC-E all supported; actively maintained (v0.9.23 released July 2025); gives full control over `<video>` element lifecycle so the `playsinline` timing bug is eliminated |
| Native `BarcodeDetector` Web API | browser-native | Used automatically on Chromium/Android Chrome | Polyfill checks `typeof BarcodeDetector !== 'undefined'` and defers to native if available; no code branching needed |

**Why not keep `html5-qrcode`:**
- Creates the `<video>` element internally; `playsinline` is set too late for iOS
- Black screen is unresolvable without owning the video element — confirmed in community workarounds and issue discussions
- Depends on ZXing-js JavaScript port which is in maintenance mode
- No fix has shipped despite iOS issues open since 2022

**Why not `@zxing/browser` / `@zxing/library`:**
- JavaScript ZXing port is slower than WASM for 1D barcode decode
- Official maintenance mode — only security patches accepted
- Would still own video element creation internally

**Why not `Sec-ant/barcode-detector` (ZXing-C++ WASM):**
- ZXing-C++ WASM is excellent for 2D formats (QR, Data Matrix, PDF417) but overkill for EAN-13 grocery scanning
- ZBar WASM (used by `@undecaf`) is faster and smaller for linear barcodes
- Choose `Sec-ant/barcode-detector` only if QR or 2D codes are needed in the future

**Why not STRICH (commercial):**
- Best commercial option with proven iOS support and SLA, but license cost is not justified when WASM polyfill solves the problem

**Native `BarcodeDetector` on iOS Safari:**
- Behind a flag in Safari settings (Shape Detection API)
- Broken in iOS 18 (WebKit regression, bug filed)
- "Not available" for virtually all real Safari users — confirmed by Soledad Penades (February 2025)
- The polyfill handles the fallback automatically

**iOS camera initialization pattern — required regardless of library:**

```typescript
// Must set attributes BEFORE stream attachment
videoEl.setAttribute('playsinline', 'true')
videoEl.setAttribute('muted', 'true')
videoEl.muted = true          // IDL attribute must also be set programmatically
videoEl.setAttribute('autoplay', 'true')

// THEN attach stream
videoEl.srcObject = stream
await videoEl.play()

// Then pass to polyfill in a loop
const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
const results = await detector.detect(videoEl)
```

**Real-time scanning loop pattern:**

```typescript
// App-controlled rAF loop — not delegated to the library
function scanFrame() {
  if (!scanning) return
  detector.detect(videoEl).then(results => {
    if (results.length > 0) handleDetected(results[0].rawValue)
    else requestAnimationFrame(scanFrame)
  })
}
requestAnimationFrame(scanFrame)
```

This replaces the interval-based approach in `html5-qrcode` and gives finer control over stop/start lifecycle.

---

### 2. Kassal.app API: Image and Brand Fields

**No new packages required.** The existing edge function already fetches from Kassal. Only the data flow needs extending.

**Confirmed Kassal.app product fields** (from official API docs at kassal.app/api/docs):

```json
{
  "data": {
    "ean": "7039010019828",
    "products": [
      {
        "id": 283,
        "name": "Product Name",
        "brand": "Brand Name",
        "vendor": "Vendor Name",
        "image": "https://bilder.ngdata.no/7039010019828/meny/large.jpg",
        "description": "...",
        "current_price": { },
        "weight": 500,
        "weight_unit": "g"
      }
    ]
  }
}
```

Key fields:
- `image`: Full absolute URL. Hosted on `bilder.ngdata.no` (NGData CDN). Can be null.
- `brand`: Brand name (e.g., "Grandiosa"). Can be null. Different from `vendor` (manufacturer/distributor).
- Both `image` and `brand` are already typed in the existing `KassalProduct` type in `_shared/barcode.ts`.

**Required changes to the edge function pipeline:**

The existing `KassalProduct` type already has `image?: string | null` and `brand?: string | null`, but both are dropped when building `ReducedProviderPayload` — they are not passed through to `BarcodeLookupDto`. Changes needed:

1. Add `imageUrl: string | null` and `brand: string | null` to `BarcodeLookupDto` in `_shared/barcode.ts`
2. Pass `kassalProduct.image` through as `imageUrl` in `buildReducedProviderPayload` and `fallbackLookupFromProviderPayload` — do NOT send image URLs to Gemini
3. Add `image_url: string | null` column to `barcode_product_cache` table (Supabase migration)
4. Update `createCacheRow` to include `image_url` and `cacheRowToLookupDto` to return it

No new npm packages. No new edge functions. Changes are confined to `_shared/barcode.ts` and `barcode-lookup/index.ts`.

---

### 3. Product Thumbnails in Shopping List: No New Library

**Use native `<img loading="lazy">` only.**

```html
<img
  src={item.imageUrl}
  alt=""
  width="40"
  height="40"
  loading="lazy"
  decoding="async"
  class="h-10 w-10 rounded object-cover"
/>
```

**Why this is sufficient:**
- Native `loading="lazy"` is supported on iOS Safari 15.4+ and Android Chrome 77+ — covers 96%+ of global browsers (Can I Use data, 2026)
- Kassal images are served from `bilder.ngdata.no` (NGData CDN) — reliable latency, no proxy needed
- 40×40px thumbnails have negligible network impact even if a few load eagerly (devices on iOS < 15.4)
- `decoding="async"` prevents main-thread blocking on image decode

**What NOT to do for thumbnails:**
- Do not proxy Kassal images through Supabase Storage transforms — that API only transforms files stored in Supabase buckets, not external URLs
- Do not add `svelte-img`, `unpic`, or `svelte-lazy-image` packages — over-engineering for 40px decorative thumbnails from a CDN
- Do not implement an IntersectionObserver manually — native `loading="lazy"` covers the same browsers with zero JS

**For user-uploaded item photos (Admin -> Items):**
Upload to Supabase Storage `item-photos` bucket. Store the returned public URL in `items.image_url`. Supabase image transformations work for files hosted in Supabase buckets and can be used here for responsive sizes.

---

### 4. Scan UX Improvements: No New Libraries

Faster detection and clearer feedback are implementation concerns, not library gaps:

- **Detection speed**: Switching from ZXing-js (used by `html5-qrcode`) to ZBar WASM improves 1D barcode accuracy — ZBar is purpose-built for linear barcodes and performs better in poor lighting
- **Frame rate**: `requestAnimationFrame` loop (described above) is more responsive than `html5-qrcode`'s fixed-interval approach
- **Feedback overlay**: The existing CSS overlay in `BarcodeScannerSheet.svelte` (dashed border) can be enhanced with a CSS animation — no library needed

---

### v2.0 Package Changes

```bash
# Remove html5-qrcode, add WASM polyfill
npm uninstall html5-qrcode
npm install @undecaf/barcode-detector-polyfill
```

**Vite/WASM note:**

`@undecaf/barcode-detector-polyfill` depends on `@undecaf/zbar-wasm` which includes a `.wasm` file. By default the polyfill loads it at runtime from its own CDN path — no Vite configuration is required for this.

For offline PWA support (so the WASM is cached by the service worker), copy the WASM to `/static/`:

```typescript
// In scanner.ts, before creating BarcodeDetector:
import { setModuleArgs } from '@undecaf/barcode-detector-polyfill'
setModuleArgs({ locateFile: () => '/zbar.wasm' })
```

And add a copy step to `vite.config.ts`:

```typescript
// vite.config.ts — adds the WASM to the static output for SW caching
import { copyFileSync } from 'fs'
// in plugins: { name: 'copy-wasm', buildStart() { copyFileSync(...) } }
```

This is optional for the first pass. The default CDN load works for online sessions. Offline scanning support can be a follow-up.

**Licensing note:** `@undecaf/zbar-wasm` is LGPL. The polyfill docs specify it must be loaded as a library at runtime rather than inlined into the bundle to comply with LGPL. Loading from CDN or `/static/` (as a separate file) satisfies this.

---

### v2.0 Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@undecaf/barcode-detector-polyfill` (ZBar WASM) | `Sec-ant/barcode-detector` (ZXing-C++ WASM) | If QR codes or 2D formats are needed in addition to EAN — ZXing-C++ covers them, ZBar does not |
| `@undecaf/barcode-detector-polyfill` | STRICH (commercial) | If enterprise SLA or detection accuracy guarantee is required and cost is acceptable |
| Native `<img loading="lazy">` | `@zerodevx/svelte-img` | If serving locally-hosted images needing responsive srcset (not the case for Kassal CDN thumbnails) |
| Store Kassal image URL as a string in DB | Re-upload to Supabase Storage | If offline image access is needed — extra complexity and egress cost; images are decorative |

---

### What NOT to Add for v2.0

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `html5-qrcode` (continued use) | iOS black screen is unfixable without video element control; ZXing-js engine in maintenance mode | `@undecaf/barcode-detector-polyfill` |
| `@zxing/browser` / `@zxing/library` | JavaScript port is slower than WASM; maintenance mode; same iOS attribute timing problem | `@undecaf/barcode-detector-polyfill` |
| Native `BarcodeDetector` (Safari) | Behind a flag; broken in iOS 18; effectively unavailable to Safari users | Polyfill that falls back automatically |
| Supabase Storage image transform on Kassal URLs | Only works on files in Supabase buckets — will 404 or return original for external URLs | Store raw URL; serve with native `<img>` |
| IntersectionObserver library for lazy loading | Native `loading="lazy"` has 96%+ global support including iOS Safari 15.4+ | HTML `loading="lazy"` attribute |
| Quagga2 | 1D only, but has its own iOS camera issues and lower decode accuracy than ZBar WASM | `@undecaf/barcode-detector-polyfill` |

---

### v2.0 Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@undecaf/barcode-detector-polyfill` ^0.9.23 | Vite 7, SvelteKit 2, Svelte 5 | Pure TypeScript/WASM; no Svelte-specific adapter |
| `@undecaf/barcode-detector-polyfill` ^0.9.23 | iOS Safari 14+ | WASM supported since iOS 14.3; `getUserMedia` requires HTTPS and user gesture |
| Native `loading="lazy"` | iOS Safari 15.4+ | Devices on iOS < 15.4 load all images eagerly — negligible and acceptable |

---

### v2.0 Sources

- GitHub `mebjas/html5-qrcode` issues #890, #822, #895, #951 — iOS black screen confirmed, unresolved (MEDIUM confidence — community reports, no official Apple acknowledgement)
- GitHub `undecaf/barcode-detector-polyfill` — version 0.9.23, July 2025, EAN-13/8/UPC-A/E confirmed (HIGH confidence — official repo)
- Kassal.app official API docs `kassal.app/api/docs` — `image`, `brand`, `vendor` field names confirmed (HIGH confidence)
- Soledad Penades, "On barcodes and Web APIs" (February 2025) — Safari BarcodeDetector behind a flag, considered unavailable (HIGH confidence)
- Can I Use — `loading="lazy"` iOS Safari 15.4+ support, ~96% global coverage (HIGH confidence)
- WebKit bug #252465 — getUserMedia PWA stream drop on foreground return (MEDIUM confidence)
- WebRTC Hacks + multiple WebKit bug reports — `playsinline`/`muted`/`autoplay` before stream attachment fixes iOS (MEDIUM confidence — multiple consistent community reports)
- Supabase Storage image transformations docs — transforms only apply to Supabase-hosted files (HIGH confidence)

---

## v1.2 New Capabilities: Stack Analysis

### 1. Recipe Cover Images + Item Pictures (Supabase Storage)

**Verdict: Zero new npm packages required.**

`@supabase/supabase-js` already includes the full Storage client. The Storage API is available immediately via the existing Supabase client instance.

**What the existing client provides:**

```typescript
// Upload a file
await supabase.storage.from('recipe-covers').upload(path, file, { upsert: false })

// Get a public URL (serves original — works on all plans)
const { data } = supabase.storage.from('recipe-covers').getPublicUrl(path)

// Get a resized URL via Supabase CDN transform (Pro plan required — see warnings)
const { data } = supabase.storage.from('recipe-covers').getPublicUrl(path, {
  transform: { width: 800, height: 600, quality: 80 }
})
```

**Client-side resize before upload — use native Canvas API:**

Do not add `browser-image-compression` (npm). It is at v2.0.2, last published 3 years ago, and marked inactive by npm maintainer activity metrics. The browser's `OffscreenCanvas` + `convertToBlob` achieves the same result with zero dependencies and is supported on all target platforms (Chrome for Android 69+, Safari 16.4+):

```typescript
// No npm package — native browser API
async function resizeBeforeUpload(file: File, maxDimension = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  )
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })
}
```

This outputs WebP at 85% quality, capping at 1200px on the longest edge — appropriate for recipe covers and item thumbnails.

**Supabase Storage bucket configuration** (via migration, not npm):

```sql
-- Create buckets
insert into storage.buckets (id, name, public)
values ('recipe-covers', 'recipe-covers', true);

insert into storage.buckets (id, name, public)
values ('item-pictures', 'item-pictures', true);

-- RLS: household members write, public reads
create policy "Household members upload recipe covers"
  on storage.objects for insert
  with check (auth.uid() is not null and bucket_id = 'recipe-covers');

create policy "Public reads recipe covers"
  on storage.objects for select
  using (bucket_id = 'recipe-covers');
```

**Path convention:** `{household_id}/{entity_id}.webp` — scopes uploads per household and makes RLS straightforward.

**Upsert strategy:** Upload to a new path (append a random suffix or timestamp) when replacing a cover, then update the DB row with the new URL. Overwriting the same storage path causes CDN cache staleness — Supabase's own docs recommend new paths over `upsert: true` for images served via CDN.

---

### 2. Dark Mode Toggle with Persisted Preference

**Verdict: Zero new npm packages required.** Tailwind v4 + `localStorage` + one inline script.

**Step 1 — Tailwind v4 dark variant** (edit `src/app.css`):

Tailwind v4 has no `tailwind.config.js`. Dark mode is configured in CSS via `@custom-variant`:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

This replaces the `darkMode: 'class'` config entry from Tailwind v3. After this, `dark:` utility classes respond to the `.dark` class on `<html>`.

**Step 2 — Anti-FOUC script** (add to `src/app.html` inside `<body>`, before `%sveltekit.body%`):

```html
<script>
  ;(function () {
    var stored = localStorage.getItem('theme')
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark')
    }
  })()
</script>
```

This runs before any component renders, preventing a flash of the wrong theme on load.

**Step 3 — Theme store** (Svelte 5 runes, no library):

```typescript
// src/lib/stores/theme.svelte.ts
let dark = $state(false)

export const theme = {
  get dark() { return dark },
  init() {
    dark = document.documentElement.classList.contains('dark')
  },
  toggle() {
    dark = !dark
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }
}
```

Call `theme.init()` in `onMount` inside the protected layout to sync the store with the actual DOM state set by the inline script.

**Why `localStorage` over cookies:** Dark mode is a client-local preference. Mixing it into server-read cookies adds unnecessary SSR complexity. The existing auth cookie flow via `@supabase/ssr` should remain focused on sessions only.

---

### 3. Admin Hub with Subpage Navigation

**Verdict: Zero new npm packages required.** SvelteKit route groups and nested layouts — built-in.

**Recommended route structure:**

```
src/routes/(protected)/
  admin/
    +layout.svelte          <- Admin shell: secondary nav tabs + {@render children()}
    +page.svelte            <- Redirect to first tab or empty state
    butikker/
      +page.svelte          <- Moved from (protected)/butikker/
    husstand/
      +page.svelte          <- Moved from (protected)/husstand/
    items/
      +page.svelte          <- New: item management (edit name, category, picture)
      [id]/
        +page.svelte        <- Optional: single item edit page
    historikk/
      +page.svelte          <- Moved if currently exists separately
    innstillinger/
      +page.svelte          <- New: user settings (dark mode toggle)
```

The four-tab bottom nav (already in `BottomNav.svelte`) gets updated to point to `/admin` as the fourth tab. The `admin/+layout.svelte` renders a secondary horizontal tab strip for the subpages, then `{@render children()}`.

**No route group wrapper needed for `admin/`:** It sits directly inside `(protected)/`, inheriting the auth guard and bottom nav from `(protected)/+layout.svelte`. The admin shell adds only its own secondary nav on top.

**Existing routes to relocate:**
- `(protected)/butikker/` → `(protected)/admin/butikker/`
- `(protected)/husstand/` → `(protected)/admin/husstand/`

Any internal `goto()` calls or `href` links pointing to the old paths need updating. SvelteKit's type-safe routing (`$app/navigation`) will surface broken paths at compile time if using path literals.

---

### 4. Recipe Management (Data Layer)

**Verdict: Zero new npm packages required.** TanStack Query + Supabase — same pattern already in use for lists.

Recipes are a new Supabase table group. The fetch/mutate pattern is identical to the existing shopping list pattern:

- Fetch: `useQuery` with Supabase `.select()` filtered by `household_id`
- Mutate: `useMutation` for create/update/delete
- Realtime sync: Subscribe to `postgres_changes` on `recipes` table; on event call `queryClient.invalidateQueries({ queryKey: ['recipes'] })`
- Cover image URL stored as a `text` column in the `recipes` table (the Storage public URL)

No new package. No state management library. Same architecture as lists.

---

## New Packages for v1.2: None

All four feature areas are covered by dependencies already present or browser-native APIs.

| Capability | Solution | Package Status |
|------------|----------|---------------|
| Image upload to Supabase | `supabase.storage.from().upload()` | Already installed (`@supabase/supabase-js`) |
| Image resize before upload | `OffscreenCanvas.convertToBlob()` | Browser-native, no package |
| Serving images | `supabase.storage.from().getPublicUrl()` | Already installed |
| Dark mode class toggle | `@custom-variant dark` in Tailwind v4 CSS | Already installed (`tailwindcss ^4.2.1`) |
| Dark mode persistence | `localStorage` | Browser-native, no package |
| Dark mode FOUC prevention | Inline script in `app.html` | No package |
| Admin hub routing | SvelteKit route groups + nested layouts | Already installed (`@sveltejs/kit`) |
| Admin subpage tabs | Tailwind-styled nav component | No additional package |
| Recipe data | TanStack Query + Supabase | Already installed |

```bash
# No new packages to install for v1.2
# npm install (no changes to package.json)
```

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `browser-image-compression` | Unmaintained — v2.0.2, last published 3 years ago, npm flags as inactive. Adds ~40KB for functionality the browser provides natively. | `OffscreenCanvas` + `convertToBlob` |
| `svelte-dark-mode` (metonym) | Thin wrapper over 5 lines of vanilla JS; last meaningful commit 2022; adds a dependency for trivial logic. | Plain `localStorage` + Svelte 5 `$state` |
| Flowbite Svelte / Skeleton UI | Adds bundle weight and version coupling for tab components that Tailwind handles natively. | Tailwind utility classes for the admin tab strip |
| Supabase Storage image transforms (`transform: { width, height }`) in `getPublicUrl` | **Requires Supabase Pro plan.** Will silently serve the original image on the free/hobby tier without error. Unreliable unless the project is on Pro. | Client-side resize before upload (serves original at correct size) |

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|-------------|-------------|------------------------------|
| `OffscreenCanvas` (native) | `browser-image-compression` npm | If supporting browsers older than Safari 16.4 / Chrome 69 (not a concern for this app's target audience) |
| `localStorage` dark mode | Cookie-based dark mode | If SSR needs to render the correct theme server-side (e.g., no `app.html` script injection possible). Not needed here — SvelteKit SSR does not render theme-sensitive content before JS hydrates. |
| `@custom-variant dark` (Tailwind v4 CSS) | `darkMode: 'class'` in `tailwind.config.js` | Only relevant for Tailwind v3 — this project is on v4, which has no config file. |
| SvelteKit nested layouts for admin nav | A tab component library | If the admin hub needed complex tab behaviors (animated underlines, keyboard navigation beyond basic). Plain `<a>` tags with `aria-current` and Tailwind active styles are sufficient. |

---

## Version Compatibility (v1.2 relevant)

| Package | Version | Notes |
|---------|---------|-------|
| `@supabase/supabase-js` | ^2.98.0 (latest: ~2.99.1) | Storage `.upload()` and `.getPublicUrl()` with `transform` are stable across all 2.x releases |
| `tailwindcss` | ^4.2.1 | `@custom-variant dark` is the v4 idiom — replaces `darkMode: 'class'` config. Do not use the v3 config approach. |
| `@sveltejs/kit` | ^2.50.2 | Route groups `(name)/`, nested layouts, `+layout.svelte` — stable since SvelteKit 1.x |
| `svelte` | ^5.51.0 | Runes (`$state`, `$props`) used for theme store — requires Svelte 5 (already in use) |
| `@tanstack/svelte-query` | ^6.1.0 | Same fetch/invalidate pattern for recipes as for shopping lists — no API changes needed |

---

## Sources

- Supabase Storage standard uploads (official docs) — upload API, 6MB limit, upsert guidance: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Supabase Storage image transformations (official docs) — `transform` option in `getPublicUrl`, Pro plan requirement: https://supabase.com/docs/guides/storage/serving/image-transformations
- Tailwind CSS dark mode (official docs, v4.2) — `@custom-variant dark`, localStorage toggle pattern: https://tailwindcss.com/docs/dark-mode
- SvelteKit advanced routing (official docs) — route groups, nested layouts: https://svelte.dev/docs/kit/advanced-routing
- `browser-image-compression` npm — maintenance status (v2.0.2, last published 3 years ago): https://www.npmjs.com/package/browser-image-compression
- `@supabase/supabase-js` npm — current version ~2.99.1: https://www.npmjs.com/package/@supabase/supabase-js
- CaptainCodeman dark mode implementation — FOUC prevention pattern, localStorage vs cookie tradeoff: https://www.captaincodeman.com/implementing-dark-mode-in-sveltekit
- Svelte Tutorial: Route Groups — confirmed `(name)` directory behavior: https://svelte.dev/tutorial/kit/route-groups
- GitHub `mebjas/html5-qrcode` issues #890, #822, #895, #951 — iOS black screen confirmed (MEDIUM confidence)
- GitHub `undecaf/barcode-detector-polyfill` — v0.9.23, July 2025, EAN-13/8/UPC-A/E supported (HIGH confidence)
- Kassal.app official API docs — `image`, `brand`, `vendor` field names: https://kassal.app/api/docs (HIGH confidence)
- Soledad Penades, "On barcodes and Web APIs" (Feb 2025) — Safari BarcodeDetector status (HIGH confidence)
- Can I Use — `loading="lazy"` iOS Safari 15.4+ support: https://caniuse.com/loading-lazy-attr (HIGH confidence)

---
*Stack research for: HandleAppen — v1.2 (recipes, image upload, dark mode, admin hub) + v2.0 (barcode scanner, product images, brand) + v2.2 (geolocation, geofencing, map widget, reverse geocoding)*
*Researched: 2026-03-13 (v1.2), 2026-03-14 (v2.0), 2026-03-28 (v2.2)*
