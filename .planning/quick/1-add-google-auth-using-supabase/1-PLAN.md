# Quick Task 1: Add Google Auth using Supabase - Plan

## Goal

Finish the Google auth flow that is already partially wired in the UI so it works end to end with Supabase OAuth in local and production environments.

## Tasks

### 1. Harden the OAuth app flow
- files: `src/routes/logg-inn/+page.svelte`, `src/routes/registrer/+page.svelte`, `src/routes/auth/callback/+server.ts`
- action: Preserve `next` redirects through Google sign-in, handle OAuth initiation failures, and ensure callback fallback behavior is explicit.
- verify: Google sign-in buttons send users to Supabase with a callback URL that can return them to the intended page, and callback failures land on a real route.
- done: OAuth login/register flow is coherent for both first-time and returning users.

### 2. Add missing auth error UI
- files: `src/routes/auth/error/+page.svelte`
- action: Add a simple error page for failed OAuth callback exchanges with a clear retry path.
- verify: `/auth/error` renders a user-facing explanation and links back into auth.
- done: Failed OAuth exchanges no longer redirect to a missing route.

### 3. Document required Supabase configuration
- files: `README.md`, `.env.example`
- action: Document the Google provider setup required in Supabase and the callback URLs/env vars needed for local and Vercel deployments.
- verify: A developer can follow the repo docs to enable Google sign-in without reading code.
- done: Google auth is operationally set up, not just partially coded.
