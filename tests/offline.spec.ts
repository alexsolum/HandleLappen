import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestItem, createTestList, deleteTestList } from './helpers/lists'

type OfflineFixture = {
	email: string
	password: string
	userId: string
	listId: string
}

async function loginAndOpenList(page: Page, fixture: OfflineFixture) {
	await page.goto('/logg-inn', { waitUntil: 'networkidle' })
	await page.fill('[type=email]', fixture.email)
	await page.fill('[type=password]', fixture.password)
	await page.click('button:has-text("Logg inn")')
	await page.waitForURL('/')
	await page.waitForLoadState('networkidle')

	await page.goto(`/lister/${fixture.listId}`, { waitUntil: 'networkidle' })
	await page.waitForSelector('input[placeholder="Legg til vare…"]')
}

async function expectPendingQueueCount(page: Page, expected: number) {
	await expect
		.poll(() =>
			page.evaluate(() => {
				return (window as Window & { __pendingQueueCount?: number }).__pendingQueueCount ?? 0
			}), { timeout: 45_000 }
		)
		.toBe(expected)
}

test.describe('Offline behavior', () => {
	test.describe.configure({ timeout: 90_000 })

	let fixture: OfflineFixture | null = null

	test.beforeEach(async ({ page }) => {
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
		if (!serviceKey) {
			test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
			return
		}

		const email = `offline-${Date.now()}-${Math.round(Math.random() * 1000)}@test.example`
		const password = 'password123'
		const { user, household } = await createHouseholdUser(email, password)
		const list = await createTestList(household.id, 'Offline testliste')
		await createTestItem(list.id, 'Melk', 1)

		fixture = {
			email,
			password,
			userId: user.id,
			listId: list.id,
		}

		await loginAndOpenList(page, fixture)
		await page.waitForSelector('[data-testid="item-checkbox"]')
	})

	test.afterEach(async ({ context }) => {
		await context.setOffline(false)

		if (fixture) {
			await deleteTestList(fixture.listId)
			await deleteTestUser(fixture.userId)
			fixture = null
		}
	})

	test('shows offline indicator in BottomNav when offline', async ({ page, context }) => {
		await expect(page.getByTestId('offline-indicator')).toHaveCount(0)

		await context.setOffline(true)

		await expect(page.getByTestId('offline-indicator')).toBeVisible()
	})

	test('check-off while offline shows optimistic update and pending badge', async ({
		page,
		context,
	}) => {
		const firstCheckbox = page.getByTestId('item-checkbox').first()

		await context.setOffline(true)
		await expect(page.getByTestId('offline-indicator')).toBeVisible()
		await firstCheckbox.click()

		await expect(page.getByText('Handlet (1)')).toBeVisible()
		await expectPendingQueueCount(page, 1)
	})

	test('add-item input is disabled when offline', async ({ page, context }) => {
		await context.setOffline(true)

		await expect(page.locator('input[placeholder="Legg til vare…"]')).toBeDisabled()
		await expect(page.getByRole('button', { name: 'Legg til' })).toBeDisabled()
	})

	test('shows sync toast after reconnect and clears badge', async ({ page, context }) => {
		const firstCheckbox = page.getByTestId('item-checkbox').first()
		const syncToast = page.getByTestId('sync-toast')

		await context.setOffline(true)
		await expect(page.getByTestId('offline-indicator')).toBeVisible()
		await firstCheckbox.click()
		await expect(page.getByText('Handlet (1)')).toBeVisible()
		await expectPendingQueueCount(page, 1)

		await context.setOffline(false)

		await expect(syncToast).toBeVisible()
		await expect(syncToast).toContainText('Endringer synkronisert')
		await expect(syncToast).not.toBeVisible({ timeout: 3500 })
		await expectPendingQueueCount(page, 0)
	})
})
