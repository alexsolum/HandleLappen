import { test, expect } from '@playwright/test'

test.describe('realtime', () => {
  test.skip('realtime sync — change on one device appears on a second device within 3 seconds', async ({ browser: pw }) => {
    // TODO: implement in plan 02-04
    // Requires two browser contexts with two users in the same household.
  })
})
