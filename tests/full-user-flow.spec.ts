import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, createTestUser, deleteTestUser, loginUser } from './helpers/auth'

async function addItem(page: Page, name: string) {
  await page.fill('input[placeholder="Legg til vare…"]', name)
  const addItemResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/rest/v1/list_items') &&
      res.request().method() === 'POST' &&
      res.status() >= 200 &&
      res.status() < 300
  )
  await page.locator('[data-testid="add-bar-shell"] button:has-text("Legg til")').click()
  await addItemResponse

  const categoryModal = page.locator('dialog:has-text("Velg kategori")')
  const modalVisible = await categoryModal.isVisible({ timeout: 2500 }).catch(() => false)
  if (modalVisible) {
    await categoryModal.getByRole('button', { name: 'Hopp over' }).click()
  }

  await expect(page.getByRole('checkbox', { name: new RegExp(name, 'i') }).first()).toBeVisible()
}

test.describe('full household + store + shopping flow', () => {
  test.setTimeout(180_000)

  test('login, add household member, create geolocated store, create and check out list with screenshot', async ({
    browser,
  }, testInfo) => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    const timestamp = Date.now()
    const password = 'password123'
    const ownerEmail = `owner-flow-${timestamp}@test.example`
    const memberEmail = `member-flow-${timestamp}@test.example`

    const { user: ownerUser } = await createHouseholdUser(ownerEmail, password)
    const memberUser = await createTestUser(memberEmail, password)

    const ownerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()

    const memberContext = await browser.newContext()
    const memberPage = await memberContext.newPage()

    try {
      // Owner signs in and gets invite code.
      await loginUser(ownerPage, ownerEmail, password)
      await ownerPage.goto('/admin/husstand', { waitUntil: 'networkidle' })
      const inviteCode = (await ownerPage.locator('span.font-mono').first().innerText()).trim()
      expect(inviteCode.length).toBeGreaterThan(4)

      // Member signs in with email+password and joins owner's household.
      await memberPage.goto('/logg-inn', { waitUntil: 'networkidle' })
      await memberPage.fill('input[type="email"]', memberEmail)
      await memberPage.fill('input[type="password"]', password)
      await memberPage.click('button:has-text("Logg inn")')
      await memberPage.waitForURL('/velkommen', { waitUntil: 'networkidle' })
      await memberPage.fill('input[name="code"]', inviteCode)
      await memberPage.click('button:has-text("Bli med")')
      await memberPage.waitForURL('/', { waitUntil: 'networkidle' })

      // Verify household now includes both users.
      await ownerPage.reload({ waitUntil: 'networkidle' })
      await expect(ownerPage.getByText(memberEmail)).toBeVisible()

      // Owner creates a store and geolocates it in store edit.
      const locationName = `Teie ${timestamp}`
      const storeDisplayName = `Rema 1000 ${locationName}`
      await ownerPage.goto('/admin/butikker', { waitUntil: 'networkidle' })
      await ownerPage.click('button:has-text("Legg til butikk")')
      await ownerPage.selectOption('#new-store-chain', 'Rema 1000')
      await ownerPage.fill('#new-store-location', locationName)
      await ownerPage.click('button:has-text("Lagre butikk")')
      const storeRow = ownerPage.locator(`a:has-text("${storeDisplayName}")`).first()
      await expect(storeRow).toBeVisible()
      await storeRow.click()
      await ownerPage.waitForURL('**/admin/butikker/*', { waitUntil: 'networkidle' })

      const map = ownerPage.locator('[aria-label="Kart for aa plassere butikkens posisjon"]')
      await expect(map).toBeVisible()
      await expect(ownerPage.getByText('Laster kart...')).toHaveCount(0)
      await ownerPage.waitForTimeout(400)
      await map.click({ position: { x: 180, y: 120 } })
      await ownerPage.click('button:has-text("Lagre endringer")')
      await expect(ownerPage.getByText('Noe gikk galt. Endringen ble ikke lagret')).toHaveCount(0)

      // Create shopping list from UI.
      const listName = `E2E Fullflyt ${timestamp}`
      await ownerPage.goto('/', { waitUntil: 'networkidle' })
      const listCreateResponse = ownerPage.waitForResponse(
        (res) =>
          res.url().includes('/rest/v1/lists') &&
          res.request().method() === 'POST' &&
          res.status() >= 200 &&
          res.status() < 300
      )
      await ownerPage.click('button:has-text("Ny liste")')
      await ownerPage.fill('input[placeholder="Navn på lista"]', listName)
      await ownerPage.keyboard.press('Enter')
      await listCreateResponse
      await ownerPage.reload({ waitUntil: 'networkidle' })
      const listLink = ownerPage.locator(`a[href^="/lister/"]:has-text("${listName}")`).first()
      await expect(listLink).toBeVisible()
      await listLink.click()
      await ownerPage.waitForURL('**/lister/*', { waitUntil: 'networkidle' })

      // Add items from UI.
      await addItem(ownerPage, 'Bananer')
      await addItem(ownerPage, 'Melk')

      // Select the created store so sorting/grouping uses store layout.
      await ownerPage.getByRole('button', { name: /Butikk:/ }).click()
      await ownerPage.getByRole('button', { name: storeDisplayName }).click()
      await ownerPage.getByRole('button', { name: /Butikk:/ }).click()
      await expect(ownerPage.locator(`button:has-text("${storeDisplayName}"):has-text("Valgt")`)).toBeVisible()
      await ownerPage.keyboard.press('Escape')

      // Capture documentation screenshot: selected store with sorted shopping list.
      const screenshotPath = testInfo.outputPath('shopping-list-selected-store.png')
      await ownerPage.screenshot({ path: screenshotPath, fullPage: true })
      await testInfo.attach('shopping-list-selected-store', {
        path: screenshotPath,
        contentType: 'image/png',
      })

      // Check out items in the selected store flow.
      await ownerPage.getByRole('checkbox', { name: /Bananer/ }).first().click()
      await ownerPage.getByRole('checkbox', { name: /Melk/ }).first().click()
      await expect(ownerPage.getByText('Alle varer er handlet!')).toBeVisible()
    } finally {
      await ownerContext.close().catch(() => {})
      await memberContext.close().catch(() => {})
      await deleteTestUser(memberUser.id)
      await deleteTestUser(ownerUser.id)
    }
  })
})
