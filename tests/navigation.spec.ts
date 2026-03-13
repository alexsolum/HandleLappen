import { expect, test, type BrowserContext } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'

let userId: string
let authContext: BrowserContext

test.describe('navigation restructure', () => {
  test.beforeAll(async ({ browser }) => {
    const email = `nav-test-${Date.now()}@test.example`
    const password = 'password123'
    const { user } = await createHouseholdUser(email, password)
    userId = user.id

    // Sign in once and capture storage state for reuse across tests
    const setupContext = await browser.newContext()
    const setupPage = await setupContext.newPage()
    await setupPage.goto('/logg-inn', { waitUntil: 'networkidle' })
    await setupPage.fill('[type=email]', email)
    await setupPage.fill('[type=password]', password)
    await setupPage.click('button:has-text("Logg inn")')
    await setupPage.waitForURL('/')
    await setupPage.waitForLoadState('networkidle')

    const storageState = await setupContext.storageState()
    await setupContext.close()

    authContext = await browser.newContext({ storageState })
  })

  test.afterAll(async () => {
    await authContext.close()
    await deleteTestUser(userId)
  })

  // NAV-01: Tab labels
  test('Test 1: four tab labels are visible in the bottom dock', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/', { waitUntil: 'networkidle' })
      const dock = page.getByTestId('bottom-dock')
      await expect(dock).toBeVisible()

      await expect(dock.getByText('Handleliste')).toBeVisible()
      await expect(dock.getByText('Oppskrifter')).toBeVisible()
      await expect(dock.getByText('Anbefalinger')).toBeVisible()
      await expect(dock.getByText('Admin')).toBeVisible()
    } finally {
      await page.close()
    }
  })

  // NAV-01: Active tab on root
  test('Test 2: Handleliste tab is active on "/"', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/', { waitUntil: 'networkidle' })
      const dock = page.getByTestId('bottom-dock')
      const activeLink = dock.locator('a[aria-current="page"]')
      await expect(activeLink).toHaveCount(1)
      await expect(activeLink).toContainText('Handleliste')
    } finally {
      await page.close()
    }
  })

  // NAV-01: Active tab on sub-route
  test('Test 3: Admin tab is active on "/admin/husstand"', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/admin/husstand', { waitUntil: 'networkidle' })
      const dock = page.getByTestId('bottom-dock')
      const activeLink = dock.locator('a[aria-current="page"]')
      await expect(activeLink).toHaveCount(1)
      await expect(activeLink).toContainText('Admin')
    } finally {
      await page.close()
    }
  })

  // NAV-01: Active tab on /oppskrifter
  test('Test 4: Oppskrifter tab is active on "/oppskrifter"', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/oppskrifter', { waitUntil: 'networkidle' })
      const dock = page.getByTestId('bottom-dock')
      const activeLink = dock.locator('a[aria-current="page"]')
      await expect(activeLink).toHaveCount(1)
      await expect(activeLink).toContainText('Oppskrifter')
    } finally {
      await page.close()
    }
  })

  // NAV-01: /oppskrifter stub loads
  test('Test 5: /oppskrifter loads without error and shows heading', async () => {
    const page = await authContext.newPage()
    try {
      const response = await page.goto('/oppskrifter', { waitUntil: 'networkidle' })
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: 'Oppskrifter' })).toBeVisible()
    } finally {
      await page.close()
    }
  })

  // NAV-01: /admin stub loads
  test('Test 6: /admin loads without error and shows heading', async () => {
    const page = await authContext.newPage()
    try {
      const response = await page.goto('/admin', { waitUntil: 'networkidle' })
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
    } finally {
      await page.close()
    }
  })

  // NAV-02: /husstand redirects to /admin/husstand
  test('Test 7: /husstand redirects to /admin/husstand', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/husstand', { waitUntil: 'networkidle' })
      expect(page.url()).toMatch(/\/admin\/husstand$/)
    } finally {
      await page.close()
    }
  })

  // NAV-02: /butikker redirects to /admin/butikker
  test('Test 8: /butikker redirects to /admin/butikker', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/butikker', { waitUntil: 'networkidle' })
      expect(page.url()).toMatch(/\/admin\/butikker$/)
    } finally {
      await page.close()
    }
  })
})
