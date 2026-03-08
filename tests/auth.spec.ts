import { test, expect } from '@playwright/test'

// AUTH-01: User can create an account with email and password
test('email signup @smoke', async ({ page }) => {
  test.skip(true, 'Stub — implement with seeded test user credentials')
  await page.goto('/registrer')
})

// AUTH-01: Invalid credentials show error
test('email signup invalid credentials', async () => {
  test.skip(true, 'Stub — implement in integration phase')
})

// AUTH-03: Session persists across browser reload
test('session persistence @smoke', async ({ page, context }) => {
  test.skip(true, 'Requires test user setup via tests/helpers/auth.ts')

  await page.goto('/logg-inn')
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'testpassword123')
  await page.click('button:has-text("Logg inn")')

  await page.waitForURL(/\/(velkommen|$)/)

  const newPage = await context.newPage()
  await newPage.goto('/')

  await expect(newPage).not.toHaveURL('/logg-inn')
})

// AUTH-03: Sign-out clears session
test('sign out clears session', async () => {
  test.skip(true, 'Stub — implement in integration phase')
})