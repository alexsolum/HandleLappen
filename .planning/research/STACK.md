# Stack Research

**Domain:** Family grocery shopping PWA with Supabase backend
**Researched:** 2026-03-13 (updated for v1.2)
**Confidence:** HIGH

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
| `html5-qrcode` | ^2.3.8 | Validated (barcode scanning) |

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
    +layout.svelte          ← Admin shell: secondary nav tabs + {@render children()}
    +page.svelte            ← Redirect to first tab or empty state
    butikker/
      +page.svelte          ← Moved from (protected)/butikker/
    husstand/
      +page.svelte          ← Moved from (protected)/husstand/
    items/
      +page.svelte          ← New: item management (edit name, category, picture)
      [id]/
        +page.svelte        ← Optional: single item edit page
    historikk/
      +page.svelte          ← Moved if currently exists separately
    innstillinger/
      +page.svelte          ← New: user settings (dark mode toggle)
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

---
*Stack research for: HandleAppen v1.2 — recipes, image upload, dark mode, admin hub*
*Researched: 2026-03-13*
