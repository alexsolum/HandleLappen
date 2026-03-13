# Phase 12: Navigation Restructure - Research

**Researched:** 2026-03-13
**Domain:** SvelteKit routing, bottom navigation active-state logic, 301 redirects, stub pages
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rename "Lister" to "Handleliste" — keep the existing list icon (three lines with dots)
- Remove "Husstand" and "Butikker" tabs entirely
- Keep "Anbefalinger" tab with existing heart icon
- Add "Oppskrifter" tab — use a book / open book icon
- Add "Admin" tab — use a gear / settings cog icon
- Tab order: Handleliste, Oppskrifter, Anbefalinger, Admin
- Fix `isActive` logic to use prefix matching instead of exact pathname matching
- Admin tab highlights on any route starting with `/admin`
- Oppskrifter tab highlights on any route starting with `/oppskrifter`
- Handleliste highlights on `/` and `/lister/*`
- Anbefalinger tab highlights on `/anbefalinger`
- `/husstand` → 301 permanent redirect to `/admin/husstand`
- `/butikker` → 301 permanent redirect to `/admin/butikker`
- Implement redirects as SvelteKit `+page.server.ts` on the old routes
- Phase 12 must pre-create `/admin/husstand` and `/admin/butikker` as sub-stubs so the redirect lands without 404
- `/oppskrifter` — minimal placeholder: page title "Oppskrifter" + "Kommer snart" note
- `/admin` — rough hub skeleton: 5 items as visually disabled/greyed-out rows with chevrons
- `/admin/husstand` and `/admin/butikker` — minimal stubs (title only)
- Keep inline SVG pattern already used in BottomNav — no icon library

### Claude's Discretion
- Exact gear/book SVG path data (inline SVG matching existing icon style in BottomNav)
- Whether disabled admin rows use `opacity-50` or a different treatment
- Exact "Kommer snart" copy or equivalent Norwegian placeholder text
- Header or section styling on the Admin hub skeleton

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User sees four bottom nav tabs: Handleliste, Oppskrifter, Anbefalinger, Admin | BottomNav.svelte `tabs` array replacement + new icon snippets; prefix-based `isActive` logic |
| NAV-02 | Historikk is no longer a bottom nav tab and is accessible from the Admin hub instead | Remove Husstand/Butikker tabs; Admin hub stub shows Historikk as a disabled row; redirect old routes |
</phase_requirements>

---

## Summary

Phase 12 modifies exactly one component (`BottomNav.svelte`), adds four new route directories, and converts two existing route directories into 301 redirect sources. The codebase already uses SvelteKit 2.x with Svelte 5 runes and Tailwind v4 — all patterns needed for this phase are already established in the project.

The only non-trivial logic change is the `isActive` function. The current implementation uses strict equality (`page.url.pathname === href`), which fails for sub-routes. The fix is `startsWith` with a special-case for `/` (exact match only, to avoid matching everything) and for `/anbefalinger` (exact match because the href includes a query string at runtime). All new icon SVGs must follow the existing inline SVG pattern with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `class="h-5 w-5"`, and `stroke-width="2"`.

The Admin hub stub is the one page with more than minimal content: it shows 5 future sections as greyed-out rows with right-facing chevrons. These are purely visual — no links, no load logic. Phase 13 activates them. The `/oppskrifter` page is a two-line placeholder. Both new stub directories live under `src/routes/(protected)/` to inherit the existing auth guard in `+layout.server.ts`.

**Primary recommendation:** Make the smallest possible change set — replace BottomNav tabs array, fix isActive, add four route directories with minimal files, add two redirect server files. No layout changes needed.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sveltejs/kit | ^2.50.2 | Routing, `redirect()`, `+page.server.ts` | Project framework |
| svelte | ^5.51.0 | Svelte 5 runes, `$app/state` `page` store | Project framework |
| tailwindcss | ^4.2.1 | Styling, Tailwind v4 class utilities | Project CSS |

**Installation:** None required. Zero new npm packages for this phase.

---

## Architecture Patterns

### Recommended File Structure for New Routes

```
src/routes/(protected)/
├── oppskrifter/
│   └── +page.svelte          # Minimal "Kommer snart" stub
├── admin/
│   ├── +page.svelte          # Hub skeleton with 5 disabled rows + chevrons
│   ├── husstand/
│   │   └── +page.svelte      # Title-only stub (redirect target)
│   └── butikker/
│       └── +page.svelte      # Title-only stub (redirect target)
├── husstand/
│   ├── +page.server.ts       # redirect(301, '/admin/husstand') — REPLACE existing load
│   └── +page.svelte          # Keep existing file (redirect fires server-side before render)
└── butikker/
    └── +page.server.ts       # redirect(301, '/admin/butikker') — NEW file (none exists yet)
```

**Key observation from code audit:** `src/routes/(protected)/husstand/+page.server.ts` currently exists with a full data load. It must be replaced entirely with a redirect. `src/routes/(protected)/butikker/+page.server.ts` does NOT exist — a new file must be created.

### Pattern 1: SvelteKit 301 Redirect in +page.server.ts

**What:** Server-side permanent redirect using `@sveltejs/kit`'s `redirect` helper.
**When to use:** Old URLs that must forward to new locations without rendering a page.

```typescript
// src/routes/(protected)/husstand/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  redirect(301, '/admin/husstand')
}
```

```typescript
// src/routes/(protected)/butikker/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  redirect(301, '/admin/butikker')
}
```

**Important:** In SvelteKit 2.x, `redirect()` is called without `throw` — it is a function that throws internally. Both forms work but `redirect(301, url)` without `throw` is the current convention in this codebase (confirmed in `/logg-inn` redirect in `husstand/+page.server.ts` which uses `throw redirect(303, '/logg-inn')`). Either form is valid; match the existing codebase style.

**Existing style confirmed:** The project uses `throw redirect(303, '/logg-inn')` in `husstand/+page.server.ts`. Use `throw redirect(301, '/admin/husstand')` to stay consistent.

### Pattern 2: Prefix-Based isActive Logic

**What:** Replace exact-match `isActive` with `startsWith` for sub-route awareness.
**When to use:** Any bottom nav tab that owns a route subtree deeper than one level.

```typescript
// In BottomNav.svelte — replace the existing isActive function
function isActive(tab: Tab, href: string) {
  const path = page.url.pathname
  if (tab.href === '/') return path === '/'
  if (tab.href === '/anbefalinger') return path === '/anbefalinger'
  return path === tab.href || path.startsWith(tab.href + '/')
}
```

**Why `startsWith(href + '/')` not just `startsWith(href)`:** Prevents `/admin` matching `/admin-something` if such a route ever exists. Appending `/` ensures only genuine child routes match.

**Handleliste edge case:** The tab href is `/` which would match every route with plain `startsWith`. Use exact match for `/`. The existing list routes are under `/lister/[id]` — these do NOT start with `/`, so the Handleliste tab will only highlight on `/` itself. This is the documented behaviour in CONTEXT.md ("Handleliste highlights on `/` and `/lister/*`"). To highlight on `/lister/*` too, the logic needs a second condition:

```typescript
function isActive(tab: Tab, href: string) {
  const path = page.url.pathname
  if (tab.href === '/') return path === '/' || path.startsWith('/lister/')
  if (tab.href === '/anbefalinger') return path === '/anbefalinger'
  return path === tab.href || path.startsWith(tab.href + '/')
}
```

### Pattern 3: New Tab Type and Tabs Array

**What:** Extend the `Tab` type to include new icon names, replace the `tabs` array.

```typescript
// Replace in BottomNav.svelte
type Tab = {
  label: string
  href: string
  active: boolean
  icon: 'lists' | 'recommendations' | 'book' | 'gear'
}

const tabs: Tab[] = [
  { label: 'Handleliste', href: '/', active: true, icon: 'lists' },
  { label: 'Oppskrifter', href: '/oppskrifter', active: true, icon: 'book' },
  { label: 'Anbefalinger', href: '/anbefalinger', active: true, icon: 'recommendations' },
  { label: 'Admin', href: '/admin', active: true, icon: 'gear' },
]
```

The offline badge logic (`offlineStore.pendingCount`, `offlineStore.isOnline`) uses `tab.href === '/'` to decide where to show the badge. This condition still works correctly after the rename — no change needed there.

### Pattern 4: Inline SVG Icons (book and gear)

**What:** Add two new icon branches to the `{#snippet tabIcon}` block matching the existing style.
**Source:** Heroicons v2 outline set, which matches the existing SVG style in the component.

```svelte
{:else if icon === 'book'}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
{:else if icon === 'gear'}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.869a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
```

**Confidence:** MEDIUM — SVG path data above is from Heroicons v2 outline set which matches the style of the existing icons in BottomNav. The planner/implementor should verify the visual result in browser and may adjust. The existing icons in BottomNav appear to be custom or Heroicons-based; the style parameters match exactly.

### Pattern 5: Admin Hub Stub Page Structure

**What:** The Admin page at `/admin/+page.svelte` is the only stub with non-trivial content — shows 5 future sections as disabled rows.

```svelte
<!-- src/routes/(protected)/admin/+page.svelte -->
<div class="mx-auto max-w-lg px-4 py-6">
  <header class="mb-5">
    <h1 class="text-2xl font-semibold text-gray-900">Admin</h1>
  </header>

  <div class="space-y-2">
    {#each sections as section}
      <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 opacity-50">
        <span class="text-sm font-medium text-gray-900">{section}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4 text-gray-400">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 18 6-6-6-6" />
        </svg>
      </div>
    {/each}
  </div>
</div>
```

The 5 sections are: Butikker, Husstand, Historikk, Items, Brukerinnstillinger. They render as non-interactive `<div>` elements (not `<a>` or `<button>`) with `opacity-50`. Phase 13 converts them to real links.

### Anti-Patterns to Avoid

- **Linking to /husstand or /butikker in Admin stub:** The stub rows are disabled divs, not links. Do not add hrefs to the admin hub rows in Phase 12 — Phase 13 activates them.
- **Using `startsWith(href)` without trailing slash:** `/admin` would also match a hypothetical `/admin-settings` route. Always append `/` to the prefix check.
- **Using `throw redirect` without the `throw` keyword:** SvelteKit 2.x `redirect()` throws internally; calling it without `throw` in a return path works but can confuse TypeScript — match existing codebase style (`throw redirect(...)`).
- **Calling `await parent()` in new admin load functions:** STATE.md explicitly flags this as creating serialized load waterfalls. Admin stub pages in this phase have no load functions at all (no data needed), so this is moot here but important to remember for Phase 13.
- **Creating a `+page.server.ts` in `/oppskrifter` or `/admin`:** These stub pages need no server-side data in Phase 12 — no load function required, which means no auth guard per file. Auth is handled by the parent `(protected)/+layout.server.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 301 redirects | Custom redirect component or JS `window.location` | `throw redirect(301, url)` in `+page.server.ts` | Server-side redirect fires before any client render; browser/PWA history updates correctly |
| Auth guard on new pages | Per-page session check in each new stub | The existing `(protected)/+layout.server.ts` guard | New routes under `(protected)/` automatically inherit the guard |
| Icon SVG library | Installing heroicons npm package | Inline SVG path data in the existing snippet pattern | Project decision: no new npm packages; matches existing BottomNav style |

**Key insight:** Every new route in `(protected)/` gets auth protection for free from the layout. No auth code in stub `+page.svelte` or `+page.server.ts` files.

---

## Common Pitfalls

### Pitfall 1: isActive matches too broadly on root route
**What goes wrong:** `path.startsWith('/')` is always true — every page highlights the Handleliste tab.
**Why it happens:** `/` is a prefix of every URL.
**How to avoid:** Use exact match `path === '/'` for the root tab, combined with `path.startsWith('/lister/')` for the list detail route.
**Warning signs:** All four tabs appear active simultaneously.

### Pitfall 2: Redirect fires but destination is a 404
**What goes wrong:** `/husstand` redirects to `/admin/husstand` but that route directory doesn't exist yet, yielding a 404.
**Why it happens:** Redirect and destination must both be created in the same commit/deploy.
**How to avoid:** Create `/admin/husstand/+page.svelte` and `/admin/butikker/+page.svelte` stub files before or alongside the redirect files.
**Warning signs:** Browser shows 404 after following a redirect from /husstand.

### Pitfall 3: Offline badge logic breaks after tab rename
**What goes wrong:** The offline badge (pendingCount indicator) stops appearing because code checked for `tab.label === 'Lister'` instead of `tab.href === '/'`.
**Why it happens:** If badge logic was label-based, the rename breaks it.
**How to avoid:** Confirm the existing code already uses `tab.href === '/'` — it does (line 75 of BottomNav.svelte). No change needed.
**Warning signs:** Orange offline indicator never appears on the Handleliste tab.

### Pitfall 4: Anbefalinger href has query string at runtime
**What goes wrong:** `isActive` compares `page.url.pathname` (no query string) to `recommendationHref` which includes `?list=...` — the startsWith check fails on the query string.
**Why it happens:** `recommendationHref` is the full href including query string.
**How to avoid:** The `isActive` function already receives `href` as a second argument but the active check should compare against `tab.href` (the base path `/anbefalinger`), not the runtime `href` variable with its query string. The existing special case for Anbefalinger (`page.url.pathname === '/anbefalinger'`) is correct and must be preserved.
**Warning signs:** Anbefalinger tab never highlights even when user is on /anbefalinger.

### Pitfall 5: Tailwind v4 dark mode
**What goes wrong:** Using `dark:` variant classes doesn't work without the proper configuration.
**Why it happens:** Tailwind v4 uses `@custom-variant` in `app.css`, not a `darkMode` config key. This is flagged in STATE.md.
**How to avoid:** Phase 12 stub pages use only light-mode Tailwind classes — no dark mode styling needed. This pitfall only matters in later phases.

---

## Code Examples

### Redirect — replacing husstand's load function
```typescript
// src/routes/(protected)/husstand/+page.server.ts
// REPLACES the existing full data-loading load function entirely
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  throw redirect(301, '/admin/husstand')
}
```

### Redirect — new butikker server file
```typescript
// src/routes/(protected)/butikker/+page.server.ts (NEW FILE — does not currently exist)
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  throw redirect(301, '/admin/butikker')
}
```

### Oppskrifter stub page
```svelte
<!-- src/routes/(protected)/oppskrifter/+page.svelte -->
<div class="mx-auto max-w-lg px-4 py-6">
  <h1 class="text-2xl font-semibold text-gray-900">Oppskrifter</h1>
  <p class="mt-2 text-sm text-gray-500">Kommer snart.</p>
</div>
```

### Admin husstand/butikker sub-stubs
```svelte
<!-- src/routes/(protected)/admin/husstand/+page.svelte -->
<div class="mx-auto max-w-lg px-4 py-6">
  <h1 class="text-2xl font-semibold text-gray-900">Husstand</h1>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `page.url.pathname === href` exact match | `startsWith` prefix match with root/anbefalinger exceptions | Phase 12 | Sub-routes correctly highlight their parent tab |
| 4 tabs: Lister, Husstand, Butikker, Anbefalinger | 4 tabs: Handleliste, Oppskrifter, Anbefalinger, Admin | Phase 12 | Admin replaces two management tabs; recipes get top-level entry point |
| Husstand and Butikker as top-level protected routes | Husstand and Butikker as Admin sub-routes | Phase 12 | Old URLs 301-redirect so PWA back-history and bookmarks still work |

---

## Open Questions

1. **Anbefalinger `isActive` uses exact pathname match — is that sufficient?**
   - What we know: Anbefalinger has no sub-routes currently; href includes a query string at runtime
   - What's unclear: If a future sub-route like `/anbefalinger/detail` is added, the tab won't highlight there
   - Recommendation: Keep exact match for now per CONTEXT.md; Phase 12 scope doesn't introduce sub-routes here

2. **The existing `husstand/+page.svelte` — keep or delete?**
   - What we know: Redirects fire server-side before any page render; the `.svelte` file is never rendered if `+page.server.ts` throws a redirect
   - What's unclear: Whether to clean up the now-unreachable `.svelte` file
   - Recommendation: Leave it in place for Phase 12. It's dead code but harmless; deleting it is a cleanup task for a future phase.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/mobile-layout.spec.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Four tabs visible: Handleliste, Oppskrifter, Anbefalinger, Admin | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ Wave 0 |
| NAV-01 | Active tab highlights correctly on sub-routes (e.g., /admin/husstand highlights Admin) | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ Wave 0 |
| NAV-02 | /husstand redirects to /admin/husstand (301) | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ Wave 0 |
| NAV-02 | /butikker redirects to /admin/butikker (301) | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ Wave 0 |
| NAV-01 | Stub pages /oppskrifter and /admin load without error | e2e | `npx playwright test tests/navigation.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/navigation.spec.ts` (once created in Wave 0)
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/navigation.spec.ts` — covers NAV-01 (four tabs, active state on sub-routes, stub pages load) and NAV-02 (redirects)
- [ ] Helpers: can reuse existing `tests/helpers/auth.ts` (`createHouseholdUser`, `deleteTestUser`) — no new helper file needed

*(Existing `tests/mobile-layout.spec.ts` tests `bottom-dock` visibility — these continue to pass as the dock structure does not change, only its contents.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code audit of `src/lib/components/lists/BottomNav.svelte` — current tab structure, isActive logic, icon SVG pattern
- Direct code audit of `src/routes/(protected)/+layout.svelte` — BottomNav import, auth flow
- Direct code audit of `src/routes/(protected)/husstand/+page.server.ts` — existing redirect pattern (`throw redirect(303, ...)`)
- Direct code audit of `package.json` — confirmed no new packages needed, versions verified
- `.planning/phases/12-navigation-restructure/12-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Heroicons v2 outline SVG paths for book and gear icons — visual match to existing icon style needs browser verification

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing dependencies confirmed from package.json
- Architecture: HIGH — derived entirely from direct code audit of the actual source files
- Pitfalls: HIGH — isActive root-route and query-string edge cases confirmed by reading the actual code

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable framework; SvelteKit routing conventions do not change frequently)
