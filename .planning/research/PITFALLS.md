# Pitfalls Research

**Domain:** SvelteKit + Supabase PWA — adding navbar restructure, recipes, admin hub, item pictures, dark mode to existing v1 family grocery app
**Researched:** 2026-03-13
**Confidence:** HIGH (Tailwind v4 dark mode config verified against official docs; Supabase Storage RLS verified against official access control docs; SvelteKit await parent() waterfall verified against official docs and GitHub issues; PWA navigation behavior verified against vite-pwa/sveltekit docs; service worker image conflict verified against Supabase community reports)

---

## Critical Pitfalls

### Pitfall 1: Dark Mode FOUC — Tailwind v4 Has No `darkMode` Config Key

**What goes wrong:**
The existing `app.css` uses only `@import "tailwindcss"`. Tailwind v4 defaults to `prefers-color-scheme` (media query) for dark mode, meaning `dark:` classes react to the OS setting only. When the user's Brukerinnstillinger toggle needs to override OS preference, you need a class-based toggle. In Tailwind v4 there is **no `tailwind.config.js`** and no `darkMode: 'class'` key — developers who copy v3 tutorials will add `darkMode: 'class'` to a config file that no longer exists and wonder why `dark:` classes never activate.

Even after configuring correctly with `@custom-variant`, there is a second problem: the toggle preference is stored in `localStorage`, which is not readable during SSR. On first load the SSR render has no idea what the user's stored preference is, so the page renders light, then JavaScript reads `localStorage` and switches to dark — causing a visible flash (FOUC). This is particularly jarring in the bottom nav, header, and full-page backgrounds.

**Why it happens:**
Tailwind v4 moved all configuration to CSS (`@custom-variant`) but most tutorials still show v3's `tailwind.config.js` approach. Developers copy old examples. The FOUC happens because SvelteKit renders HTML on the server where `localStorage` is unavailable, and the theme class is applied client-side in `onMount` — which fires after the first paint.

**How to avoid:**
Two distinct fixes required:

1. **Configure Tailwind v4 correctly** — in `app.css`, add the custom variant after the import:
   ```css
   @import "tailwindcss";
   @custom-variant dark (&:where(.dark, .dark *));
   ```
   This makes `dark:` classes activate when `.dark` exists on any ancestor element, typically `<html>`.

2. **Prevent FOUC with an inline blocking script** — in `app.html`, add a `<script>` tag *before* `%sveltekit.head%` that runs synchronously (blocking render). This reads `localStorage` and applies the class before first paint:
   ```html
   <script>
     (function() {
       try {
         var theme = localStorage.getItem('theme');
         if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
           document.documentElement.classList.add('dark');
         }
       } catch(e) {}
     })();
   </script>
   ```
   This runs synchronously during HTML parsing — before CSS applies, before SvelteKit hydrates. No FOUC.

Do **not** use cookies to persist the theme. Cookie-based SSR approaches require hooks.server.ts changes, add overhead to every request, and create complexity when SvelteKit's prerendering is involved. LocalStorage + inline script is simpler and equally reliable.

**Warning signs:**
- `dark:` classes have no effect even when `.dark` is on `<html>`
- Screen flashes white for 100-200ms before switching to dark on hard reload
- The toggle works in Chrome DevTools but not in the installed PWA on iOS (Safari's persistent storage is slower to initialize)

**Phase to address:** Dark mode / Brukerinnstillinger phase — both the Tailwind config fix and the inline script must land in the same phase; fixing one without the other produces a partially broken result.

---

### Pitfall 2: Supabase Storage RLS — Household-Scoped Paths Require Four Separate Policies

**What goes wrong:**
Developers create a storage bucket, add a single `INSERT` policy so uploads work, then discover that images don't display (SELECT is missing), that updating an image fails (UPDATE missing), and that deleting an old image before replacement is blocked (DELETE missing). Additionally, without path-based scoping in the policy, any authenticated user can upload to any path in the bucket — household A can overwrite household B's item images by guessing the path.

The second mistake: making the bucket **public** to avoid writing SELECT policies, then being surprised that RLS on `storage.objects` still controls uploads. A public bucket only bypasses the auth check on *downloads via the public URL* — INSERT/UPDATE/DELETE still require explicit policies. Developers confuse "publicly readable" with "no RLS needed."

**Why it happens:**
The Supabase dashboard Storage UI shows a single "New policy" flow that prompts for only one operation at a time. It's easy to create an INSERT policy and consider the job done. The public bucket checkbox is labeled as controlling "access" which implies full access when checked.

**How to avoid:**
For item and recipe images, use a **private bucket** with four explicit policies on `storage.objects`. Scope all policies to `bucket_id = 'images'` and enforce a household-based folder structure (`households/{household_id}/{item_id}.jpg`):

```sql
-- Upload (INSERT)
CREATE POLICY "household members can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'households' AND
  (storage.foldername(name))[2] IN (SELECT get_my_household_ids())
);

-- View (SELECT)
CREATE POLICY "household members can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] IN (SELECT get_my_household_ids())
);

-- Replace (UPDATE) -- needed for upsert/replace
CREATE POLICY "household members can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] IN (SELECT get_my_household_ids())
);

-- Delete (DELETE)
CREATE POLICY "household members can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] IN (SELECT get_my_household_ids())
);
```

This reuses the `get_my_household_ids()` SECURITY DEFINER function already established for table RLS (see PITFALLS.md from v1.0). All four policies reference the same function — changes to household membership propagate automatically.

**Warning signs:**
- Upload succeeds (HTTP 200) but image does not display in app (missing SELECT policy)
- Replacing an item image with a new one returns 403 (missing UPDATE policy)
- Old images accumulate in storage because delete fails silently on the client (missing DELETE policy)
- `storage.objects` RLS check passes in Supabase Table Editor but fails in the running app (service role vs anon key confusion during testing)

**Phase to address:** Admin hub / item picture phase — establish all four storage policies plus the path convention before writing any upload UI code. Do not iterate by adding policies one at a time as errors appear.

---

### Pitfall 3: Large Image Uploads from Mobile Cameras Exceeding Supabase Free Tier Limit

**What goes wrong:**
Modern phones (iPhone 15, Samsung Galaxy S24) produce HEIC/JPEG photos at 4–12 MB per image. Supabase Storage's free tier has a **50 MB global file size limit**, but more importantly the **standard upload API is suited for files up to 6 MB** — above that, Supabase recommends resumable uploads. A family member photographing a grocery item from their iPhone camera roll will silently fail or receive a 413 error if the raw photo exceeds the limit.

Additionally: if the file is within the limit but is a large JPEG (3–4 MB), the Supabase Storage CDN URL served to other family members will be slow to load on mobile data. Item list views with 20+ product images become noticeably slow.

**Why it happens:**
Developers test with small PNG files from their desktop. Mobile camera output is not considered. The standard `supabase.storage.from('images').upload(path, file)` call does not enforce client-side size checking.

**How to avoid:**
Compress images client-side before upload using the `browser-image-compression` npm package (or `compressorjs`). Target output: ≤ 400 KB, max 800px on the longest side — sufficient for a grocery item thumbnail. Implement the compression step in the upload handler, not in a separate UI step. Show a size/compression progress indicator during the operation (mobile compression of a 10 MB HEIC can take 2–4 seconds on older devices).

```typescript
import imageCompression from 'browser-image-compression';

const compressed = await imageCompression(file, {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 800,
  useWebWorker: true,
});
await supabase.storage.from('images').upload(path, compressed);
```

Also enforce a client-side guard before compression: if `file.size > 50_000_000` (50 MB), reject immediately with a user-friendly message. This prevents attempting to compress a raw video file accidentally selected.

**Warning signs:**
- Upload progress bar hangs at 0% for large files then fails with no error message shown
- HTTP 413 errors in the Network tab during upload testing
- Item list pages slow on mobile with many images visible simultaneously

**Phase to address:** Admin hub / item picture phase — compression is not an optimization to add later, it is a correctness requirement for the mobile use case.

---

### Pitfall 4: Service Worker Caches Old Item/Recipe Images After Replacement

**What goes wrong:**
The existing service worker uses `CacheFirst` for the app shell and `NetworkFirst` for Supabase REST API calls. Supabase Storage serves images from a CDN URL like `https://{project}.supabase.co/storage/v1/object/public/images/households/{id}/item-123.jpg`. When a user replaces an item's picture, they upload a new file to the **same path** (upsert). The old image URL remains identical. The service worker (or the browser's HTTP cache) has the old image cached and serves it instead of the new one — the replacement appears to have failed from the user's perspective.

This is a documented issue in the Supabase community: replace storage file with the same path and old image persists due to caching.

**Why it happens:**
The current service worker does not explicitly handle `storage.supabase.co` URLs. The browser's default HTTP cache (`Cache-Control` headers from Supabase CDN) or Workbox's `CacheFirst` strategy may cache the original image. When the path is reused after upsert, there is no cache invalidation.

**How to avoid:**
Two-pronged approach:

1. **Never reuse the same storage path for updated images.** Include a version suffix or timestamp in the filename: `item-{id}-{timestamp}.jpg`. Delete the old file after uploading the new one. This makes the URL change on every update, which is a guaranteed cache-bust.

2. **Explicitly exclude Supabase Storage URLs from the service worker cache.** In `service-worker.ts`, add a check that prevents the existing `NetworkFirst` Supabase cache from matching storage object URLs:
   ```typescript
   // In the existing Supabase REST handler, add this check:
   url.pathname.startsWith('/rest/v1/') &&
   !url.pathname.startsWith('/storage/') && // Add this line
   !url.pathname.startsWith('/auth/')
   ```
   Storage image requests should go directly to the network (no service worker interception) so they always fetch the current CDN version.

Option 1 alone is sufficient, but option 2 prevents the service worker from being the source of future confusion for any Supabase CDN content.

**Warning signs:**
- User reports "I updated the picture but it still shows the old one"
- Hard refresh in desktop Chrome shows new image, but the installed PWA on the phone still shows old image
- Storage bucket shows the new file but the URL still resolves to the old image visually

**Phase to address:** Admin hub / item picture phase — apply both fixes before any image upload is wired up in the UI.

---

### Pitfall 5: Bottom Nav Restructure Breaks `page.url.pathname` Active State Detection for Deep Links

**What goes wrong:**
The current `BottomNav.svelte` uses exact pathname matching (`page.url.pathname === href`) to determine which tab is active. After the restructure, the new tabs are: Handleliste (`/`), Oppskrifter (`/oppskrifter`), Anbefalinger (`/anbefalinger`), Admin (`/admin`). The Admin tab covers multiple sub-routes: `/admin/butikker`, `/admin/husstand`, `/admin/items`, `/admin/historikk`, `/admin/instillinger`. With exact matching, none of those sub-routes will mark the Admin tab as active — the user navigates into the admin hub and all four tabs appear inactive.

The same problem applies to Handleliste: the current active route for shopping is `/lister/[id]`, not `/` — so navigating into a list makes the Lister tab go dark.

Additionally: the `recommendationHref` currently appends `?list=...` to preserve the active list. If the tab href includes a query string and the pathname check ignores query params, the Anbefalinger tab may show inactive even when on that page.

**Why it happens:**
Exact match is the simplest implementation and works for flat nav. It breaks the moment any tab has child routes or query parameters. It is easy to miss during development because developers navigate directly to `/admin` and see it highlighted, but don't test from a sub-route like `/admin/items`.

**How to avoid:**
Replace exact pathname matching with a prefix check for tabs that own sub-routes:

```typescript
function isActive(tab: Tab): boolean {
  const pathname = page.url.pathname;
  if (tab.href === '/') {
    // Lister tab: active on / and all /lister/* routes
    return pathname === '/' || pathname.startsWith('/lister/');
  }
  if (tab.href === '/admin') {
    // Admin tab: active on /admin and all /admin/* routes
    return pathname === '/admin' || pathname.startsWith('/admin/');
  }
  if (tab.href === '/anbefalinger') {
    return pathname === '/anbefalinger';
  }
  // Default: prefix match
  return pathname.startsWith(tab.href);
}
```

Also verify that the PWA `start_url: "/"` in `vite.config.ts` still resolves correctly after the nav restructure. The current config sets `start_url: "/"` which maps to the Handleliste tab root — this is correct and should not change.

**Warning signs:**
- Installing the updated PWA and navigating into `/admin/items` shows no tab highlighted
- The "back" gesture from a list detail page lands on a route where no tab is active
- Anbefalinger tab shows as inactive when the user is on that page with a `?list=` parameter

**Phase to address:** Navbar restructure phase — fix the active detection logic as part of the nav component rewrite, not as a follow-up fix.

---

### Pitfall 6: PWA Standalone Mode Back-Navigation Trap After Nav Restructure

**What goes wrong:**
In the current app, the bottom nav's four tabs link to: `/`, `/husstand`, `/butikker`, `/anbefalinger`. After restructure, Husstand and Butikker move under `/admin`. Users who installed the PWA before the update have browser history entries pointing to `/husstand` and `/butikker`. When they tap a bottom nav tab after the update, SvelteKit's client-side router loads the new route. But if they press the Android back button or use iOS swipe-back, the history stack may try to navigate to now-removed top-level routes that no longer exist (or redirect), creating a confusing experience.

More critically: in PWA standalone mode on iOS, there is **no URL bar**. If the app somehow navigates to a route that isn't precached and connectivity is poor, the user sees a blank screen with no way to recover except force-quitting the app.

**Why it happens:**
Navigation restructuring changes the URL space. Existing history entries don't automatically update. The service worker's precached routes from the previous build do not include new routes (new routes are only precached after the updated service worker installs).

**How to avoid:**
1. **Add SvelteKit redirects** for all removed top-level routes. In `+layout.server.ts` or via `src/routes/husstand/+server.ts` (a redirect endpoint), send 301 redirects from `/husstand` and `/butikker` to their new homes under `/admin/husstand` and `/admin/butikker`. This ensures old bookmarks and back-navigation history entries still resolve.

2. **Verify the service worker's `SKIP_WAITING` flow.** The existing service worker responds to `SKIP_WAITING` messages (already implemented). Confirm that after deploying the restructure, users who have the old app open receive the update prompt and the new routes are precached by the updated worker.

3. **Test the update transition explicitly**: open the old app in PWA standalone mode on iOS, navigate to `/butikker`, deploy the update, then reopen the app — confirm the user sees the new admin hub rather than a blank screen or routing error.

**Warning signs:**
- After restructure, navigating to the old app (before update installs) shows 404 on removed routes
- Android back button from the new Admin hub navigates to an old route that no longer has content
- Playwright tests that hardcode route paths fail after restructure (update the test fixtures)

**Phase to address:** Navbar restructure phase — implement redirects before releasing the build that removes top-level routes.

---

### Pitfall 7: Admin Hub Nested Layout Causes Double `household_id` Fetching via `await parent()`

**What goes wrong:**
The admin hub will live at `/admin` with sub-routes like `/admin/items`, `/admin/butikker`. The natural implementation is to create `src/routes/(protected)/admin/+layout.server.ts` that loads admin-specific data, then call `await parent()` in each sub-route's `+page.server.ts` to access `householdId` from the protected layout. This creates a **request waterfall**: SvelteKit cannot start the child `load` function until the parent `load` completes, meaning `(protected)/+layout.server.ts` runs first (fetches session + profile), then `admin/+layout.server.ts` runs (blocked waiting for parent), then the page `+page.server.ts` runs (blocked waiting for admin layout). Three sequential server round-trips instead of one.

**Why it happens:**
`await parent()` is the documented way to access parent layout data. Developers use it naturally without realizing it serializes what SvelteKit would otherwise parallelize. The performance hit is invisible in local development (all on localhost) but measurable on deployed infrastructure, particularly on first load in the PWA.

**How to avoid:**
Do not call `await parent()` in admin sub-route load functions just to get `householdId`. Instead, read `locals` directly — `householdId` is available via the profile query already run in the protected layout, but it is not in `locals` by default. The cleanest approach: move `householdId` into `event.locals` in `hooks.server.ts` (or a handle hook that runs after auth), so every server load function can read `locals.householdId` without waiting for parent.

If `await parent()` is genuinely needed (for data that truly depends on parent output), call it **after** any independent data fetches, not before:

```typescript
// WRONG — waterfall
export const load: PageServerLoad = async ({ locals, parent }) => {
  const { householdId } = await parent(); // blocks until parent completes
  const items = await supabase.from('items').select('*'); // runs after parent
  return { items };
};

// CORRECT — parallel
export const load: PageServerLoad = async ({ locals, parent }) => {
  const itemsPromise = supabase.from('items').select('*'); // starts immediately
  const { householdId } = await parent(); // waits in parallel
  const { data: items } = await itemsPromise;
  return { items };
};
```

**Warning signs:**
- Network waterfall visible in Chrome DevTools when navigating to admin sub-routes (sequential server requests)
- Admin sub-pages feel slow to load despite simple data requirements
- SvelteKit Vite dev server shows `load` functions running sequentially in console order

**Phase to address:** Admin hub phase — establish the data access pattern for admin sub-routes before creating individual sub-pages.

---

### Pitfall 8: Recipe Ingredients Added to List Without Checking for Existing Items — Silent Duplicates

**What goes wrong:**
The "Add all ingredients to list" action on a recipe page creates new list item rows for each recipe ingredient. If the item already exists on the target list (user already added "Milk" manually, recipe calls for "Milk"), a duplicate entry is silently created. The shopping list then shows two "Milk" rows. In the store-layout-aware sorted view, duplicates are confusing — both rows are sorted to the same category position and appear adjacent with no indication they are duplicates.

The problem is compounded when the user has already checked off one "Milk" and the recipe-added one appears unchecked — appearing to the user as though they still need to buy Milk.

**Why it happens:**
The simplest implementation of "add ingredients" is a batch insert with no duplicate detection. The recipe ingredient table references household items by `item_id`. The list items table likely links to the same `item_id`. A duplicate check requires querying the target list for existing item IDs before inserting — an extra step that is easy to skip in the first pass.

**How to avoid:**
Use a PostgreSQL upsert (`INSERT ... ON CONFLICT DO NOTHING`) on the list items table, with a unique constraint on `(list_id, item_id)`. This makes the "add to list" operation idempotent at the database level — adding an already-present ingredient is a no-op, not a duplicate.

```sql
ALTER TABLE list_items ADD CONSTRAINT uq_list_item UNIQUE (list_id, item_id);
```

```typescript
await supabase
  .from('list_items')
  .upsert(
    ingredientsToAdd.map(i => ({ list_id: targetListId, item_id: i.item_id, checked: false })),
    { onConflict: 'list_id,item_id', ignoreDuplicates: true }
  );
```

For the UX: after a bulk add, show a summary toast: "8 varer lagt til, 2 var allerede på listen." This communicates what happened rather than silently skipping items.

**Warning signs:**
- Testing "Add all" on a recipe that shares ingredients with manually added items produces duplicate rows
- A checked item reappears unchecked after adding a recipe
- The shopping list shows two identical item names in the same category section

**Phase to address:** Recipes phase — apply the unique constraint in the migration that creates the schema for recipe-to-list linking; do not defer it.

---

### Pitfall 9: List Picker Sheet for "Add to List" Has No Empty State for Zero Lists

**What goes wrong:**
The recipe ingredient "add to list" flow opens a sheet where the user picks which shopping list to add ingredients to. If the household has no lists yet (new user onboarding) or all lists have been archived, the picker renders an empty sheet with no guidance. The user taps "Add to list," sees a blank modal, and has no idea what to do. On mobile this is a dead end — there is no visible way to create a new list from within the picker.

**Why it happens:**
The list picker is implemented assuming the user already has at least one list (the primary use case). Empty states are added later, if at all.

**How to avoid:**
Design the list picker sheet to handle three states at build time, not as an afterthought:
1. **Lists available**: show the list of lists with a tap-to-select interaction.
2. **No lists**: show "Du har ingen handlelister. Opprett en ny liste for å komme i gang." with an inline "Ny liste" button that creates a list and then proceeds with the add operation.
3. **Loading**: show skeleton rows while the list query is in flight (especially relevant on first render in PWA offline mode where the cached response may be stale).

**Warning signs:**
- QA on a fresh household account shows a blank picker
- User testing reveals confusion when the picker opens empty
- The "Add to list" button in the recipe view is tappable even when no lists exist

**Phase to address:** Recipes phase — spec all three sheet states in the task definition before implementation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing theme in component state (`$state`) instead of `localStorage` | Simpler code | Preference resets on every app launch; FOUC on reload | Never — use `localStorage` from the start |
| Making the image storage bucket public to skip SELECT policies | No SELECT policy needed for CDN URLs | Any authenticated user can see all households' images if they guess the path | Only if all images are genuinely non-sensitive (product photos from a public catalog are OK; family content is not) |
| Uploading raw mobile camera images without compression | Fewer dependencies | 413 errors on free tier; slow list views; storage quota consumed rapidly | Never on the upload path — compress before upload always |
| Using exact pathname match for all bottom nav active states | Less code | Admin sub-routes never highlight the Admin tab; looks broken | Never — prefix matching is two lines more, always correct |
| Adding `await parent()` at the top of every sub-route load function | Consistent access to parent data | Sequential waterfall on every admin page load | Only when child data genuinely depends on parent data and the extra latency is acceptable |
| No upsert on recipe ingredient add — plain INSERT | Simpler query | Silent duplicate list items; user confusion when checking off items | Never — unique constraint + upsert is 5 extra lines and prevents a class of bugs |
| Reusing the same storage path when updating an item image | No need to delete old file | Old image persists in service worker cache; users see stale images | Never — include a version/timestamp in the path |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Storage (new) | Creating only INSERT policy and calling it done | Create all four policies: INSERT, SELECT, UPDATE, DELETE; test each separately |
| Supabase Storage (new) | Making bucket public to avoid writing SELECT policies | Keep bucket private; write explicit SELECT policy scoped to household path |
| Supabase Storage (new) | Uploading raw mobile camera JPEG without compression | Compress to ≤400 KB client-side with `browser-image-compression` before calling `storage.upload()` |
| Supabase Storage + service worker (existing) | Service worker caches the old image URL after upsert | Use versioned filenames (include timestamp in path); exclude storage CDN URLs from Workbox cache |
| Tailwind v4 (existing) | Copying v3's `darkMode: 'class'` into a non-existent `tailwind.config.js` | Use `@custom-variant dark (&:where(.dark, .dark *));` in `app.css` |
| SvelteKit SSR + localStorage (existing) | Applying dark class in `onMount` (causes FOUC) | Apply dark class in a synchronous inline script in `app.html` `<head>` before `%sveltekit.head%` |
| SvelteKit nested layouts | Calling `await parent()` at the top of every load function | Read `householdId` from `locals` directly; only call `await parent()` for data that genuinely requires it, and call it after independent fetches |
| SvelteKit route groups | Treating route group folder removal as safe without adding redirects | Add 301 redirects from old top-level routes (e.g. `/husstand`) to new admin sub-routes (e.g. `/admin/husstand`) before releasing |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Admin sub-route `load` functions waterfalling via `await parent()` | Admin pages load 2-3x slower than Handleliste pages; visible in Network DevTools as sequential server requests | Read `householdId` from `locals`; kick off data fetches before `await parent()` | Every navigation to an admin sub-page; more noticeable on mobile with high latency |
| Uncompressed image uploads consumed by the free tier 50 MB limit | Uploads fail for power users with many item pictures; Storage settings show near-quota usage | Compress all uploads to ≤400 KB before sending | After ~125 uncompressed 400 KB uploads (free tier); sooner with raw mobile photos |
| Service worker `CacheFirst` strategy serving stale item images | Image replacement appears broken; user sees outdated item or recipe photo | Versioned filenames; exclude storage CDN from service worker routes | Immediately on first image replacement after the image feature ships |
| Bottom nav re-rendering `tabs` array on every page navigation | Minor jank on nav transitions in Svelte 5 runes mode if `tabs` is defined inside the component script and reactive | Lift the static `tabs` array outside the component or declare it as a constant (not reactive state) | Any navigation; mild performance concern, noticeable on slower Android devices |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storage bucket with missing path scoping — policy allows upload to `bucket_id = 'images'` but not scoped to `households/{household_id}/` | Household A can overwrite Household B's item images by guessing the path | Add `(storage.foldername(name))[2] IN (SELECT get_my_household_ids())` to all storage policies |
| Public storage bucket for item/recipe images | Anyone with the URL can see all images; if household is private this is a privacy violation | Use private bucket with explicit household-scoped SELECT policy |
| Storing dark mode preference in a writable Svelte store synced only in memory | No security risk, but preference resets on reload — not a security issue | Use `localStorage` for persistence |
| Admin hub accessible without admin role check — relying only on being a household member | Any household member can reach admin pages including "Items" edit and "Husstand" management | The current protected layout already validates `household_id`; verify that admin sub-routes re-use the same protected layout group (they should inherit from `(protected)/+layout.server.ts`) |
| Recipe cover images uploaded with user-controlled filenames containing path traversal characters | Supabase Storage accepts most characters in filenames; a malicious path like `../../other-household/` could traverse bucket structure | Sanitize or generate filenames server-side; use `crypto.randomUUID()` + extension rather than user-provided names |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback during image upload on mobile (which takes 2-4 seconds with compression) | User taps "Save" and nothing happens; they tap again and double-upload | Show a spinner or progress indicator from the moment compression begins, not just from network send |
| "Add all ingredients" adds items without confirming which list they go to | Items land in the wrong list; user has to manually remove them | Always show a list picker sheet before bulk adding; default to the active list but require explicit confirmation |
| Dark mode toggle only in Brukerinnstillinger (admin sub-page) — hard to find | Users expect a toggle in a more accessible location (top bar or settings shortcut) | Put the toggle in Brukerinnstillinger as scoped in v1.2, but make the path obvious from the Admin tab — a clear "Innstillinger" label in the admin hub |
| Admin hub is a flat link list with no visual grouping | 5+ admin items on a plain list feels like a settings dump, not a hub | Group items: "Handlelister" (Historikk), "Butikker" (Butikker, Standard), "Husstand" (Husstand, Inviter), "Varer" (Items), "Bruker" (Innstillinger) |
| Recipe ingredient names that don't match existing household items (spelling/case differences) | "Løk" in the recipe vs "Kepaløk" in the item catalog — add creates a new item instead of linking | Use fuzzy match / suggestion when creating recipe ingredients — if a similar item exists in the household catalog, offer to link to it rather than create a new one |
| Bottom nav active state ignores all `/lister/[id]` routes after restructure | User opens a list, bottom nav shows no tab highlighted — app feels broken | Use prefix matching for the Handleliste tab: active on `/` and `/lister/*` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Dark mode toggle:** Verify dark mode persists across: (1) tab close and reopen, (2) PWA force-quit and reopen on iOS, (3) system dark mode change while app is open — all three should reflect the user's stored preference without FOUC
- [ ] **Dark mode Tailwind coverage:** Search the codebase for all `bg-`, `text-`, `border-` classes on layout-level elements and confirm each has a `dark:` counterpart — bottom nav, header, main background, sheets/modals, and toast notifications are the most likely to be missed
- [ ] **Storage RLS coverage:** After adding storage policies, test as a non-member user: attempt to GET and PUT to the household image path — confirm both return 403, not 200
- [ ] **Image upload flow:** Test on a real iPhone: select an image from camera roll → confirm compression runs (image < 400 KB before upload) → confirm upload succeeds → confirm image displays → replace the image → confirm the new image displays (not the old cached version)
- [ ] **Admin sub-route active tab:** Navigate to `/admin/items` directly — confirm Admin tab is highlighted in the bottom nav
- [ ] **Recipe duplicate prevention:** Add a recipe where 2 ingredients are already on the target list → tap "Add all" → confirm only the missing ingredients are added and no duplicates appear
- [ ] **List picker empty state:** Open the recipe ingredient add flow on a household with no lists — confirm a "create a list first" prompt appears rather than an empty sheet
- [ ] **Admin sub-routes still protected:** Navigate directly to `/admin/items` in a private browser session (not logged in) — confirm redirect to login, not a blank page or server error
- [ ] **Old route redirects:** After restructure deploy, navigate to `/husstand` and `/butikker` directly — confirm 301 redirect to `/admin/husstand` and `/admin/butikker` respectively
- [ ] **await parent() waterfalls:** Open Network DevTools, navigate to `/admin/items` — confirm server-side load functions do not appear as sequential requests (all admin data should load in one round-trip)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FOUC on dark mode shipped to production | LOW | Add inline script to `app.html`; redeploy; users see fix on next load (no data migration) |
| Tailwind v4 `dark:` classes not activating | LOW | Add `@custom-variant` line to `app.css`; redeploy |
| Storage RLS too permissive (household isolation broken) | MEDIUM | Audit `storage.objects` policies; add path-based household scoping; audit existing files for cross-household path violations; revoke and re-apply policies |
| Duplicate list items from recipe add (live in production) | MEDIUM | Write a migration that deduplicates existing `list_items` rows (keep lowest `id` per `(list_id, item_id)` pair); add unique constraint; deploy upsert-aware add logic |
| Stale images visible across PWA users after image replacement | LOW | Move to versioned filenames going forward; old stale references resolve themselves when service worker cache expires (7-day max on Safari) |
| Admin sub-routes not protected (security gap) | HIGH | Immediately deploy a server hook or `+layout.server.ts` that validates auth for all `/admin/*` routes; audit logs for unauthorized access attempts |
| Old routes missing redirects — users stranded post-upgrade | LOW | Add SvelteKit redirect rules for removed routes; deploy immediately; already-cached broken routes clear on next service worker update |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dark mode FOUC + Tailwind v4 config | Dark mode / Brukerinnstillinger phase | Hard-reload the PWA after toggling dark — no flash; `dark:` classes apply correctly |
| Storage RLS missing policies | Admin hub / item pictures phase (before any upload UI) | Attempt upload and view as non-member user — both return 403 |
| Large image upload failure on free tier | Admin hub / item pictures phase | Upload a 10 MB JPEG from a real phone — compression runs, upload succeeds, output < 400 KB |
| Stale images after replacement | Admin hub / item pictures phase | Replace an item image — new image displays immediately in PWA without hard refresh |
| Bottom nav active state after restructure | Navbar restructure phase | Navigate to `/admin/items` — Admin tab highlighted |
| PWA back-navigation after restructure | Navbar restructure phase | Navigate to old `/husstand` URL — 301 redirect to `/admin/husstand` |
| Admin nested layout waterfall | Admin hub phase | Network DevTools shows single server round-trip on admin page load |
| Recipe duplicate items | Recipes phase | Add a recipe with shared ingredients — no duplicate rows in target list |
| List picker empty state | Recipes phase | Open recipe add flow on household with zero lists — guided empty state appears |
| Storage path traversal via user filenames | Admin hub / item pictures phase | Attempt upload with `../../` in filename — sanitized or rejected |

---

## Sources

- [Tailwind CSS v4 Dark Mode — Official Docs](https://tailwindcss.com/docs/dark-mode) — `@custom-variant` approach, removal of `darkMode` config key; HIGH confidence
- [Implementing Dark Mode in SvelteKit (CaptainCodeman)](https://www.captaincodeman.com/implementing-dark-mode-in-sveltekit) — inline script anti-FOUC pattern; MEDIUM confidence
- [Supabase Storage Access Control — Official Docs](https://supabase.com/docs/guides/storage/security/access-control) — four operation policies (INSERT/SELECT/UPDATE/DELETE), path scoping with `storage.foldername()`; HIGH confidence
- [Supabase Storage File Limits — Official Docs](https://supabase.com/docs/guides/storage/uploads/file-limits) — 50 MB free tier limit, standard upload recommended for <6 MB; HIGH confidence
- [Supabase Storage: Preventing Cached Images (WeWeb Community)](https://community.weweb.io/t/supabase-storage-preventing-cached-images-when-updating-files-replace-storage-file-issue/17601) — same-path upsert caching conflict; MEDIUM confidence
- [SvelteKit Load Functions — `await parent()` Official Docs](https://svelte.dev/docs/kit/load) — waterfall warning, parallel fetch pattern; HIGH confidence
- [SvelteKit GitHub Issue — `await parent()` causes parent layout load to re-run](https://github.com/sveltejs/kit/issues/8579) — confirmed waterfall behavior; HIGH confidence
- [SvelteKit Advanced Layouts — Joy of Code](https://joyofcode.xyz/sveltekit-advanced-layouts) — route group layout inheritance, breaking out of layouts; MEDIUM confidence
- [Client-side image compression with Supabase Storage (DEV Community)](https://dev.to/mikeesto/client-side-image-compression-with-supabase-storage-1193) — `browser-image-compression` approach; MEDIUM confidence

---
*Pitfalls research for: HandleAppen v1.2 — navbar restructure, recipes, admin hub, item pictures, dark mode added to existing SvelteKit + Supabase PWA*
*Researched: 2026-03-13*
