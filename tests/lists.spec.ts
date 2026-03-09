import { test, expect } from '@playwright/test'

// These tests are implemented in plan 02-02 when the list UI exists.
// Stubs are present so verify commands resolve without "no tests found" errors.

test.describe('lists', () => {
  test.skip('create list — user can create a named list and it appears on the home screen', async ({ page }) => {
    // TODO: implement in plan 02-02
  })

  test.skip('delete list — user can swipe-delete a list and it disappears', async ({ page }) => {
    // TODO: implement in plan 02-02
  })
})
