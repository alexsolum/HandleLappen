export const CANONICAL_CATEGORIES = [
  'frukt_og_gront',
  'brod_og_bakevarer',
  'palegg_og_kjott',
  'meieri_og_egg',
  'kjott_og_fisk',
  'hermetikk_og_glass',
  'pasta_ris_og_korn',
  'snacks_og_godteri',
  'drikke',
  'rengjoring',
  'helse_og_hygiene',
  'kjol_og_frys',
] as const

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number]

export type BarcodeLookupDto = {
  ean: string
  found: boolean
  itemName: string | null
  canonicalCategory: CanonicalCategory | null
  confidence: number | null
  source: string
}

export type BarcodeCacheRow = {
  ean: string
  normalized_name: string | null
  canonical_category: string | null
  confidence: number | null
  source: string
  status: 'found' | 'not_found'
  provider_payload: Record<string, unknown> | null
  provider_fetched_at: string | null
  ai_enriched_at: string | null
  expires_at: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type KassalProduct = {
  id?: number | string | null
  ean?: string | number | null
  name?: string | null
  brand?: string | null
  category?: string | null
  categories?: string[] | null
  image?: string | null
}

export type OpenFoodFactsProduct = {
  code?: string | null
  product_name?: string | null
  brands?: string | null
  categories?: string | null
  categories_tags?: string[] | null
}

export type ReducedProviderPayload = {
  ean: string
  source: 'kassal' | 'open_food_facts' | 'kassal+open_food_facts' | 'not_found'
  productName: string | null
  brand: string | null
  categoryHints: string[]
  providers: {
    kassal: null | {
      id: number | string | null
      name: string | null
      brand: string | null
      category: string | null
    }
    openFoodFacts: null | {
      code: string | null
      productName: string | null
      brands: string | null
      categoriesTags: string[]
    }
  }
}

export type GeminiNormalizedResponse = {
  itemName: string
  canonicalCategory: CanonicalCategory
  confidence: number
  found?: boolean
}

const CATEGORY_PATTERNS: Array<{ category: CanonicalCategory; patterns: RegExp[] }> = [
  { category: 'frukt_og_gront', patterns: [/frukt/i, /gronn?t/i, /gront/i, /produce/i] },
  { category: 'brod_og_bakevarer', patterns: [/brod/i, /brød/i, /bake/i, /bakery/i] },
  { category: 'palegg_og_kjott', patterns: [/palegg/i, /pålegg/i, /skinke/i, /meat spread/i] },
  { category: 'meieri_og_egg', patterns: [/meieri/i, /egg/i, /yoghurt/i, /milk/i, /dairy/i] },
  { category: 'kjott_og_fisk', patterns: [/kjott/i, /kjøtt/i, /fisk/i, /seafood/i, /meat/i] },
  {
    category: 'hermetikk_og_glass',
    patterns: [/hermetikk/i, /glass/i, /canned/i, /preserves/i],
  },
  { category: 'pasta_ris_og_korn', patterns: [/pasta/i, /ris/i, /korn/i, /grain/i] },
  { category: 'snacks_og_godteri', patterns: [/snack/i, /godteri/i, /candy/i, /chips/i] },
  { category: 'drikke', patterns: [/drikke/i, /brus/i, /juice/i, /vann/i, /beverage/i, /drink/i] },
  {
    category: 'rengjoring',
    patterns: [/rengjoring/i, /rengjøring/i, /soap/i, /detergent/i, /clean/i],
  },
  {
    category: 'helse_og_hygiene',
    patterns: [/hygiene/i, /helse/i, /toothpaste/i, /shampoo/i, /deodorant/i],
  },
  { category: 'kjol_og_frys', patterns: [/kjol/i, /kjøl/i, /frys/i, /frozen/i, /chilled/i] },
]

function asTrimmedString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asCategory(value: unknown): CanonicalCategory | null {
  if (typeof value !== 'string') return null
  return CANONICAL_CATEGORIES.includes(value as CanonicalCategory)
    ? (value as CanonicalCategory)
    : null
}

export function normalizeBarcode(input: string) {
  const digitsOnly = input.replace(/\D/g, '')

  if (digitsOnly.length === 12) {
    return `0${digitsOnly}`
  }

  return [8, 13, 14].includes(digitsOnly.length) ? digitsOnly : null
}

export function isKassalProductUsable(product: KassalProduct | null) {
  if (!product) return false
  return Boolean(asTrimmedString(product.name) || asTrimmedString(product.category))
}

export function buildReducedProviderPayload(input: {
  ean: string
  kassalProduct: KassalProduct | null
  openFoodFactsProduct: OpenFoodFactsProduct | null
}): ReducedProviderPayload {
  const kassalName = asTrimmedString(input.kassalProduct?.name)
  const kassalBrand = asTrimmedString(input.kassalProduct?.brand)
  const kassalCategory = asTrimmedString(input.kassalProduct?.category)
  const openFoodFactsName = asTrimmedString(input.openFoodFactsProduct?.product_name)
  const openFoodFactsBrand = asTrimmedString(input.openFoodFactsProduct?.brands)
  const openFoodFactsCategories = input.openFoodFactsProduct?.categories_tags?.filter(Boolean) ?? []

  const source =
    input.kassalProduct && input.openFoodFactsProduct
      ? 'kassal+open_food_facts'
      : input.kassalProduct
        ? 'kassal'
        : input.openFoodFactsProduct
          ? 'open_food_facts'
          : 'not_found'

  return {
    ean: input.ean,
    source,
    productName: kassalName ?? openFoodFactsName,
    brand: kassalBrand ?? openFoodFactsBrand,
    categoryHints: [kassalCategory, ...openFoodFactsCategories].filter(
      (value): value is string => Boolean(value)
    ),
    providers: {
      kassal: input.kassalProduct
        ? {
            id: input.kassalProduct.id ?? null,
            name: kassalName,
            brand: kassalBrand,
            category: kassalCategory,
          }
        : null,
      openFoodFacts: input.openFoodFactsProduct
        ? {
            code: asTrimmedString(input.openFoodFactsProduct.code),
            productName: openFoodFactsName,
            brands: openFoodFactsBrand,
            categoriesTags: openFoodFactsCategories,
          }
        : null,
    },
  }
}

export function resolveCanonicalCategory(categoryHints: string[]) {
  for (const hint of categoryHints) {
    for (const entry of CATEGORY_PATTERNS) {
      if (entry.patterns.some((pattern) => pattern.test(hint))) {
        return entry.category
      }
    }
  }

  return null
}

export function fallbackLookupFromProviderPayload(
  payload: ReducedProviderPayload
): BarcodeLookupDto {
  const canonicalCategory = resolveCanonicalCategory([
    payload.productName ?? '',
    payload.brand ?? '',
    ...payload.categoryHints,
  ])

  return {
    ean: payload.ean,
    found: Boolean(payload.productName),
    itemName: payload.productName,
    canonicalCategory,
    confidence: payload.productName ? (canonicalCategory ? 0.66 : 0.42) : null,
    source: payload.source,
  }
}

export function validateGeminiResponse(
  value: unknown
): GeminiNormalizedResponse | null {
  if (!value || typeof value !== 'object') return null

  const itemName = asTrimmedString((value as Record<string, unknown>).itemName)
  const canonicalCategory = asCategory((value as Record<string, unknown>).canonicalCategory)
  const confidence = (value as Record<string, unknown>).confidence
  const found = (value as Record<string, unknown>).found

  if (!itemName || !canonicalCategory) return null
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return null
  if (confidence < 0 || confidence > 1) return null
  if (found != null && typeof found !== 'boolean') return null

  return {
    itemName,
    canonicalCategory,
    confidence,
    found: typeof found === 'boolean' ? found : undefined,
  }
}

export function applyGeminiResult(
  payload: ReducedProviderPayload,
  geminiResult: GeminiNormalizedResponse
): BarcodeLookupDto {
  return {
    ean: payload.ean,
    found: geminiResult.found ?? true,
    itemName: geminiResult.itemName,
    canonicalCategory: geminiResult.canonicalCategory,
    confidence: geminiResult.confidence,
    source: `${payload.source}+gemini`,
  }
}

export function createNotFoundLookup(ean: string): BarcodeLookupDto {
  return {
    ean,
    found: false,
    itemName: null,
    canonicalCategory: null,
    confidence: null,
    source: 'not_found',
  }
}

export function cacheRowToLookupDto(row: BarcodeCacheRow): BarcodeLookupDto {
  return {
    ean: row.ean,
    found: row.status === 'found',
    itemName: row.status === 'found' ? row.normalized_name : null,
    canonicalCategory:
      row.status === 'found' ? asCategory(row.canonical_category) : null,
    confidence: row.status === 'found' ? row.confidence : null,
    source: row.source,
  }
}
