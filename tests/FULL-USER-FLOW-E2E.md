# Full User Flow E2E

This test covers one complete household shopping flow:

1. User A logs in with email/password.
2. User A reads household invite code.
3. User B logs in with email/password and joins the same household via invite code.
4. User A creates a store in `/admin/butikker`.
5. User A geo-locates the store by clicking the map in `/admin/butikker/[id]`.
6. User A creates a shopping list.
7. User A opens the list, selects the created store, adds items, assigns categories, and checks out items.
8. A screenshot is captured showing the selected store and shopping list view.

## Run

```bash
npx playwright test tests/full-user-flow.spec.ts --headed
```

## Screenshot Artifact

The test writes and attaches:

- `shopping-list-selected-store.png`

When run via Playwright, the file is located in the test output folder under `test-results/`.

