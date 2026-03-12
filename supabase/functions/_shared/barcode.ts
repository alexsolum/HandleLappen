export const CANONICAL_CATEGORIES = [
  'frukt_og_gront',
  'urter_og_ferdigkuttede_gronnsaker',
  'brod_og_bakervarer',
  'frokostblanding_og_havregryn',
  'meieriprodukter',
  'ost',
  'egg',
  'ferskt_kjott',
  'kylling_og_kalkun',
  'fisk_og_sjomat',
  'ferdigretter_og_delikatesse',
  'frysevarer',
  'pasta_ris_og_kornprodukter',
  'bakevarer_og_bakeingredienser',
  'hermetikk_og_glassvarer',
  'sauser_og_matoljer',
  'krydder',
  'snacks',
  'sjokolade_og_godteri',
  'drikkevarer',
  'kaffe_og_te',
  'ol_og_cider',
  'husholdningsartikler',
  'personlig_hygiene',
  'dyremat',
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
  { category: 'frukt_og_gront', patterns: [/frukt/i, /gronn?t/i, /gront/i, /eple/i, /banan/i, /produce/i] },
  {
    category: 'urter_og_ferdigkuttede_gronnsaker',
    patterns: [/urte/i, /basil/i, /koriander/i, /ferdigkuttet/i, /salatmix/i, /cut vegetables?/i],
  },
  { category: 'brod_og_bakervarer', patterns: [/brod/i, /brød/i, /rundstykke/i, /bagett/i, /bakervare/i, /bakery/i] },
  { category: 'frokostblanding_og_havregryn', patterns: [/frokostblanding/i, /musli/i, /granola/i, /havregryn/i, /cereal/i, /oats?/i] },
  { category: 'meieriprodukter', patterns: [/meieri/i, /yoghurt/i, /melk/i, /milk/i, /dairy/i, /creme fraiche/i] },
  { category: 'ost', patterns: [/ost/i, /cheese/i, /mozzarella/i, /brie/i] },
  { category: 'egg', patterns: [/\begg\b/i, /eggs?/i] },
  { category: 'ferskt_kjott', patterns: [/fersk(t)? kjott/i, /fersk(t)? kjøtt/i, /biff/i, /svine/i, /storfe/i, /beef/i, /pork/i] },
  { category: 'kylling_og_kalkun', patterns: [/kylling/i, /kalkun/i, /chicken/i, /turkey/i] },
  { category: 'fisk_og_sjomat', patterns: [/fisk/i, /sjomat/i, /sjømat/i, /laks/i, /torsk/i, /tunfisk/i, /seafood/i] },
  {
    category: 'ferdigretter_og_delikatesse',
    patterns: [/ferdigrett/i, /delikatesse/i, /palegg/i, /pålegg/i, /salatbar/i, /ready meal/i, /deli/i],
  },
  { category: 'frysevarer', patterns: [/frys/i, /frozen/i, /is(krem)?/i, /pizza/i, /kjol/i, /kjøl/i] },
  { category: 'pasta_ris_og_kornprodukter', patterns: [/pasta/i, /ris/i, /korn/i, /nudler/i, /grain/i, /rice/i] },
  { category: 'bakevarer_og_bakeingredienser', patterns: [/bakemiks/i, /gjær/i, /mel\b/i, /sukker/i, /bakeingrediens/i, /flour/i, /baking/i] },
  { category: 'hermetikk_og_glassvarer', patterns: [/hermetikk/i, /glassvarer/i, /glass\b/i, /canned/i, /preserves/i] },
  { category: 'sauser_og_matoljer', patterns: [/saus/i, /dressing/i, /pesto/i, /matolje/i, /oil/i, /vinaigrette/i] },
  { category: 'krydder', patterns: [/krydder/i, /pepper/i, /spice/i, /seasoning/i, /urtesalt/i] },
  { category: 'snacks', patterns: [/snack/i, /chips/i, /popcorn/i, /saltstenger/i] },
  { category: 'sjokolade_og_godteri', patterns: [/sjokolade/i, /godteri/i, /candy/i, /chocolate/i, /smagodt/i, /smågodt/i] },
  { category: 'drikkevarer', patterns: [/drikke/i, /brus/i, /juice/i, /vann/i, /beverage/i, /drink/i, /soda/i] },
  { category: 'kaffe_og_te', patterns: [/kaffe/i, /\bte\b/i, /coffee/i, /tea/i] },
  { category: 'ol_og_cider', patterns: [/ol/i, /øl/i, /cider/i, /beer/i] },
  { category: 'husholdningsartikler', patterns: [/hushold/i, /rengjoring/i, /rengjøring/i, /detergent/i, /clean/i, /foil/i, /papir/i] },
  { category: 'personlig_hygiene', patterns: [/hygiene/i, /shampoo/i, /deodorant/i, /toothpaste/i, /tannkrem/i, /soap/i] },
  { category: 'dyremat', patterns: [/dyremat/i, /hundemat/i, /kattemat/i, /pet food/i, /dog food/i, /cat food/i] },
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
