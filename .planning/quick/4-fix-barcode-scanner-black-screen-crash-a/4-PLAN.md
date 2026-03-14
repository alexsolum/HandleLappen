# Quick Task 4: Fix barcode scanner black screen/crash and swap scan button for icon - Plan

## Goal

The barcode scanner should stop rendering a black box/crashing the page, and the “Scan” trigger should be a compact icon button without losing accessibility or functionality.

## Tasks

### 1. Cure the scanner helper internals
- files: `src/lib/barcode/scanner.ts`
- action: Remove unsupported `formatsToSupport` from the camera config, avoid touching undefined mock controller properties, and make `startScanner`/`stopScanner` flow resilient (clear and stop only when defined, keep the mock helpers typed without optional property access that breaks `svelte-check`).
- verify: `tsc`/`svelte-check` no longer report the invalid property or mock access errors; scanner start now succeeds without throwing on expiration.
- done: `startScanner` can boot a real camera and the mock path compiles cleanly.

### 2. Harden the scanner sheet component
- files: `src/lib/components/barcode/BarcodeScannerSheet.svelte`
- action: Ensure we avoid new `$state` warning by switching to plain `let` locals, keep the camera boot/teardown flow consistent, and keep the preview layout ready for a video without falling back to blank state.
- verify: Svelte-check stops reporting `$state` errors and the sheet still toggles between loading/scanning/failure states without leaving a black screen.
- done: The sheet renders the video container and leverages the updated helper safely.

### 3. Replace the scan trigger with a compact icon button
- files: `src/lib/components/items/ItemInput.svelte`, `tests/barcode.spec.ts`
- action: Switch the “Scan” text button to a small round icon button (camera glyph) with an accessible name (e.g., “Skann strekkode”), update the Playwright scan helper and expectations, and keep the manual-entry button next to it.
- verify: Production UI shows the new icon button and tests look for `aria-label="Skann strekkode"` instead of visible text.
- done: Barcode tests open the scanner via the new icon button and still see the sheet header text.
