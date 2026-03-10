import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestList } from './helpers/lists'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

test.describe('realtime', () => {
  test('realtime sync — item added on device A appears on device B within 3 seconds', async ({ browser: pw }) => {
    // Clean up any leftover users from a previous run
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    for (const u of existingUsers?.users ?? []) {
      if (u.email === 'realtime-a@test.example' || u.email === 'realtime-b@test.example') {
        await admin.auth.admin.deleteUser(u.id)
      }
    }

    // Set up two users in the same household
    const { user: userA, household } = await createHouseholdUser('realtime-a@test.example', 'password123')
    // User B joins the same household
    const { data: userBAuthData } = await admin.auth.admin.createUser({
      email: 'realtime-b@test.example',
      password: 'password123',
      email_confirm: true,
    })
    const userB = userBAuthData!.user
    await admin.from('profiles').insert({
      id: userB!.id,
      household_id: household.id,
      display_name: 'Person B',
    })

    const list = await createTestList(household.id, 'Delt liste')

    // Create two browser contexts (two devices)
    const contextA = await pw.newContext()
    const contextB = await pw.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Log in both devices
      for (const [page, email] of [
        [pageA, 'realtime-a@test.example'],
        [pageB, 'realtime-b@test.example'],
      ] as const) {
        await page.goto('/logg-inn', { waitUntil: 'networkidle' })
        await page.fill('[type=email]', email)
        await page.fill('[type=password]', 'password123')
        await page.click('button:has-text("Logg inn")')
        await page.waitForURL('/')
        await page.waitForLoadState('networkidle')
      }

      // Both devices navigate to the shared list
      await pageA.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })
      await pageB.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      // Wait for the item input to be ready on device A before adding
      await pageA.waitForSelector('input[placeholder="Legg til vare…"]')

      // Device A adds an item
      await pageA.fill('input[placeholder="Legg til vare…"]', 'Appelsinjuice')
      await pageA.keyboard.press('Enter')

      // Device B should see the item within 3 seconds (without refresh)
      await expect(pageB.locator('text=Appelsinjuice')).toBeVisible({ timeout: 3000 })
    } finally {
      await contextA.close()
      await contextB.close()
      await deleteTestUser(userA.id)
      await deleteTestUser(userB!.id)
    }
  })
})
