# Phase 13 Roadmap: Admin Hub and Subpage Routing

## Goal
Activate the Admin hub's stub rows into real navigation links, and build Butikker, Husstand, and Historikk as functioning Admin subpages.

## Slices

### 13.1: Admin Hub Activation
- Update `src/routes/(protected)/admin/+page.svelte` to turn stubs into real links for Butikker, Husstand, and Historikk.
- Keep Items and Brukerinnstillinger as disabled stubs.

### 13.2: Husstand Subpage Port
- Move content from `src/routes/(protected)/husstand/+page.svelte` to `src/routes/(protected)/admin/husstand/+page.svelte`.
- Create `src/routes/(protected)/admin/husstand/+page.server.ts` to load members and invite code.
- Add `← Admin` breadcrumb.
- Remove logout button.

### 13.3: Butikker Subpage Port
- Move content from `src/routes/(protected)/butikker/+page.svelte` to `src/routes/(protected)/admin/butikker/+page.svelte`.
- Add `← Admin` breadcrumb.

### 13.4: Historikk Subpage & Cleanup
- Create `/admin/historikk` route (new folder).
- Create `src/routes/(protected)/admin/historikk/+page.server.ts` to load history.
- Create `src/routes/(protected)/admin/historikk/+page.svelte` (extract history from `/anbefalinger`).
- Update `src/routes/(protected)/anbefalinger/` to remove history logic and UI.

## Verification
- Navigating to `/admin` shows active links.
- Clicking "Butikker" goes to `/admin/butikker`.
- Clicking "Husstand" goes to `/admin/husstand`.
- Clicking "Historikk" goes to `/admin/historikk`.
- All subpages have `← Admin` breadcrumb that works.
- `/anbefalinger` no longer shows history.
- `/husstand` and `/butikker` still redirect (301) to the new locations.
