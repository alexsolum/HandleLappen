import { test } from '@playwright/test'

// HOUS-01: User can create a household during onboarding
test('create household @smoke', async ({ page }) => {
  test.skip(true, 'Stub — implement in Plan 03 after /velkommen screen exists')
  await page.goto('/velkommen')
  // Will fill household name, submit, verify redirect to /
})

// HOUS-01: User can join a household via invite code
test('join household', async () => {
  test.skip(true, 'Stub — implement in Plan 03 after /velkommen screen exists')
})

// HOUS-02: Household members view shows own name and invite code
test('members view @smoke', async () => {
  test.skip(true, 'Stub — implement in Plan 03 after members view screen exists')
})