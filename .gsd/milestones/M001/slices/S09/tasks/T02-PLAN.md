# T02: 09-mobile-layout-hardening 02

**Slice:** S09 — **Milestone:** M001

## Description

Turn the current fixed bottom nav into a true mobile dock with icons, larger touch targets, and safe-area-aware spacing, then restack the add-item bar and shell spacing around the final dock height.

Purpose: This plan finishes MOBL-03 and the bottom-stack part of MOBL-02. It should only run after the shell/sheet contract from 09-01 is stable.

Output: A pinned icon dock, updated bottom input positioning, and a protected shell whose fixed layers no longer collide or create layout drift on mobile.

## Must-Haves

- [ ] "Bottom navigation is a pinned mobile dock rather than a thin text row"
- [ ] "Dock links are icon-based and provide larger touch targets suitable for thumb use"
- [ ] "The bottom dock respects safe-area spacing in mobile browser and PWA standalone contexts"
- [ ] "The dock, item input bar, and shell spacing behave as one coordinated bottom stack without overlap or width leakage"

## Files

- `src/lib/components/lists/BottomNav.svelte`
- `src/lib/components/items/ItemInput.svelte`
- `src/routes/(protected)/+layout.svelte`
