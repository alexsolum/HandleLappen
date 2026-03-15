---
task: Fill items database with top products from kassal.app
gathered: 2026-03-15
status: Ready for planning
---

# Quick Task 5: Fill Items Database — Context

<domain>
## Task Boundary

Populate the `items` database table with top products from Kassal.app that the family is most likely to buy. This enables users to quickly add common household products to their shopping lists without barcode scanning.

</domain>

<decisions>
## Implementation Decisions

### Product Selection Criteria
- Use Kassal.app's popularity/trending data to identify top products
- No category filtering — retrieve most popular products across all categories

### Data Fields to Import
- `name` (product name)
- `category` (product category)
- `brand` (manufacturer/brand)
- `image_url` (product image)

### Handling Existing Products
- If a product already exists in the `items` table, update it with fresh Kassal data (name, category, brand, image_url)
- Use product name as the matching key (or SKU if available)

</decisions>

<specifics>
## Specific Implementation Notes

- Kassal API endpoint: `https://kassal.app/api/v1/products` (or equivalent for fetching top products)
- Number of products to import: ~50-100 top products (to be determined during planning)
- Should integrate with existing `extractKassalProduct` and product enrichment utilities from Phase 19

</specifics>
