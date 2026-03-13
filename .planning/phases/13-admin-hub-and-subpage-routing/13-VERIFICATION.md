# Phase 13 Verification: Admin Hub and Subpage Routing

## Acceptance Criteria
- [ ] `/admin` has active links for Butikker, Husstand, and Historikk.
- [ ] `/admin/butikker` shows the store list and has a `← Admin` breadcrumb.
- [ ] `/admin/husstand` shows the member list, invite code, has a `← Admin` breadcrumb, and no logout button.
- [ ] `/admin/historikk` shows date-grouped history and has a `← Admin` breadcrumb.
- [ ] `/anbefalinger` only shows recommendations (Forslag) and no history section.
- [ ] `/husstand` and `/butikker` (legacy URLs) redirect to the new admin subpages.
- [ ] All breadcrumbs work and lead back to the Admin hub.
- [ ] All new subpages follow the brand and consistent styling.
- [ ] Load functions avoid parallel load waterfalls by not using `await parent()`.

## Evidence Loop
- Playwright tests passed: `tests/admin.spec.ts`.
- Manual verification of breadcrumbs.
- Manual verification of redirects.
