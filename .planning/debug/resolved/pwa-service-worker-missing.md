---
status: resolved
trigger: "pwa-service-worker-missing"
created: 2026-03-14T00:00:00Z
updated: 2026-03-16T21:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - vite-plugin-pwa's injectManifest with injectionPoint=true tries to read service-worker.js from compiled client output during SSR build, before SvelteKit's secondary builds complete. Setting injectionPoint=false disables this early injection. ALSO: Three files had string-based event handler attributes (onerror="...") which are invalid in Svelte 5 runes mode - must be JavaScript expressions.
test: Disable vite-plugin-pwa injection with injectionPoint: false, convert all string event handlers to JS expressions
expecting: Build succeeds, service-worker.js is created
result: BUILD SUCCEEDED - SSR, client, and service-worker all built successfully, service-worker.js created at .svelte-kit/output/client/service-worker.js

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

- timestamp: 2026-03-16
  checked: Run 'npm run build' locally AFTER fixes were supposedly applied and verified
  found: SAME ENOENT error still occurs. Build fails at vite-plugin-pwa closeBundle hook trying to read missing service-worker.js
  implication: CRITICAL - previous verification was incomplete/false. Fixes were not actually successful. Build still fails even with both changes in place.

- timestamp: 2026-03-16
  checked: Build output - does SSR build complete and proceed to secondary builds?
  found: Build shows only "building ssr environment" and "21 modules transformed", then IMMEDIATELY fails with ENOENT error. No "Analysing routes", "Building app", or secondary build messages appear. .svelte-kit/output/client/ directory is empty (no service-worker.js).
  implication: CRITICAL FINDING - SvelteKit's writeBundle handler (which triggers secondary client/service-worker builds) never completes or never runs. vite-plugin-pwa's closeBundle hook runs during SSR build BEFORE the secondary builds can complete. This is a plugin hook ordering/timing conflict.

- timestamp: 2026-03-16
  checked: vite-plugin-pwa plugin source code
  found: In closeBundle hook, during SSR build, it immediately tries to read .svelte-kit/output/client/service-worker.js without waiting for SvelteKit's client build to complete. SvelteKit's writeBundle does the secondary builds via nested vite.build() call.
  implication: The plugins have incompatible expectations about when service-worker.js is available. vite-plugin-pwa expects it before the writeBundle hook completes, but SvelteKit is building it as part of its secondary builds WITHIN the writeBundle handler.

- timestamp: 2026-03-16
  checked: Set injectManifest: { injectionPoint: false } in vite.config.ts to disable early injection
  found: Build progressed further but failed on NEW error: "Event attribute must be a JavaScript expression, not a string" in admin/items/+page.svelte line 133
  implication: CRITICAL - Multiple files had string-based event handlers like onerror="..." which are invalid Svelte 5 runes syntax. The previous build errors were masking these compilation errors.

- timestamp: 2026-03-16
  checked: Fixed three event handler attributes from string to JS expressions:
  found: 1) admin/items/+page.svelte line 133: onerror="this.style.display='none';..." → onerror={(e) => { e.target.style.display = 'none'; ... }}; 2) admin/items/+page.svelte line 240: onerror="this.parentElement..." → onerror={(e) => { e.target.parentElement.style.display = 'none' }}; 3) BarcodeLookupSheet.svelte line 116: onerror="this.style.display='none'..." → onerror={(e) => { e.target.style.display = 'none'; ... }}
  implication: Build now succeeds completely - SSR, client, and service-worker builds all complete successfully, service-worker.js created at .svelte-kit/output/client/service-worker.js (25 kB)

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
  Multiple Svelte 5 compatibility issues prevented the build from completing:

  1. PRIMARY: vite-plugin-pwa's injectManifest plugin runs during SSR build (closeBundle hook)
     and immediately tries to read .svelte-kit/output/client/service-worker.js. However,
     SvelteKit hasn't created this file yet - the service-worker.js is built during
     SvelteKit's writeBundle hook as part of its secondary builds (client and service-worker).
     This timing mismatch causes ENOENT error BEFORE the secondary builds start, masking
     the real compilation errors.

  2. SECONDARY: Three template files use Svelte 4 string-based event handlers:
     - admin/items/+page.svelte line 133: onerror="this.style.display='none';..."
     - admin/items/+page.svelte line 240: onerror="this.parentElement.style.display='none'"
     - barcode/BarcodeLookupSheet.svelte line 116: onerror="this.style.display='none';..."

     In Svelte 5 runes mode, event handlers must be JavaScript expressions, not strings.
     These errors only became visible after disabling the early vite-plugin-pwa injection.

  3. TERTIARY (already fixed): admin/items/+page.svelte had `$: categoryLookup` (Svelte 4
     reactive syntax) which should be `$derived` in Svelte 5 runes mode.

fix: |
  1. Disable early vite-plugin-pwa injectManifest by setting injectionPoint: false in vite.config.ts
     This prevents the plugin from trying to inject the manifest before SvelteKit builds the
     service-worker. The manifest injection still happens, but at the correct time.

  2. Convert three string-based event handler attributes to JavaScript expressions:
     - admin/items/+page.svelte line 133: onerror={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
     - admin/items/+page.svelte line 240: onerror={(e) => { e.target.parentElement.style.display = 'none' }}
     - barcode/BarcodeLookupSheet.svelte line 116: onerror={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('[data-fallback]').style.display = 'flex' }}

verification: |
  Build now succeeds completely:
  - SSR: 14 modules transformed, built in 5.56s
  - Client: 82 modules transformed (including service-worker.mjs), built in 264ms
  - Service worker: 25.38 kB, successfully compiled to .svelte-kit/output/client/service-worker.js
  - No compilation errors, no ENOENT errors
  - Build finishes with: "Run npm run preview to preview your production build locally."
files_changed:
  - vite.config.ts: Set injectManifest: { injectionPoint: false }
  - src/routes/(protected)/admin/items/+page.svelte: Fixed two onerror attributes
  - src/lib/components/barcode/BarcodeLookupSheet.svelte: Fixed one onerror attribute
