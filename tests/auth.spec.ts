import { test } from '@playwright/test'

// AUTH-01: User can create an account with email and password
test('email signup @smoke', async ({ page }) => {
  test.skip(true, 'Stub — implement in Plan 02 after auth screens exist')
  await page.goto('/registrer')
  // Will fill email/password, submit, expect redirect to /velkommen
})

// AUTH-01: Invalid credentials show error
test('email signup invalid credentials', async () => {
  test.skip(true, 'Stub — implement in Plan 02 after auth screens exist')
})

// AUTH-03: Session persists across browser reload
test('session persistence @smoke', async () => {
  test.skip(true, 'Stub — implement in Plan 02 after hooks.server.ts exists')
  // Will sign in, reload, verify still authenticated
})

// AUTH-03: Sign-out clears session
test('sign out clears session', async () => {
  test.skip(true, 'Stub — implement in Plan 02')
})