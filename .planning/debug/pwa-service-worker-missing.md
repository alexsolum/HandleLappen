---
status: awaiting_human_verify
trigger: "pwa-service-worker-missing"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Svelte compilation error in admin/items/+page.svelte causes secondary client build to fail, SvelteKit writeBundle re-throws, Vite finally-block calls closeBundle, vite-plugin-pwa tries to read service-worker.js which was never created → ENOENT
test: Fix the $: reactive statement in admin/items/+page.svelte to use $derived
expecting: Client build succeeds, service-worker.js is created, vite-plugin-pwa injects manifest
next_action: Fix $: categoryLookup reactive statement to use $derived syntax

## Symptoms

expected: Vercel deployment should build successfully with PWA support
actual: Build fails with ENOENT error - service-worker.js not found
errors: |
  [vite-plugin-pwa:sveltekit:build] The 'swSrc' file can't be read.
  ENOENT: no such file or directory, open '/vercel/path0/.svelte-kit/output/client/service-worker.js'
    at injectManifest (/vercel/path0/node_modules/workbox-build/build/inject-manifest.js:70:15)
    at async Object.handler (file:///vercel/path0/node_modules/@vite-pwa/sveltekit/dist/index.mjs:266:33)
reproduction: Push to main / deploy to Vercel
started: Unknown - user just encountered this

## Eliminated

- hypothesis: src/service-worker.ts source file missing
  evidence: File exists at src/service-worker.ts; service-worker.js used to exist from a previous successful build
  timestamp: 2026-03-14

- hypothesis: Wrong build hook ordering (closeBundle before writeBundle)
  evidence: Vite guarantees writeBundle runs before closeBundle; confirmed via Vite 7 buildEnvironment source code
  timestamp: 2026-03-14

- hypothesis: Rolldown vs Rollup output naming difference
  evidence: Vite 7.3.1 is not rolldown-vite (no rolldownVersion export), so isRolldown=false and rename path works correctly
  timestamp: 2026-03-14

- hypothesis: filename: 'service-worker.ts' causes buildSW to fail on Vercel
  evidence: Testing both .ts and .js filename shows same ENOENT error; the actual root cause is a Svelte compilation error not buildSW
  timestamp: 2026-03-14

## Evidence

- timestamp: 2026-03-14
  checked: SvelteKit build WITHOUT vite-plugin-pwa (vite.config.nopwa.ts)
  found: Build still fails with "src/routes/(protected)/admin/items/+page.svelte:59:2 `$:` is not allowed in runes mode, use `$derived` or `$effect` instead"
  implication: The root cause is NOT vite-plugin-pwa - it's a Svelte 5 runes mode compilation error in admin/items/+page.svelte

- timestamp: 2026-03-14
  checked: Vite 7 buildEnvironment source code (node_modules/vite/dist/node/chunks/config.js:33554)
  found: "finally { if (bundle) await bundle.close(); }" - closeBundle ALWAYS fires even when writeBundle fails
  implication: When admin/items build fails → secondary client build fails → SvelteKit writeBundle re-throws → Vite finally calls bundle.close() → SvelteKit build_service_worker never runs → service-worker.js never created → vite-plugin-pwa closeBundle reads missing file → ENOENT

- timestamp: 2026-03-14
  checked: src/routes/(protected)/admin/items/+page.svelte line 59
  found: "$: categoryLookup = new Map(...)" - Svelte 4 reactive statement syntax in a Svelte 5 runes mode component (uses $props(), $state())
  implication: This is the ACTUAL build failure causing the chain reaction. Fix is to convert $: to $derived.

- timestamp: 2026-03-14
  checked: vite.config.ts filename option
  found: filename: 'service-worker.ts' is incorrect per @vite-pwa/sveltekit design (should be 'service-worker.js' since SvelteKit compiles the TS)
  implication: Secondary fix needed - filename should be 'service-worker.js' to avoid potential buildSW conflicts

## Resolution

root_cause: |
  A Svelte 5 runes mode compilation error in src/routes/(protected)/admin/items/+page.svelte
  line 59 uses deprecated Svelte 4 `$:` reactive syntax (`$: categoryLookup = new Map(...)`)
  in a component that is otherwise written in Svelte 5 runes mode (uses $props(), $state()).

  This causes the secondary client build (triggered from SvelteKit's writeBundle hook) to fail.
  SvelteKit's writeBundle re-throws the error. Vite 7's buildEnvironment finally block then calls
  bundle.close() which runs closeBundle hooks. SvelteKit's build_service_worker was never called
  (it runs after the client build in writeBundle), so service-worker.js doesn't exist.
  vite-plugin-pwa's SvelteKitPlugin closeBundle tries to read service-worker.js → ENOENT.

  The ENOENT error from vite-plugin-pwa OVERRIDES the real Svelte compilation error in the output,
  making the true root cause invisible.

  Secondary issue: vite.config.ts uses filename: 'service-worker.ts' which @vite-pwa/sveltekit
  docs recommend should be 'service-worker.js' (SvelteKit handles the TypeScript compilation).
fix: |
  1. Convert $: categoryLookup reactive statement to $derived in admin/items/+page.svelte
  2. Change filename from 'service-worker.ts' to 'service-worker.js' in vite.config.ts
verification: |
  Local build now succeeds:
  - SSR: 292 modules transformed
  - Client: 369 modules transformed
  - Service worker: 82 modules transformed, .svelte-kit/output/client/service-worker.js created
  - vite-plugin-pwa injects workbox manifest successfully
  - No ENOENT error
files_changed:
  - src/routes/(protected)/admin/items/+page.svelte
  - vite.config.ts
