# Phase 13 Research: Admin Hub and Subpage Routing

## Current State Analysis

### 1. Admin Hub
- **File:** `src/routes/(protected)/admin/+page.svelte`
- **Status:** Contains 5 rows as static `div` elements with `opacity-50`.
- **Implementation:** Uses a `sections` array and an `each` loop.

### 2. Husstand Subpage
- **Files:**
  - `src/routes/(protected)/husstand/+page.svelte` (Existing content)
  - `src/routes/(protected)/husstand/+page.server.ts` (Already redirects to `/admin/husstand`)
  - `src/routes/(protected)/admin/husstand/+page.svelte` (Current stub)
- **Content to Port:** Members list, invite code.
- **Change:** Remove logout button, add `← Admin` breadcrumb.

### 3. Butikker Subpage
- **Files:**
  - `src/routes/(protected)/butikker/+page.svelte` (Existing content)
  - `src/routes/(protected)/butikker/+page.server.ts` (Already redirects to `/admin/butikker`)
  - `src/routes/(protected)/admin/butikker/+page.svelte` (Current stub)
- **Content to Port:** Store list, "Legg til butikk" UI, "Standard rekkefølge" link.
- **Change:** Add `← Admin` breadcrumb.

### 4. Historikk Subpage
- **Files:**
  - `src/routes/(protected)/anbefalinger/+page.svelte` (Currently contains history)
  - `src/routes/(protected)/anbefalinger/+page.server.ts` (Loads history groups)
  - `/admin/historikk` (Does not exist yet)
- **Goal:** Move history groups to `/admin/historikk`, keep recommendations in `/anbefalinger`.
- **Logic:** `createHistoryQuery()` from `$lib/queries/history.ts` will be reused.

## Technical Details

### Back Navigation Link Pattern
- Needs to be consistent across all three subpages.
- Positioned above the `h1`.
- Text: `← Admin`
- Link: `href="/admin"`

### Data Loading
- Must read `householdId` from `locals` directly in subpage load functions (as per STATE.md).
- Reuse `createHistoryQuery(locals.supabase)` for history.
- `husstand` and `butikker` already have their data loading logic elsewhere or use queries.
  - `husstand` seems to use `data.members` and `data.inviteCode`. I need to find where those are loaded.

Let's check `src/routes/(protected)/+layout.server.ts` to see if `members` and `inviteCode` are provided globally.
