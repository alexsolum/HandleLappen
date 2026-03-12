# T01: Plan 01

**Slice:** S05 — **Milestone:** M001

## Description

Install and configure `@vite-pwa/sveltekit` with a custom TypeScript service worker, PWA manifest, and static icons to make the app installable on Android home screens — satisfying PWAF-01.

Purpose: Without a compliant manifest + service worker, browsers will not offer "Add to Home Screen". This plan wires the entire PWA infrastructure including the app shell precache and Supabase REST NetworkFirst strategy that plan 05-02 relies on for offline reads.

Output: Configured vite plugin, compiled service worker, manifest linked in HTML, icons in static/, SW registered in root layout, Wave 0 test stub files for pwa.spec.ts and offline.spec.ts.
