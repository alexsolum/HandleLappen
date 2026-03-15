/**
 * Kassal seed-items utility
 *
 * Fetches top/trending products from the Kassal API v1 and enriches them
 * with brand filtering and image resolution for seeding the global items catalog.
 */

const KASSAL_API_URL = 'https://kassal.app/api/v1/products'

/** Product shape returned by Kassal API v1 */
type KassalApiProduct = {
  id?: number | string | null
  ean?: string | number | null
  name?: string | null
  brand?: string | null
  vendor?: string | null
  category?: { name?: string | null } | string | null
  image?: string | null
}

/** Enriched product ready for DB insert */
export type SeedProduct = {
  name: string
  category: string | null
  brand: string | null
  image_url: string | null
}

const JUNK_BRANDS = new Set(['none', 'n/a', 'ukjent', 'unknown', 'na', '-', ''])

function isJunkBrand(brand: string | null | undefined): string | null {
  if (brand == null) return null
  const trimmed = brand.trim()
  if (JUNK_BRANDS.has(trimmed.toLowerCase())) return null
  return trimmed.length > 0 ? trimmed : null
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function extractCategoryName(category: KassalApiProduct['category']): string | null {
  if (!category) return null
  if (typeof category === 'string') return asTrimmedString(category)
  if (typeof category === 'object' && 'name' in category) return asTrimmedString(category.name)
  return null
}

async function fetchKassalPage(params: URLSearchParams): Promise<KassalApiProduct[]> {
  const url = `${KASSAL_API_URL}?${params.toString()}`

  const kassalToken = process.env.KASSAL_API_TOKEN
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (kassalToken) {
    headers['Authorization'] = `Bearer ${kassalToken}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Kassal API responded with ${response.status} for ${url}`)
  }

  const json = (await response.json()) as unknown

  // Kassal API v1 response: { data: { products: [...] } } or { data: [...] }
  if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>
    if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
      const data = record.data as Record<string, unknown>
      if (Array.isArray(data.products)) {
        return data.products as KassalApiProduct[]
      }
    }
    if (Array.isArray(record.data)) {
      return record.data as KassalApiProduct[]
    }
    // Direct array response
    if (Array.isArray(json)) {
      return json as KassalApiProduct[]
    }
  }

  return []
}

async function fetchTopProducts(targetCount: number): Promise<KassalApiProduct[]> {
  const products: KassalApiProduct[] = []
  const seen = new Set<string>()

  // Attempt 1: trending products
  try {
    const trendingParams = new URLSearchParams({ size: String(Math.min(targetCount, 100)) })
    const trending = await fetchKassalPage(trendingParams)
    for (const p of trending) {
      const name = asTrimmedString(p.name)
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        products.push(p)
      }
    }
    console.log(`Fetched ${products.length} products from Kassal (page 1)`)
  } catch (error) {
    console.warn('Failed to fetch trending products from Kassal:', error)
  }

  // Attempt 2: additional pages if needed
  if (products.length < targetCount) {
    for (let page = 2; page <= 5 && products.length < targetCount; page++) {
      try {
        const params = new URLSearchParams({
          size: String(Math.min(targetCount - products.length, 100)),
          page: String(page),
        })
        const more = await fetchKassalPage(params)
        if (more.length === 0) break

        for (const p of more) {
          const name = asTrimmedString(p.name)
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase())
            products.push(p)
          }
        }
        console.log(`Fetched ${products.length} products total (after page ${page})`)
      } catch (error) {
        console.warn(`Failed to fetch page ${page} from Kassal:`, error)
        break
      }
    }
  }

  return products
}

function enrichProduct(product: KassalApiProduct): SeedProduct | null {
  const name = asTrimmedString(product.name)
  if (!name) return null

  const brand = isJunkBrand(asTrimmedString(product.brand) ?? asTrimmedString(product.vendor))
  const category = extractCategoryName(product.category)
  const image_url = asTrimmedString(product.image)

  return {
    name: name.toLowerCase().trim(),
    category,
    brand,
    image_url,
  }
}

/**
 * Fetch top products from Kassal API and enrich with brand/image metadata.
 * Returns array of enriched products ready for DB upsert.
 */
export async function fetchAndEnrichTopProducts(targetCount = 100): Promise<SeedProduct[]> {
  console.log(`Fetching top ${targetCount} products from Kassal...`)

  const rawProducts = await fetchTopProducts(targetCount)
  console.log(`Raw products fetched: ${rawProducts.length}`)

  const enriched: SeedProduct[] = []
  let enrichmentFailures = 0

  for (const product of rawProducts) {
    try {
      const result = enrichProduct(product)
      if (result) {
        enriched.push(result)
      } else {
        enrichmentFailures++
        console.warn(`Skipped product (no name): ${JSON.stringify(product)}`)
      }
    } catch (error) {
      enrichmentFailures++
      console.warn(`Enrichment failed for product ${product.id}:`, error)
    }
  }

  if (enrichmentFailures > 0) {
    console.warn(`Enrichment failures: ${enrichmentFailures}`)
  }

  console.log(`Enriched ${enriched.length} products successfully`)
  return enriched
}
