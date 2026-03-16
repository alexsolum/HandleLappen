---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-03-16T19:03:28.009Z"
last_activity: 2026-03-15 — Quick Task 5 complete; 67 curated family items with Unsplash images in database
progress:
  total_phases: 20
  completed_phases: 10
  total_plans: 48
  completed_plans: 40
  percent: 79
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-03-15T17:55:00.000Z"
last_activity: 2026-03-15 — Quick Task 5 complete; 67 curated family items with Unsplash images in database + household_item_memory
progress:
  [████████░░] 79%
  completed_phases: 10
  total_plans: 44
  completed_plans: 37
  percent: 84
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** The list is sorted the way the store is laid out — so shopping is fast, never backtracking, always in sync with whoever else is shopping.
**Current focus:** v2.0 Phase 19 — Edge Function and DTO Enrichment (01 complete)

## Current Position

Phase: 19 of 20 (Edge Function and DTO Enrichment — in progress)
Plan: 19-01 — complete (brand/imageUrl enrichment, Kassal v1 fix, Activation Date Safeguard, Gemini prompt stripping, unit tests)
Status: Phase 19 Plan 01 complete — ready for Phase 20 (ProductThumbnail UI) or 17 (DB migrations) or 18-02 (validation)
Last activity: 2026-03-15 — Quick Task 5 complete; 67 curated family items with Unsplash images in database

Progress: [████████░░] 84% (37/44 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 31
- Average duration: -
- Total execution time: -

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 11 P01 | 18min | 2 tasks | 7 files |
| Phase 11 P02 | 13min | 2 tasks | 4 files |
| Phase 11 P03 | 7min | 2 tasks | 2 files |
| Phase 12 P01 | 15min | 1 task | 2 files |
| Phase 12 P02 | 10min | 2 tasks | 5 files |
| Phase 12 P03 | 10min | 2 tasks | 2 files |
| Phase 13 P01 | 12min | 2 tasks | 3 files |
| Phase 13 P02 | 15min | 3 tasks | 4 files |
| Phase 13 P03 | 10min | 2 tasks | 3 files |
| Phase 13 P04 | 15min | 5 tasks | 5 files |
| Phase 14 P01 | 20min | 3 tasks | 10 files |
| Phase 14 P02 | 8min | 5 verified + 1 fix | 1 file |
| Phase 14 P03 | 3min | 2 tasks | 4 files |
| Phase 14 P04 | 3 | 4 tasks | 4 files |
| Phase 14-recipes P05 | 5 | 2 tasks | 2 files |
| Phase 04-03 barcode scan-to-add | 20min | 3 tasks | 6 files |
| Phase 04 P04 | 2min | 2 tasks | 2 files |
| Phase 18-ios-scanner-black-screen-fix P01 | 34 | 3 tasks | 4 files |
| Phase 19 P01 | 4 | 3 tasks | 4 files |
| Phase 20 P04 | 2min | 1 tasks | 1 files |
| Phase 20 P03 | 4min | 2 tasks | 5 files |
| Phase 20 P02 | 2min | 2 tasks | 2 files |

## Accumulated Context

### Decisions
- [Phase 04-03-barcode-scan-to-add]: BarcodeLookupSheet is a dumb props-driven component; all state (loading/found/not_found/error) is owned by the list page so it composes cleanly with scanner and manual-EAN resume flows already in ItemInput.
- [Phase 04-03-barcode-scan-to-add]: Category ID resolution has two opportunities — at mutation settle time and via a reactive $effect — to handle the case where categories load after the mutation resolves.
- [Phase 04-03-barcode-scan-to-add]: Confirmed barcode-add goes through the standard addItemMutation + assignCategoryMutation path so inserted items are indistinguishable from typed items and trigger the household item-memory pipeline.
- [Phase 08-traceability-reconciliation]: Central BACKLOG.md created to capture functional tech debt and v2 features, separating milestone closure from debt resolution.
- [Phase 08-reaudit]: v1.0-FINAL-AUDIT.md passed. 100% requirement traceability achieved for v1 milestone.
- [Phase 09-mobile-layout-hardening]: All mobile sheets now share one inset, capped-height contract, and the signed-in shell uses a safe-area-aware dock stack with horizontal overflow clipping.
- [Phase 10-inline-quantity-controls]: Active rows now use isolated inline steppers, and typed plus barcode-assisted item entry share a visible default quantity of 1.
- [Phase 11-household-item-memory-and-suggestions]: Remembered items use a dedicated household-scoped memory table with ranked RPC search instead of raw browser-side history scans.
- [Phase 11-household-item-memory-and-suggestions]: List-item inserts and category/name changes refresh remembered memory through database triggers so future add flows stay consistent.
- [Phase 11-household-item-memory-and-suggestions]: Remembered suggestions are rendered inline inside the fixed add bar while the list page owns the live query and one-tap add path.
- [Phase 11-household-item-memory-and-suggestions]: Remembered category ids are reused only when they still belong to the current household; otherwise the existing picker flow takes over.
- [v1.2-roadmap]: Zero new npm packages required for v1.2 — all capabilities covered by existing stack (SvelteKit nested layouts, Tailwind v4 @custom-variant, Supabase Storage client, native OffscreenCanvas).
- [v1.2-roadmap]: Tailwind v4 dark mode uses @custom-variant in app.css — no tailwind.config.js and no darkMode config key. Copying v3 tutorials creates a config that has zero effect.
- [v1.2-roadmap]: All Storage RLS must include four policies per bucket (INSERT/SELECT/UPDATE/DELETE) with storage.foldername(name)[1] = my_household_id()::text path scoping. Missing SELECT = images display silently broken.
- [v1.2-roadmap]: Image uploads must compress client-side via OffscreenCanvas before upload (max 1200px WebP 0.85). Mobile camera photos are 4-12 MB; Supabase free-tier standard upload is optimized for ≤6 MB.
- [v1.2-roadmap]: All image filenames must include a timestamp or UUID ({uuid}-{timestamp}.webp) so replacing an image changes the URL and busts service worker cache.
- [v1.2-roadmap]: Admin sub-route load functions must read householdId from locals directly — not via await parent() — to avoid serializing parallel SvelteKit load waterfalls.
- [v1.2-roadmap]: Existing /husstand and /butikker routes need 301 redirects to their new Admin subpage destinations before the nav restructure ships, to protect existing PWA users.
- [v1.2-roadmap]: Recipe add-to-list must use Supabase upsert with ignoreDuplicates: true against a unique constraint on (list_id, item_id) to prevent duplicate list rows.
- [Phase 14-01-recipe-backend]: Storage RLS uses storage.foldername(name)[1] = my_household_id()::text — path prefix enforces household isolation at the bucket policy level, consistent with v1.2 roadmap decision.
- [Phase 14-01-recipe-backend]: Image compression uses DOM canvas API (not OffscreenCanvas) for iOS 15 Safari compatibility; OffscreenCanvas risk was pre-documented in pending todos.
- [Phase 14-01-recipe-backend]: Ingredient names stored as plain text in recipe_ingredients.name — no FK to household_item_memory; IngredientBuilder normalizes by simple lowercase dedup within a recipe session.
- [Phase 14-02-recipe-list-creation]: createMutation in @tanstack/svelte-query v5 requires an accessor function () => ({...}) not a plain object — fixed in createDeleteRecipeMutation; pattern now consistent with createRecipeMutation.
- [Phase 12-01-navigation-restructure]: TDD Wave 0 test scaffold uses shared storageState in beforeAll/afterAll with per-test page isolation — avoids 8 separate login round-trips while maintaining test independence.
- [Phase 12-01-navigation-restructure]: Pre-existing SSR crash on /logg-inn fixed — window.location in data attribute template evaluation required typeof window guard (auto-fixed as blocking Rule 3).
- [Phase 12]: isActive uses tab.href === '/anbefalinger' (not tab.label) for consistency with other href-based checks in BottomNav
- [Phase 12]: Admin sub-pages are non-interactive divs in Phase 12 — Phase 13 activates them as real navigation links
- [Phase 12-03-navigation-restructure]: 301 (permanent) used for /husstand and /butikker redirects — PWA clients cache 301 and update back-history so users are never routed to dead URLs
- [Phase 12-03-navigation-restructure]: Existing /husstand/+page.svelte left in place after redirect — server-side redirect fires before SvelteKit renders the page component
- [Phase 14-03-recipe-detail]: Add to List iterates selected ingredients sequentially calling createAddOrIncrementItemMutation per item — consistent with existing pattern, no batch mutation needed
- [Phase 14-03-recipe-detail]: All ingredients pre-selected on detail load — user deselects what they don't need (faster path for adding full recipes)
- [Phase 14]: Ingredient sync uses delete-all + re-insert strategy — simpler than diff, handles adds/removes/reorders equally for MVP recipe sizes
- [Phase 14]: image_url passed as undefined when no image change made — three-value semantics: undefined=keep, null=remove, string=new URL
- [Phase 14-05]: Category carry-through resolves at add-time via searchRememberedItems per ingredient — no schema changes or new tables required; two file edits suffice
- [Phase 14-05]: Increment path (existing unchecked item on list) intentionally leaves category_id untouched — only the insert path receives the looked-up category
- [v2.0-roadmap]: iOS black screen fix uses MutationObserver to intercept the video element synchronously before html5-qrcode's start() callback fires and set playsinline/muted/autoplay — confirmed by WebKit bugs 185448, 252465 and html5-qrcode issues #890, #713.
- [v2.0-roadmap]: Image and brand bypass Gemini entirely — Gemini is used only for name normalization and category resolution; sending image URLs adds token cost with zero benefit.
- [v2.0-roadmap]: Write-at-insert-time for list_items (product_image_url, brand) consistent with existing category_id pattern — no JOIN on hot list read path.
- [v2.0-roadmap]: All new DB columns are nullable text with no defaults — safe on live tables with trigger activity; no backfill in migration transaction.
- [v2.0-roadmap]: ProductThumbnail must use onerror fallback — Kassal CDN URLs (Cloudinary version tokens) can rotate before the 30-day cache TTL expires.
- [v2.0-roadmap]: Phase 17 is infrastructure-only (no user-facing requirements); Phase 18 (iOS fix) is independent of 19/20 and can ship as a hotfix; Phase 20 depends on both 17 and 19.
- [Phase 04-04-gap-closure]: v1.0 Barcode Scanning section inserted at the TOP of REQUIREMENTS.md before v1.1, preserving chronological milestone ordering; traceability rows placed before MOBL-01 to maintain ascending phase-number order
- [Phase 18-ios-scanner-black-screen-fix]: MutationObserver is installed universally before htmlScanner.start() to intercept video element synchronously — no UA sniffing, applies to all browsers
- [Phase 18-ios-scanner-black-screen-fix]: Svelte 5 state/message variables use $state() so async callback assignments from external onError handlers trigger reactivity — dialogEl/session remain plain let to avoid $state() proxy breaking bind:this and showModal()
- [Phase 18-ios-scanner-black-screen-fix]: permission-dismissed is the safe fallback when Permissions API unavailable — allows retry instead of blocking the user with permanent denied UI
- [Phase 19-01]: isJunkBrand filters: none/n/a/ukjent/unknown/na/-/empty (case-insensitive, trimmed)
- [Phase 19-01]: Activation Date Safeguard 2026-03-14: pre-activation cache entries missing brand or image_url discarded to force re-fetch, no DB migration needed
- [Phase 19-01]: Gemini prompt receives stripped payload (no brand/imageUrl/image fields) to minimize tokens — consistent with v2.0-roadmap decision
- [Phase 19-01]: Kassal API v1 returns data.products[0] not data[0] — extractKassalProduct updated with nested structure check first
- [Phase 20-04]: Smart Dedup: brand subtitle hidden when brand text is a case-insensitive substring of the product name
- [Phase 20-04]: onerror fallback uses inline HTML attribute (not Svelte event binding) for cross-origin image errors before hydration
- [Phase 20-03]: ItemRow uses Svelte $state(imgLoaded/imgError) + $effect to reset on item change — avoids stale shimmer from previous item
- [Phase 20-03]: Smart Dedup in ItemDetailSheet: brand subtitle hidden when brand.toLowerCase() is a substring of name.toLowerCase()
- [Phase 20-03]: UpdateItemMutation extended with optional brand field: brand=undefined means keep existing value, avoids overwriting with null on non-brand edits
- [Phase 20-02]: Smart Dedup: brand subtitle hidden when brand.toLowerCase() is a substring of draftName.toLowerCase() — consistent with 20-03 and 20-04 pattern
- [Phase 20-02]: onConfirm extended with brand and imageUrl so scanned products are stored enriched at insert time — consistent with write-at-insert-time v2.0-roadmap decision

### Pending Todos
- Verify OffscreenCanvas compatibility on iOS 15 (Safari 15) before building image upload pipeline in Phase 15 — may need <canvas> fallback. (Phase 14 used DOM canvas as safe default.)
- Plan 14-04 may have reduced scope — edit/delete functionality is already implemented (edit link in detail header links to /oppskrifter/[id]/rediger; delete confirmed working via detail page).
- Phase 18 iOS fix must be verified on a real iPhone in installed PWA mode — simulator cannot reproduce the black screen.
- Phase 20 Svelte 5 onerror event timing with SSR hydration (sveltejs/svelte#10352) — verify early whether Svelte event binding works or inline HTML onerror attribute is required for cross-origin images.

### Blockers/Concerns
- None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Add Google Auth using Supabase | 2026-03-12 | 6019636 | [1-add-google-auth-using-supabase](./quick/1-add-google-auth-using-supabase/) |
| 2 | Improve app categories from grocery_categories.md and sync Supabase | 2026-03-12 | c8c7f59 | [2-improve-app-categories-from-grocery-cate](./quick/2-improve-app-categories-from-grocery-cate/) |
| 3 | Add item administration and Varekatalog management | 2026-03-14 | 7f44449 | [3-add-item-administration-in-the-admin-ite](./quick/3-add-item-administration-in-the-admin-ite/) |
| 5 | Fill items database with top products from Kassal | 2026-03-15 | cc04372 | [5-fill-items-database-with-top-products-fr](./quick/5-fill-items-database-with-top-products-fr/) |
