import { expect, test } from '@playwright/test'

test('manifest link tag present', async ({ page }) => {
	await page.goto('/logg-inn')

	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		/manifest\.webmanifest$/
	)
})

test('manifest has required fields', async ({ page }) => {
	await page.goto('/logg-inn')

	const manifest = await page.evaluate(async () => {
		const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
		if (!link?.href) {
			throw new Error('Manifest link missing')
		}

		const response = await fetch(link.href)
		return response.json()
	})

	expect(manifest.name).toBeTruthy()
	expect(manifest.display).toBe('standalone')
	expect(manifest.start_url).toBeTruthy()
	expect(Array.isArray(manifest.icons)).toBe(true)
	expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
})

test('service worker registered', async ({ page }) => {
	test.skip(process.env.PW_SW_MODE !== 'preview', 'Service worker registration is verified in preview mode')

	await page.goto('/logg-inn')
	await page.waitForFunction(async () => {
		if (!('serviceWorker' in navigator)) {
			return false
		}

		const registration = await navigator.serviceWorker.ready
		return Boolean(navigator.serviceWorker.controller || registration?.active)
	})

	const hasServiceWorker = await page.evaluate(() => 'serviceWorker' in navigator)
	expect(hasServiceWorker).toBe(true)
})
