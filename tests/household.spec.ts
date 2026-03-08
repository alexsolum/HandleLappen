import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser } from './helpers/auth'

let testUserId = ''

test.afterEach(async () => {
  if (testUserId) {
    await deleteTestUser(testUserId)
    testUserId = ''
  }
})

test('create household @smoke', async ({ page }) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set — skipping in CI')
    return
  }

  const user = await createTestUser(`test-${Date.now()}@example.com`, 'testpass123')
  testUserId = user.id

  await page.goto('/logg-inn')
  await page.fill('input[type="email"]', user.email!)
  await page.fill('input[type="password"]', 'testpass123')
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/velkommen')

  await page.fill('input[name="name"]', 'Testfamilien')
  await page.click('button[type="submit"]:has-text("Opprett husstand")')
  await page.waitForURL('/')

  await expect(page).toHaveURL('/')
})

test('members view shows invite code @smoke', async () => {
  test.skip(true, 'Requires authenticated session fixture — implement after test infrastructure is complete')
})

test('join household', async () => {
  test.skip(true, 'Requires two test users — implement after test infrastructure is complete')
})