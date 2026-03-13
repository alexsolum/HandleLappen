import { test, expect } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'

let testUserId = ''

test.afterEach(async () => {
  if (testUserId) {
    await deleteTestUser(testUserId)
    testUserId = ''
  }
})

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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
    return
  }

  const seeded = await createHouseholdUser(`session-${Date.now()}@example.com`, 'testpass123')
  testUserId = seeded.user.id

  await page.goto('/logg-inn')
  await page.fill('input[type="email"]', seeded.user.email!)
  await page.fill('input[type="password"]', 'testpassword123')
  await page.click('button:has-text("Logg inn")')

  await page.waitForURL('/')

  const newPage = await context.newPage()
  await newPage.goto('/')

  await expect(newPage).not.toHaveURL('/logg-inn')
})

// AUTH-03: Sign-out clears session
test('sign out clears session @smoke', async ({ page }) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
    return
  }

  const seeded = await createHouseholdUser(`logout-${Date.now()}@example.com`, 'testpass123')
  testUserId = seeded.user.id

  await page.goto('/logg-inn')
  await page.fill('input[type="email"]', seeded.user.email!)
  await page.fill('input[type="password"]', 'testpass123')
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')

  await page.goto('/husstand')
  await page.click('button:has-text("Logg ut")')
  await page.waitForURL('/logg-inn')

  await expect(page.getByRole('button', { name: 'Logg inn' })).toBeVisible()
})

test('protected route redirects after logout', async ({ page }) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
    return
  }

  const seeded = await createHouseholdUser(`redirect-${Date.now()}@example.com`, 'testpass123')
  testUserId = seeded.user.id

  await page.goto('/logg-inn')
  await page.fill('input[type="email"]', seeded.user.email!)
  await page.fill('input[type="password"]', 'testpass123')
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')

  await page.click('button:has-text("Logg ut")')
  await page.waitForURL('/logg-inn')

  await page.goto('/husstand')
  await page.waitForURL('/logg-inn?next=%2Fhusstand')
})

test.describe('Google OAuth callback contract', () => {
  test('Google OAuth entrypoint uses /auth/callback with sanitized next path', async ({ page }) => {
    await page.goto('/logg-inn?next=https%3A%2F%2Fevil.example%2Fsteal-session')

    await expect(page.getByRole('button', { name: 'Fortsett med Google' })).toHaveAttribute(
      'data-google-oauth-callback',
      'http://127.0.0.1:4173/auth/callback?next=%2F'
    )
  })

  test('Google OAuth callback redirects off raw callback URL to sanitized destination', async ({ page }) => {
    await page.goto('/auth/callback?code=fake-oauth-code&next=https%3A%2F%2Fevil.example%2Fsteal-session')

    await page.waitForURL('**/auth/error?reason=oauth_callback_failed')
    await expect(page).not.toHaveURL(/\/auth\/callback\?/)
    await expect(page.getByRole('heading', { name: 'Innlogging feilet' })).toBeVisible()
    await expect(page.getByText('Google-innloggingen kunne ikke fullføres. Prøv igjen fra innloggingssiden.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Til innlogging' })).toHaveAttribute('href', '/logg-inn')
  })
})
