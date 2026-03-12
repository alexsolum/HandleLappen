# Phase 1: Auth and Household Foundation - Research

**Researched:** 2026-03-08
**Domain:** SvelteKit + Supabase Auth (email/password + Google OAuth), RLS with SECURITY DEFINER, household schema, invite-code onboarding, shadcn-svelte UI scaffold
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Household joining (v1):** Short alphanumeric invite code (e.g., KIWI-4821 — 8 chars, readable, typeable). Invite code is shown in the household members view (HOUS-02) so the creator can share it via SMS/WhatsApp. Code is entered during onboarding only — no post-onboarding join flow. A user belongs to exactly one household — simplifies RLS (`my_household_id()` returns a single value).
- **UI scaffold:** Tailwind CSS for styling. shadcn-svelte as the component library (components copied into codebase, no runtime dependency). Mobile-first layout — this is a grocery shopping app used in-store on a phone; desktop is secondary.
- **Auth screens:** Norwegian language from day 1 — "Logg inn", "Opprett konto", "Fortsett med Google". Separate screens: `/logg-inn` and `/registrer` (not a combined tab view). Lightly branded — app name/logo at top, brand color applied; not bare but not over-designed. Green-based color palette (grocery theme — fits Rema 1000 / Kiwi context).
- **Onboarding flow:** After signup: straight to `/velkommen` — a single screen with two sections: "Opprett husstand" (name input + create button) and "Bli med i husstand" (invite code input + join button), separated by "eller". Household name is user-chosen freeform (e.g., "Familie Hansen", "Hjemme"). After completing onboarding → redirect to home/lists screen (Phase 2's landing screen). If an authenticated user has no household_id, always redirect to `/velkommen` onboarding — applies to sign-in too, not just signup.

### Claude's Discretion

- Loading/error states on auth forms
- Exact button/input sizing and spacing
- Invite code generation algorithm (server-side, collision-resistant)
- Form validation error messages

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create an account with email and password | `supabase.auth.signUp()` API, form validation patterns, redirect to `/velkommen` after first signup |
| AUTH-02 | User can sign in with Google OAuth | `signInWithOAuth({ provider: 'google' })`, PKCE callback route `/auth/callback/+server.ts`, Google Cloud Console setup |
| AUTH-03 | User session persists across browser refresh and app reopen | Cookie-based sessions via `@supabase/ssr`, `createServerClient` in hooks.server.ts, `onAuthStateChange` listener in layout |
| HOUS-01 | User can create a household (family group) during onboarding | `households` table schema, server-side invite code generation (pgcrypto), profile `household_id` update, RLS via `my_household_id()` |
| HOUS-02 | User can view the members of their household | `profiles` table select with `household_id = my_household_id()`, display invite code for sharing |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire security and identity foundation that every downstream phase depends on. The work splits into three logical layers: (1) SvelteKit project scaffold with Supabase client wiring, env vars, and TypeScript locals typing; (2) auth flows covering email/password and Google OAuth with cookie-based SSR sessions and server-side route guards; and (3) the household data model with a SECURITY DEFINER RLS function that all later tables will reference.

The stack is well-documented and the patterns are stable. The two main precision areas are: correctly implementing `@supabase/ssr` with `createServerClient` in `hooks.server.ts` (using `getUser()` not `getSession()` for server-side validation), and establishing the `my_household_id()` SECURITY DEFINER function before writing any other RLS policies — this function is the load-bearing element that prevents infinite recursion across all future household-scoped tables.

shadcn-svelte v1 with Tailwind v4 works cleanly as a greenfield setup using the `@latest` CLI. The invite code onboarding is a simple two-branch screen (`/velkommen`) with a server action that either inserts a new household or looks up an existing one by code.

**Primary recommendation:** Scaffold the project, wire Supabase SSR auth, establish `my_household_id()` + household schema, then build auth UIs in that order — each layer depends on the one before it.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.53.4 | App framework, SSR, routing, server hooks | Project-decided framework; compiles to minimal JS; native server hooks for auth middleware |
| Svelte | 5.53.7 | UI component language with runes | Project-decided; $state/$derived replace stores; `$effect` replaces lifecycle hooks |
| TypeScript | 5.9.3 | End-to-end type safety | Supabase generates schema types; auth locals need typed interfaces |
| @supabase/supabase-js | 2.98.0 | Auth, DB queries, realtime | Official Supabase JS client — use for all Supabase access |
| @supabase/ssr | 0.9.0 | Cookie-based SSR auth for SvelteKit | Required for server-side sessions; replaces deprecated `@supabase/auth-helpers-sveltekit` |
| Tailwind CSS | 4.2.1 | Utility styling | Project-decided; v4 uses `@tailwindcss/vite` plugin, no PostCSS config |
| @tailwindcss/vite | 4.2.1 | Vite plugin for Tailwind v4 | Required companion to Tailwind v4 on SvelteKit |
| shadcn-svelte | 1.1.1 | Accessible component library | Project-decided; v1 is Svelte 5 + Tailwind v4 native; components copied into `$lib/components/ui/` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase CLI | latest | Local dev stack (Postgres + Auth + Realtime) | Run `npx supabase start` for local development; required for migration authoring |
| bits-ui | peer | shadcn-svelte's headless primitives | Installed automatically by shadcn-svelte init; provides accessible dialog, popover, input primitives |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-sveltekit | auth-helpers is deprecated; do not use |
| Cookie-based SSR sessions | JWT in localStorage | localStorage sessions are accessible to XSS; cookies with HttpOnly flag are safer for a family app |
| shadcn-svelte v1 | Skeleton UI | Skeleton's Svelte 5 support lagged; shadcn-svelte v1 is actively maintained and runes-native |

### Installation

```bash
# 1. Scaffold project (choose TypeScript + Tailwind when prompted)
npx sv create handleappen --add tailwindcss
cd handleappen

# 2. Supabase client libraries
npm install @supabase/supabase-js @supabase/ssr

# 3. shadcn-svelte component library
npx shadcn-svelte@latest init

# 4. Supabase CLI (dev tooling)
npm install -D supabase

# 5. Start local Supabase stack
npx supabase start
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   ├── +layout.ts            # createBrowserClient; invalidate on auth state change
│   ├── +layout.server.ts     # safeGetSession; pass session + user to client
│   ├── +layout.svelte        # onAuthStateChange listener; nav shell
│   ├── logg-inn/
│   │   └── +page.svelte      # Email/password sign-in form (Norwegian)
│   ├── registrer/
│   │   └── +page.svelte      # Email/password sign-up form (Norwegian)
│   ├── velkommen/
│   │   ├── +page.svelte      # Onboarding: opprett/bli med husstand
│   │   └── +page.server.ts   # Server actions: createHousehold, joinHousehold
│   ├── auth/
│   │   └── callback/
│   │       └── +server.ts    # OAuth PKCE code exchange → redirect
│   └── (protected)/          # Route group: all routes requiring auth + household
│       └── +layout.server.ts # Guard: no session → /logg-inn; no household → /velkommen
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # createBrowserClient (client-only singleton)
│   │   └── server.ts         # createServerClient helper (for use in load fns)
│   └── components/
│       └── ui/               # shadcn-svelte components (Button, Input, Card, etc.)
├── hooks.server.ts            # createServerClient per request; safeGetSession; set locals
└── app.d.ts                   # Locals interface: supabase, safeGetSession, session, user
```

### Pattern 1: Server Hooks with safeGetSession

**What:** `hooks.server.ts` creates a per-request Supabase client, attaches it to `event.locals`, and exposes a `safeGetSession` helper that calls `getUser()` (not `getSession()`) for validated user data.

**When to use:** Every server request. This is the auth middleware layer.

```typescript
// src/hooks.server.ts
// Source: https://supabase.com/docs/guides/getting-started/tutorials/with-sveltekit
import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' })
          })
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() for server-side validation
  // getSession() reads a cookie that can be tampered with by the client
  // getUser() makes a request to the Auth server and validates the JWT
  event.locals.safeGetSession = async () => {
    const { data: { user }, error } = await event.locals.supabase.auth.getUser()
    if (error) return { session: null, user: null }
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    return { session, user }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}
```

### Pattern 2: Root Layout — Pass Session to Client

**What:** `+layout.server.ts` calls `safeGetSession`, passes validated session/user to the client side. `+layout.ts` creates the browser client and listens for auth state changes.

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
  const { session, user } = await safeGetSession()
  return { session, user, cookies: cookies.getAll() }
}
```

```typescript
// src/routes/+layout.ts
// Source: Supabase SvelteKit SSR docs pattern
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  depends('supabase:auth')   // enables invalidate('supabase:auth') to trigger reloads

  const supabase = isBrowser()
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, { global: { fetch } })
    : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        global: { fetch },
        cookies: { getAll: () => data.cookies }
      })

  const { data: { session } } = await supabase.auth.getSession()

  return { supabase, session, user: data.user }
}
```

```svelte
<!-- src/routes/+layout.svelte (auth state change listener) -->
<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'
  let { data, children } = $props()

  onMount(() => {
    const { data: { subscription } } = data.supabase.auth.onAuthStateChange((event, _session) => {
      if (event !== 'INITIAL_SESSION') {
        invalidate('supabase:auth')
      }
    })
    return () => subscription.unsubscribe()
  })
</script>

{@render children()}
```

### Pattern 3: app.d.ts Locals Typing

```typescript
// src/app.d.ts
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'  // generated by supabase gen types

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>
    }
    interface PageData {
      session: Session | null
      user: User | null
    }
  }
}
export {}
```

### Pattern 4: Google OAuth with PKCE Callback

**What:** `signInWithOAuth` redirects to Google, which redirects back to `/auth/callback`. The callback route exchanges the code for a session using PKCE.

```typescript
// In +page.svelte (logg-inn or registrer)
async function signInWithGoogle() {
  const { error } = await data.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}/auth/callback`,
    },
  })
  if (error) console.error(error)
}
```

```typescript
// src/routes/auth/callback/+server.ts
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect(303, next)
    }
  }

  // Return user to error page if code exchange fails
  redirect(303, '/auth/error')
}
```

**Supabase Dashboard configuration required:**
- Authentication → URL Configuration → Redirect URLs: add `http://localhost:5173/auth/callback` (dev) and your production URL
- Authentication → Providers → Google: enable and add Google OAuth Client ID + Secret from Google Cloud Console

### Pattern 5: Protected Route Guard

**What:** A `+layout.server.ts` inside a `(protected)` route group redirects unauthenticated or unhouseholded users.

```typescript
// src/routes/(protected)/+layout.server.ts
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, url }) => {
  const { user } = await safeGetSession()

  if (!user) {
    redirect(303, `/logg-inn?next=${url.pathname}`)
  }

  // Check household membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    redirect(303, '/velkommen')
  }

  return { user }
}
```

### Pattern 6: SECURITY DEFINER Household Helper

**What:** A PostgreSQL function that returns the calling user's `household_id`. SECURITY DEFINER bypasses RLS on the `profiles` table during the lookup, breaking potential recursion chains. Wrapping `auth.uid()` in `(select auth.uid())` caches the result for the query duration instead of re-evaluating per row.

```sql
-- Established in Phase 1, used by every downstream table's RLS policies
create or replace function my_household_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''    -- security hardening: prevents search_path hijacking
  as $$
    select household_id
    from public.profiles
    where id = (select auth.uid())  -- (select ...) caches result per query, not per row
  $$;
```

### Pattern 7: Invite Code Generation (Server-Side)

**What:** Collision-resistant 8-character alphanumeric code generated at household creation time. Uses pgcrypto's `gen_random_bytes` to produce cryptographically random codes. Characters that are visually ambiguous (0/O, 1/l/I) are excluded.

```sql
-- Invite code generator using pgcrypto (UUID-safe character set, no ambiguous chars)
-- Produces e.g. "KIWI-4821" style (8 upper chars, may include hyphen for readability)
create or replace function generate_invite_code()
  returns text
  language sql
  security definer
  set search_path = ''
  as $$
    select upper(
      substr(
        translate(
          encode(extensions.gen_random_bytes(8), 'base64'),
          '+/=0Ool1I',   -- remove ambiguous chars
          'ABCDEFGH'     -- replace with unambiguous alternatives
        ),
        1, 8
      )
    )
  $$;

-- Used as default in the households table
alter table public.households
  alter column invite_code set default generate_invite_code();
```

**Collision rate note:** At household scale (tens to hundreds of households), the Birthday Problem probability of collision with 8 uppercase alphanumeric chars (excluding ambiguous) is negligibly small. Handle the rare collision with a `unique` constraint on `invite_code` — the INSERT will fail and the application retries with a new code (one retry loop).

### Pattern 8: Household Creation and Join Server Actions

```typescript
// src/routes/velkommen/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  createHousehold: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession()
    if (!user) redirect(303, '/logg-inn')

    const formData = await request.formData()
    const name = (formData.get('name') as string)?.trim()

    if (!name || name.length < 2) {
      return fail(400, { error: 'Husstandsnavn er påkrevd' })
    }

    // Create household (invite_code auto-generated via DB default)
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name })
      .select('id')
      .single()

    if (householdError) return fail(500, { error: 'Kunne ikke opprette husstand' })

    // Insert profile linked to new household
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, household_id: household.id, display_name: user.email ?? 'Ukjent' })

    if (profileError) return fail(500, { error: 'Kunne ikke knytte profil til husstand' })

    redirect(303, '/')   // Phase 2's landing screen
  },

  joinHousehold: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession()
    if (!user) redirect(303, '/logg-inn')

    const formData = await request.formData()
    const code = (formData.get('code') as string)?.trim().toUpperCase()

    if (!code) return fail(400, { error: 'Invitasjonskode er påkrevd' })

    const { data: household, error } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', code)
      .single()

    if (error || !household) return fail(404, { error: 'Fant ingen husstand med den koden' })

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, household_id: household.id, display_name: user.email ?? 'Ukjent' })

    if (profileError) return fail(500, { error: 'Kunne ikke bli med i husstand' })

    redirect(303, '/')
  },
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` on the server for security decisions:** `getSession()` reads a cookie that can be tampered. Use `getUser()` (or the `safeGetSession` wrapper that calls `getUser()`) for any server-side auth check. `getSession()` is acceptable only for reading non-sensitive session metadata client-side.
- **Inline subqueries in RLS policies:** `USING (household_id = (select household_id from profiles where id = auth.uid()))` runs the subquery once per row. Use `my_household_id()` instead — it is planned as a single call per query.
- **Writing RLS policies before `my_household_id()` exists:** Later policies reference this function. Establish the function in the first migration and never inline the membership lookup.
- **Using `@supabase/auth-helpers-sveltekit`:** This package is deprecated. Use `@supabase/ssr`.
- **Checking `user_metadata` in RLS policies:** Users can modify their own metadata via the client. Always verify household membership from the `profiles` DB table via `my_household_id()`, not from JWT claims.
- **Not setting `search_path = ''` on SECURITY DEFINER functions:** Without this, a malicious schema can hijack the function via search_path. Always include `set search_path = ''` and use fully-qualified table names (`public.profiles`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom JWT cookie middleware | `@supabase/ssr` createServerClient | Handles cookie serialization, token refresh, HttpOnly flags, SameSite correctly across all browsers |
| OAuth callback and PKCE flow | Manual code exchange + token storage | Supabase Auth + `exchangeCodeForSession()` | PKCE is security-critical; the implementation must be correct. Supabase handles the state parameter, verifier storage, and timing attacks |
| Row-level multi-tenant isolation | Per-table `WHERE user_id = auth.uid()` | RLS policies + `my_household_id()` SECURITY DEFINER | Inline WHERE clauses are bypassable via service role; RLS enforces at the database engine level |
| Auth form components | Custom input/button | shadcn-svelte `<Input>`, `<Button>`, `<Card>` | Accessibility (ARIA, focus management, keyboard nav) is handled correctly by bits-ui primitives |
| Invite code uniqueness | Application-level UUID collision retry loop | Postgres `UNIQUE` constraint on `invite_code` + DB-level `generate_invite_code()` default | Constraint guarantees uniqueness atomically; application only needs to handle the rare constraint violation on INSERT |

**Key insight:** Supabase Auth handles the most security-critical parts (PKCE, token storage, refresh rotation). The correct posture is to configure it and stay out of its way — custom auth implementations introduce vulnerabilities that the library already solves.

---

## Common Pitfalls

### Pitfall 1: getSession() vs getUser() Confusion

**What goes wrong:** Developer calls `event.locals.supabase.auth.getSession()` inside `hooks.server.ts` or a `+page.server.ts` load function to check if the user is authenticated. This reads the session from a cookie that can be tampered with by the client — a malicious user could forge a session cookie that passes this check.

**Why it happens:** `getSession()` is the intuitive name and it's prominently featured in older docs and blog posts. The distinction from `getUser()` is not obvious from the function names.

**How to avoid:** Use `getUser()` for any auth check that has security consequences (route guards, RLS bypass decisions). `getUser()` makes a network request to the Supabase Auth server to validate the JWT against the project's public keys. Wrap it in `safeGetSession` as shown in Pattern 1.

**Warning signs:** Auth guard passes for a request with an expired or forged session cookie.

### Pitfall 2: RLS Infinite Recursion

**What goes wrong:** `profiles` table has an RLS policy that checks household membership. `households` table has an RLS policy that reads from `profiles`. Postgres enters infinite recursion: `households` → `profiles` → `households` → …. Error: `ERROR: infinite recursion detected in policy for relation "profiles"`.

**Why it happens:** The recursion is invisible until RLS is enabled on both tables. Works in testing without RLS enabled, then breaks when policies are applied.

**How to avoid:** The `my_household_id()` SECURITY DEFINER function bypasses RLS on the `profiles` table during execution — breaking the recursion chain. Establish this function in the first migration, before any other table's RLS policies are written.

**Warning signs:** Queries returning empty results or recursion errors immediately after enabling RLS on a second table.

### Pitfall 3: Unhouseholded User Redirect Loop

**What goes wrong:** Protected layout redirects users without `household_id` to `/velkommen`. But if `/velkommen` itself is inside the protected route group, users without a household_id get redirected to `/velkommen`, which redirects them again, causing an infinite redirect loop.

**Why it happens:** The redirect guard checks both `!user` and `!household_id`. The developer forgets that `/velkommen` must be accessible to authenticated-but-unhouseholded users.

**How to avoid:** Keep `/velkommen` outside the `(protected)` route group. The protected group's guard only redirects to `/velkommen` — `/velkommen` is publicly accessible (auth is checked separately within its own server actions). The guard logic: `!user → /logg-inn`; `!household_id → /velkommen`. `/velkommen` page server actions check for `user` directly.

**Warning signs:** Browser showing "Too many redirects" for any authenticated user immediately after signup.

### Pitfall 4: Google OAuth Redirect URL Mismatch

**What goes wrong:** `signInWithOAuth` with `redirectTo: 'http://localhost:5173/auth/callback'` works in development, but the production deployment fails with a redirect URI mismatch error from Google.

**Why it happens:** Both Google Cloud Console (Authorized Redirect URIs) and Supabase Dashboard (Authentication → URL Configuration → Redirect URLs) must list all allowed callback URLs. Forgetting to add the production URL to either list causes OAuth to fail silently from the user's perspective.

**How to avoid:** Before deploying, add both URLs to Google Cloud Console and Supabase Dashboard. Use a consistent `/auth/callback` route. For development, add both `http://localhost:5173/auth/callback` and `http://127.0.0.1:5173/auth/callback` (some browser/OS combos use one or the other).

**Warning signs:** OAuth works in development, throws "redirect_uri_mismatch" in production.

### Pitfall 5: Profile Insert Race on First Google Sign-In

**What goes wrong:** A user signs in with Google for the first time. The OAuth callback route calls `exchangeCodeForSession`. The session now exists. The app redirects to `/velkommen`. But if a `profiles` insert is triggered somewhere in the callback (e.g., a trigger), and the client also attempts a profiles SELECT in the layout load, a race condition can occur where the profile doesn't exist yet when the layout load runs.

**Why it happens:** `exchangeCodeForSession` is async. If any logic depends on an immediately-available profile record after the code exchange, timing issues arise.

**How to avoid:** Do not create the profile record during the OAuth callback. The profile is created by the user's action on `/velkommen` (either creating or joining a household). The protected layout guard checks `profiles.household_id IS NULL` — if no profile row exists at all, treat it the same as `household_id IS NULL` and redirect to `/velkommen`. Let `/velkommen`'s server actions be the authoritative moment of profile creation.

**Warning signs:** `profiles` select returns 0 rows for a freshly OAuth-authenticated user, causing unexpected redirects.

---

## Code Examples

### Full RLS Policy Suite for Phase 1 Tables

```sql
-- Source: .planning/research/ARCHITECTURE.md (verified pattern)

-- Enable pgcrypto for invite code generation
create extension if not exists pgcrypto with schema extensions;

-- ── SECURITY DEFINER FUNCTION ──────────────────────────────────────────────

create or replace function public.my_household_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select household_id
    from public.profiles
    where id = (select auth.uid())
  $$;

-- ── TABLES ────────────────────────────────────────────────────────────────

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null default public.generate_invite_code(),
  created_at  timestamptz default now()
);

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid references public.households on delete set null,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz default now()
);
create index on public.profiles(household_id);

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.profiles   enable row level security;

-- households: any member can read their own household
create policy "households_select" on public.households for select
  using (id = public.my_household_id());

-- profiles: read all profiles in same household
create policy "profiles_select" on public.profiles for select
  using (household_id = public.my_household_id());

-- profiles: user can insert their own profile (during onboarding)
create policy "profiles_insert_own" on public.profiles for insert
  with check (id = (select auth.uid()));

-- profiles: user can update their own profile
create policy "profiles_update_own" on public.profiles for update
  using (id = (select auth.uid()));
```

### Email/Password Sign-Up (Norwegian)

```svelte
<!-- src/routes/registrer/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  let { data } = $props()

  let email = $state('')
  let password = $state('')
  let error = $state<string | null>(null)
  let loading = $state(false)

  async function handleSignUp() {
    loading = true
    error = null
    const { error: authError } = await data.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    })
    loading = false
    if (authError) {
      error = 'Kunne ikke opprette konto. Prøv igjen.'
      return
    }
    goto('/velkommen')
  }
</script>
```

### Email/Password Sign-In (Norwegian)

```svelte
<!-- src/routes/logg-inn/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  let { data } = $props()

  let email = $state('')
  let password = $state('')
  let error = $state<string | null>(null)

  async function handleSignIn() {
    const { error: authError } = await data.supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      error = 'Feil e-post eller passord'
      return
    }
    // Protected layout guard handles redirect to /velkommen if no household
    goto('/')
  }

  async function handleGoogleSignIn() {
    await data.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
  }
</script>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-sveltekit` | `@supabase/ssr` | 2023-2024 | auth-helpers is deprecated; `@supabase/ssr` is the only supported pattern |
| `getSession()` for server auth | `getUser()` wrapped in `safeGetSession` | 2024 | `getSession()` was documented as insecure; docs now prominently warn against it for server code |
| `ANON_KEY` env var name | `PUBLISHABLE_KEY` env var name | Late 2024 | Supabase renamed the anon key to "publishable key" in the dashboard; `PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the new expected env var name (old `PUBLIC_SUPABASE_ANON_KEY` still works but is deprecated naming) |
| Tailwind v3 with PostCSS | Tailwind v4 with `@tailwindcss/vite` | 2025 | v4 eliminates `tailwind.config.js` and `postcss.config.js`; config lives in CSS `@theme` blocks |
| shadcn-svelte v0 | shadcn-svelte v1 | 2025 | v1 is breaking change; fully runes-native and Tailwind v4 compatible |
| `cookies.get/set/remove` (individual) | `cookies.getAll/setAll` (batch) | 2024 | `@supabase/ssr` 0.5+ requires batch cookie methods; individual get/set/remove pattern is deprecated |

**Deprecated/outdated:**
- `@supabase/auth-helpers-sveltekit`: deprecated, unmaintained, do not use
- `createMiddlewareClient` / `createRouteHandlerClient` from auth-helpers: replaced by `createServerClient` from `@supabase/ssr`
- `cookies.get()` / `cookies.set()` individual methods in `createServerClient` config: use `getAll`/`setAll` batch methods

---

## Open Questions

1. **Supabase env var name: `ANON_KEY` vs `PUBLISHABLE_KEY`**
   - What we know: Supabase recently renamed the anon/public key to "publishable key" in their dashboard
   - What's unclear: Whether `PUBLIC_SUPABASE_ANON_KEY` still works or if only `PUBLIC_SUPABASE_PUBLISHABLE_KEY` is correct in current `@supabase/ssr` 0.9.0
   - Recommendation: When scaffolding, check the Supabase dashboard for the actual env var name shown. Use whatever name the dashboard displays. Both should work in the JS client, but be consistent.

2. **Google OAuth FedCM in Chrome**
   - What we know: Chrome is phasing out third-party cookies. For Google's One Tap product, `use_fedcm_for_prompt: true` is needed. For the standard OAuth redirect flow used here, this does not apply.
   - What's unclear: Whether the standard `signInWithOAuth` redirect flow is affected by the third-party cookie changes at all.
   - Recommendation: The redirect-to-callback pattern does not rely on third-party cookies; it is not affected. Only Google One Tap (in-page popup) is affected. Use the redirect pattern as specified.

3. **shadcn-svelte v1 init with Tailwind v4 interaction**
   - What we know: An issue was reported (#1886) where `npx shadcn-svelte@next` fails in Svelte 5 + Tailwind v4 projects due to a missing `tailwind.config.cjs`. The `@latest` tag may have resolved this.
   - What's unclear: Whether the `@latest` (stable v1) CLI works cleanly with Tailwind v4 or if a workaround is still required.
   - Recommendation: Run `npx shadcn-svelte@latest init` after the SvelteKit scaffold. If it fails looking for `tailwind.config.cjs`, follow the Tailwind v4 migration guide at `https://www.shadcn-svelte.com/docs/migration/tailwind-v4` to manually configure `components.json`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (SvelteKit official scaffold) |
| Config file | `playwright.config.ts` — create in Wave 0 |
| Quick run command | `npx playwright test --grep @smoke` |
| Full suite command | `npx playwright test` |

**Note on unit testing:** Phase 1 is primarily auth flows, RLS SQL, and server actions — these are best verified via integration/e2e tests with a real Supabase local stack rather than unit tests mocking Supabase. Vitest can be added for pure utility functions.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User registers with email/password, redirected to /velkommen | E2E (Playwright) | `npx playwright test --grep "email signup"` | ❌ Wave 0 |
| AUTH-02 | Google OAuth flow completes and user lands in correct route | E2E (Playwright, manual OAuth mock) | `npx playwright test --grep "google oauth"` | ❌ Wave 0 |
| AUTH-03 | Session persists after browser tab close and reopen | E2E (Playwright, storageState) | `npx playwright test --grep "session persistence"` | ❌ Wave 0 |
| HOUS-01 | User creates household, profile has household_id set | E2E (Playwright) | `npx playwright test --grep "create household"` | ❌ Wave 0 |
| HOUS-01 | User joins household via invite code, profile linked | E2E (Playwright) | `npx playwright test --grep "join household"` | ❌ Wave 0 |
| HOUS-02 | Household members view shows own name | E2E (Playwright) | `npx playwright test --grep "members view"` | ❌ Wave 0 |
| AUTH-01/02 | `my_household_id()` returns correct UUID, no recursion errors | DB integration (SQL) | `npx supabase db test` | ❌ Wave 0 |
| AUTH-02 | Google OAuth redirect URL mismatch does not occur locally | Manual smoke | — | Manual only |

**Manual-only justification for AUTH-02 Google OAuth:** Full OAuth flow requires Google Cloud Console credentials and browser redirect — cannot be fully automated in CI without mocking the OAuth provider. Test manually against the local Supabase instance using a test Google account, then verify in staging.

### Sampling Rate

- **Per task commit:** `npx playwright test --grep @smoke` (smoke tag on the 3-4 fastest tests)
- **Per wave merge:** `npx playwright test` (full suite)
- **Phase gate:** Full suite green + `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` returns empty before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/auth.spec.ts` — covers AUTH-01, AUTH-03 (email signup + session persistence)
- [ ] `tests/household.spec.ts` — covers HOUS-01, HOUS-02 (create/join household, members view)
- [ ] `tests/rls.spec.ts` or SQL pgTAP tests — covers `my_household_id()` function, RLS policies
- [ ] `playwright.config.ts` — configure baseURL for local dev server
- [ ] `tests/helpers/auth.ts` — shared test helper for creating authenticated test users via Supabase Admin API
- [ ] Framework install: `npm install -D @playwright/test` + `npx playwright install chromium` — if not already in scaffold

---

## Sources

### Primary (HIGH confidence)

- [Supabase Server-Side Auth for SvelteKit](https://supabase.com/docs/guides/auth/server-side/sveltekit) — hooks.server.ts pattern, `safeGetSession`, `getUser()` recommendation
- [Supabase Build a User Management App with SvelteKit](https://supabase.com/docs/guides/getting-started/tutorials/with-sveltekit) — full hooks.server.ts + layout.server.ts + layout.ts code examples
- [Supabase Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) — signInWithOAuth, PKCE callback, redirect URL config
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SECURITY DEFINER pattern, `(select auth.uid())` caching
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, auth.uid() usage
- `.planning/research/ARCHITECTURE.md` — verified schema design, RLS patterns, SECURITY DEFINER function (HIGH confidence — previously researched for this project)
- `.planning/research/STACK.md` — verified library versions, compatibility matrix (HIGH confidence)
- `.planning/research/PITFALLS.md` — RLS recursion, getSession() security issue, channel cleanup (HIGH confidence)

### Secondary (MEDIUM confidence)

- [shadcn-svelte SvelteKit Installation](https://www.shadcn-svelte.com/docs/installation/sveltekit) — init command, component structure
- [shadcn-svelte Tailwind v4 Migration](https://www.shadcn-svelte.com/docs/migration/tailwind-v4) — setup steps for Tailwind v4 compatibility
- [thespatula.io SvelteKit + Svelte 5 + Supabase guide](https://www.thespatula.io/svelte/sveltekit_supabase/) — complete auth pattern walkthrough including OAuth callback
- [Supabase RLS Infinite Recursion Discussion](https://github.com/orgs/supabase/discussions/1138) — community-confirmed SECURITY DEFINER solution

### Tertiary (LOW confidence)

- [shadcn-svelte GitHub Issue #1886](https://github.com/huntabyte/shadcn-svelte/issues/1886) — Tailwind v4 init failure; status may be resolved in @latest

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified via prior project research + npm
- Architecture patterns: HIGH — hooks.server.ts pattern directly from official Supabase docs; RLS patterns from official Supabase docs and verified prior research
- Auth flows: HIGH — email/password and OAuth patterns from official docs; PKCE callback verified
- Invite code generation: MEDIUM — pgcrypto approach is standard Postgres pattern; exact SQL syntax should be tested against local Supabase instance
- Pitfalls: HIGH — getSession() insecurity confirmed by official docs; recursion prevention confirmed by official docs + community

**Research date:** 2026-03-08
**Valid until:** 2026-06-08 (90 days — Supabase SSR and SvelteKit are stable; shadcn-svelte v1 just released, monitor for patch updates)
