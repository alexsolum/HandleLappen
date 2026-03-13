# Phase 12: Navigation Restructure - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the four existing bottom nav tabs (Lister, Husstand, Butikker, Anbefalinger) with four new tabs (Handleliste, Oppskrifter, Anbefalinger, Admin), fix active-state highlighting to work on sub-routes, redirect the old /husstand and /butikker routes with 301s, and create stub pages for /oppskrifter and /admin. Content for the new tabs is built in Phases 13–16.

</domain>

<decisions>
## Implementation Decisions

### Tab labels and icons
- Rename "Lister" to "Handleliste" — keep the existing list icon (three lines with dots)
- Remove "Husstand" and "Butikker" tabs entirely
- Keep "Anbefalinger" tab with existing heart icon
- Add "Oppskrifter" tab — use a book / open book icon
- Add "Admin" tab — use a gear / settings cog icon
- Tab order: Handleliste, Oppskrifter, Anbefalinger, Admin

### Active tab detection
- Fix `isActive` logic to use prefix matching instead of exact pathname matching
- Admin tab should highlight on any route starting with `/admin`
- Oppskrifter tab should highlight on any route starting with `/oppskrifter`
- Handleliste tab highlights on `/` and `/lister/*`
- Anbefalinger tab highlights on `/anbefalinger`

### Redirect behavior
- `/husstand` → 301 permanent redirect to `/admin/husstand`
- `/butikker` → 301 permanent redirect to `/admin/butikker`
- Implement as SvelteKit `+page.server.ts` redirects on the old routes
- Phase 12 must pre-create `/admin/husstand` and `/admin/butikker` as sub-stubs so the redirect lands correctly (not on a 404)

### Stub page content
- `/oppskrifter` — minimal placeholder: page title "Oppskrifter" + "Kommer snart" note. No content beyond confirming it loads.
- `/admin` — rough hub skeleton: shows the 5 items that will be linked here (Butikker, Husstand, Historikk, Items, Brukerinnstillinger) as tappable-looking rows that are visually disabled/greyed out with chevrons. Phase 13 activates them with real links and content.
- `/admin/husstand` and `/admin/butikker` — minimal stubs (title only) to satisfy the redirects from old URLs. Phase 13 fills in content.

### Claude's Discretion
- Exact gear/book SVG path data (inline SVG matching the existing icon style in BottomNav)
- Whether disabled admin rows use `opacity-50` or a different treatment
- Exact "Kommer snart" copy or equivalent Norwegian placeholder text
- Header or section styling on the Admin hub skeleton

</decisions>

<specifics>
## Specific Ideas

- The Admin stub hub is the one exception to "minimal stub" — the user wants it to show the 5 future sections as disabled rows with chevrons so the structure is visible and Phase 13 just activates them
- Keep the inline SVG pattern already used in BottomNav — no icon library needed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/lists/BottomNav.svelte`: primary file to modify — replace tabs array, add new icons, fix isActive logic
- `src/routes/(protected)/+layout.svelte`: imports BottomNav; no changes needed here beyond ensuring new routes get proper padding
- Existing icon SVGs in BottomNav: lists icon (keep), home icon (remove), stores icon (remove), heart/recommendations icon (keep)

### Established Patterns
- Icons are inline SVGs within a `{#snippet tabIcon}` block in BottomNav — add new entries for `book` and `gear` icon types
- Active detection currently: `page.url.pathname === href` — change to `page.url.pathname.startsWith(href)` with special cases for `/` (exact only) and `/anbefalinger`
- Protected routes live under `src/routes/(protected)/` — new `/oppskrifter` and `/admin` directories go here
- Redirects use SvelteKit `redirect(301, '...')` from `@sveltejs/kit` in `+page.server.ts`

### Integration Points
- `BottomNav` `tabs` array is hardcoded — replace all 4 entries
- New route directories needed: `src/routes/(protected)/oppskrifter/`, `src/routes/(protected)/admin/`, `src/routes/(protected)/admin/husstand/`, `src/routes/(protected)/admin/butikker/`
- Old route directories get redirect files: `src/routes/(protected)/husstand/+page.server.ts`, `src/routes/(protected)/butikker/+page.server.ts` (the existing +page.svelte files can stay or be removed — redirects fire server-side before render)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-navigation-restructure*
*Context gathered: 2026-03-13*
