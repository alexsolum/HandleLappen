# Deferred Items

## Out-of-scope pre-existing typecheck failures

- `npm run check` fails with existing errors outside this plan's modified files, including:
- `vite.config.ts` (`injectManifest.injectionPoint` type mismatch)
- `src/lib/queries/remembered-items-core.ts` RPC argument/row-shape mismatches
- `src/lib/components/barcode/*` event target typing issues
- `src/routes/(protected)/admin/butikker/[id]/+page.svelte` store id typing and `dragStartThreshold` option typing
- `tests/item-memory.spec.ts` implicit `any` parameters

## Verification environment instability

- Playwright runs for this phase are unstable due local webserver state:
- `Port 4173 is already in use` during startup
- Vite error overlay intercepting clicks in login flow
- `ERR_CONNECTION_REFUSED` and command timeouts on reruns
