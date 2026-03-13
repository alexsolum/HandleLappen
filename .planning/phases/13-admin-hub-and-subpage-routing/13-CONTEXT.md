# Phase 13: Admin Hub and Subpage Routing - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Activate the Admin hub's stub rows into real navigation links, and build Butikker, Husstand, and Historikk as functioning Admin subpages. Items and Brukerinnstillinger remain disabled stubs for future phases. Historikk moves from /anbefalinger to /admin/historikk.

</domain>

<decisions>
## Implementation Decisions

### Back navigation
- All three Admin subpages (Butikker, Husstand, Historikk) use the same back-navigation pattern
- A small `← Admin` text link positioned above the `h1` page title on each subpage
- Link uses `href="/admin"` (not `history.back()`) — safe for PWA users who land directly via 301 redirect

### Historikk placement
- Historikk is moved to `/admin/historikk` and removed from `/anbefalinger`
- `/anbefalinger` becomes a pure recommendations page — no history section
- `/admin/historikk` shows the same content as the current anbefalinger history section: date-grouped sessions, expandable per session, add-back-to-list functionality on each item
- `/admin/historikk` has a `Historikk` h1 with `← Admin` above it

### Hub partial activation
- Butikker, Husstand, and Historikk rows become full-opacity `<a>` links with real hrefs
- Items and Brukerinnstillinger rows remain as `<div>` elements with `opacity-50` — no label, no stub page
- No "Kommer snart" badge on disabled rows — family members don't need an explanation

### Husstand subpage content
- `/admin/husstand` content is identical to existing `/husstand` page (members list + invite code)
- **Logout button removed** — logout belongs in Brukerinnstillinger (Phase 16)
- The `← Admin` link replaces the logout as the only footer-area affordance

### Claude's Discretion
- Exact styling of the `← Admin` link (font size, arrow character vs SVG, color)
- Whether `← Admin` is styled as a breadcrumb or a subtle text link
- Load function structure for `/admin/historikk` (reuse `createHistoryQuery` from `$lib/queries/history.ts`)

</decisions>

<specifics>
## Specific Ideas

- No specific references mentioned — standard implementation expected
- The Phase 12 admin hub already has the exact disabled-row structure; activation is a minimal change (swap `<div>` → `<a href="...">`, remove `opacity-50`)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/(protected)/admin/+page.svelte`: Hub stub already exists with 5 disabled rows — activate 3 by replacing `<div>` with `<a href="/admin/butikker">` etc.
- `src/routes/(protected)/husstand/+page.svelte`: Full Husstand content (members list, invite code, logout) — port to admin subpage, remove logout section
- `src/routes/(protected)/butikker/+page.svelte`: Full Butikker content (store management) — port to admin subpage as-is
- `src/lib/queries/history.ts`: `createHistoryQuery()` fetches date-grouped history — use directly in `/admin/historikk` load function
- `src/routes/(protected)/anbefalinger/+page.svelte`: Contains both recommendations AND history — split this file: keep recommendations, remove history section

### Established Patterns
- Admin subpage load functions must read `householdId` from `locals` directly — **not via `await parent()`** — to avoid parallel SvelteKit load waterfalls (STATE.md decision)
- Page headers use `<h1 class="text-2xl font-semibold text-gray-900">` pattern
- Protected routes under `src/routes/(protected)/`

### Integration Points
- `/admin/+page.svelte`: Activate 3 rows as `<a>` links, leave Items/Brukerinnstillinger as dim `<div>` stubs
- `/admin/husstand/+page.svelte`: Port husstand content, add `← Admin` breadcrumb, remove logout
- `/admin/butikker/+page.svelte`: Port butikker content, add `← Admin` breadcrumb
- `/admin/historikk/+page.svelte` (new route): New file with history content + `← Admin` breadcrumb
- `/anbefalinger/+page.svelte`: Remove `historyGroups` section and associated load logic

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-admin-hub-and-subpage-routing*
*Context gathered: 2026-03-13*
