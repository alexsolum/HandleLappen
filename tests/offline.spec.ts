import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page, type Route } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { clearHistoryForList, countHistoryRowsForItem } from './helpers/history'
import { createTestItem, createTestList, deleteTestList } from './helpers/lists'
import { replayBatch, type QueuedMutation } from '../src/lib/offline/queue'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

type OfflineFixture = {
	email: string
	password: string
	userId: string
	listId: string
}

function createAdminClient() {
	if (!SERVICE_ROLE_KEY) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for offline tests')
	}

	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	})
}

async function countListItemsByName(listId: string, itemName: string): Promise<number> {
	const admin = createAdminClient()
	const { count, error } = await admin
		.from('list_items')
		.select('id', { count: 'exact', head: true })
		.eq('list_id', listId)
		.eq('name', itemName)

	if (error) throw error
	return count ?? 0
}

function createReplayStubClient(options: { failHistoryForItemId?: string | null }) {
	const state = {
		deletedItemIds: [] as string[],
		toggledItemIds: [] as string[],
		historyRows: [] as Array<{ itemId: string; itemName: string }>,
	}

	const client = {
		from(table: string) {
			if (table === 'list_items') {
				return {
					delete() {
						return {
							async eq(_column: string, itemId: string) {
								state.deletedItemIds.push(itemId)
								return { error: null }
							},
						}
					},
					update() {
						return {
							async eq(_column: string, itemId: string) {
								state.toggledItemIds.push(itemId)
								return { error: null }
							},
						}
					},
				}
			}

			if (table === 'item_history') {
				return {
					async insert(payload: {
						item_id?: string | null
						item_name?: string | null
					}) {
						if (payload.item_id === options.failHistoryForItemId) {
							return { error: new Error('forced history failure') }
						}

						state.historyRows.push({
							itemId: payload.item_id ?? '',
							itemName: payload.item_name ?? '',
						})
						return { error: null }
					},
				}
			}

			throw new Error(`Unexpected table ${table}`)
		},
	}

	return { client, state }
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

	test('check-off while offline shows optimistic update', async ({
		page,
		context,
	}) => {
		const firstCheckbox = page.getByTestId('item-checkbox').first()

		await context.setOffline(true)
		await expect(page.getByTestId('offline-indicator')).toBeVisible()
		await firstCheckbox.click()

		await expect(page.getByText('Handlet (1)')).toBeVisible()
	})

	test('add-item input is disabled when offline', async ({ page, context }) => {
		await context.setOffline(true)

		await expect(page.locator('input[placeholder="Legg til vare…"]')).toBeDisabled()
		await expect(page.getByRole('button', { name: 'Legg til', exact: true })).toBeDisabled()
	})

	test('reconnect replays the offline change to history', async ({ page, context }) => {
		const firstCheckbox = page.getByTestId('item-checkbox').first()

		await context.setOffline(true)
		await expect(page.getByTestId('offline-indicator')).toBeVisible()
		await firstCheckbox.click()
		await expect(page.getByText('Handlet (1)')).toBeVisible()

		await context.setOffline(false)

		await expect(page.getByTestId('offline-indicator')).toHaveCount(0)
		await expect.poll(() => countHistoryRowsForItem(fixture!.listId, 'Melk')).toBe(1)
	})

	test('mixed replay outcome keeps successful entries cleared and avoids duplicate history on retry', async ({
		page,
		context
	}) => {
		await createTestItem(fixture!.listId, 'Brød', 1)
		await page.reload({ waitUntil: 'networkidle' })

		const melkCheckbox = page.getByTestId('item-checkbox').filter({ hasText: 'Melk' })
		const brodCheckbox = page.getByTestId('item-checkbox').filter({ hasText: 'Brød' })
		await expect(melkCheckbox).toHaveCount(1)
		await expect(brodCheckbox).toHaveCount(1)

		await context.setOffline(true)
		await expect(page.getByTestId('offline-indicator')).toBeVisible()

		await melkCheckbox.click({ force: true })
		await expect(page.getByText('Handlet (1)')).toBeVisible()
		await brodCheckbox.click({ force: true })
		await expect(page.getByText('Handlet (2)')).toBeVisible()

		let failedBrodPost = false
		const historyRouteHandler = async (route: Route) => {
			const request = route.request()
			if (request.method() !== 'POST') {
				await route.continue()
				return
			}

			const body = request.postDataJSON() as Record<string, unknown> | Array<Record<string, unknown>> | null
			const payload = Array.isArray(body) ? body[0] : body
			const itemName = typeof payload?.item_name === 'string' ? payload.item_name : null

			if (!failedBrodPost && itemName === 'Brød') {
				failedBrodPost = true
				await route.fulfill({ status: 500, body: '{"message":"forced failure"}' })
				return
			}

			await route.continue()
		}

		await page.route('**/rest/v1/item_history*', historyRouteHandler)

		await context.setOffline(false)
		await expect.poll(() => countHistoryRowsForItem(fixture!.listId, 'Melk')).toBe(1)
		await expect.poll(() => countHistoryRowsForItem(fixture!.listId, 'Brød')).toBe(0)

		await page.unroute('**/rest/v1/item_history*', historyRouteHandler)

		await context.setOffline(true)
		await context.setOffline(false)

		await expect.poll(() => countHistoryRowsForItem(fixture!.listId, 'Melk')).toBe(1)
		await expect.poll(() => countHistoryRowsForItem(fixture!.listId, 'Brød')).toBe(1)
	})

	test('offline replay home delete does not create history', async () => {
		const email = `offline-home-${Date.now()}@test.example`
		const password = 'password123'
		const { user, household } = await createHouseholdUser(email, password)
		const list = await createTestList(household.id, 'Offline home replay')
		const item = await createTestItem(list.id, 'offline home replay', 1)
		const timestamp = new Date().toISOString()

		try {
			await clearHistoryForList(list.id)

			const result = await replayBatch(createAdminClient(), [
				{
					id: item.id,
					type: 'home-delete',
					payload: {
					itemId: item.id,
					listId: list.id,
					itemName: item.name,
					userId: user.id,
					timestamp,
					mode: 'home-delete',
				},
				enqueuedAt: timestamp,
			},
			])

			expect(result.succeeded).toBe(1)
			expect(result.failed).toBe(0)
			expect(result.survivors).toEqual([])
			await expect(countHistoryRowsForItem(list.id, item.name)).resolves.toBe(0)
			await expect(countListItemsByName(list.id, item.name)).resolves.toBe(0)
		} finally {
			await deleteTestList(list.id)
			await deleteTestUser(user.id)
		}
	})

	test('replay home-delete success stays cleared even when later history replay fails', async () => {
		const timestamp = new Date().toISOString()
		const queued: QueuedMutation[] = [
			{
				id: 'home-delete-item',
				type: 'home-delete',
				payload: {
					itemId: 'home-delete-item',
					listId: 'list-1',
					itemName: 'offline home',
					userId: 'user-1',
					timestamp,
					mode: 'home-delete',
				},
				enqueuedAt: timestamp,
			},
			{
				id: 'history-toggle-item',
				type: 'toggle',
				payload: {
					itemId: 'history-toggle-item',
					listId: 'list-1',
					isChecked: true,
					itemName: 'later replay home failure',
					userId: 'user-1',
					timestamp,
					mode: 'history-toggle',
				},
				enqueuedAt: timestamp,
			},
		]
		const { client, state } = createReplayStubClient({ failHistoryForItemId: 'history-toggle-item' })

		const result = await replayBatch(client as never, queued)

		expect(result.succeeded).toBe(1)
		expect(result.failed).toBe(1)
		expect(result.survivors).toHaveLength(1)
		expect(result.survivors[0]?.id).toBe('history-toggle-item')
		expect(state.deletedItemIds).toEqual(['home-delete-item'])
		expect(state.historyRows).toEqual([])
	})
})
