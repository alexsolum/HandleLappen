export type BarcodeLookupDto = {
  ean: string
  found: boolean
  itemName: string | null
  canonicalCategory: string | null
  confidence: number | null
  source: string
}

export type KassalProductFixture = {
  product: {
    id: number
    name: string
    brand: string
    ean: string
    category: string
    image: string | null
  }
}

export type OpenFoodFactsFixture = {
  status: 1
  code: string
  product: {
    code: string
    product_name: string
    brands: string
    categories_tags: string[]
  }
}

export function buildKassalHit(overrides: Partial<KassalProductFixture['product']> = {}) {
  return {
    product: {
      id: 48151623,
      name: 'Pepsi Max 1,5 L',
      brand: 'Pepsi',
      ean: '7044610878304',
      category: 'Brus',
      image: null,
      ...overrides,
    },
  } satisfies KassalProductFixture
}

export function buildOpenFoodFactsFallbackHit(
  overrides: Partial<OpenFoodFactsFixture['product']> = {}
) {
  return {
    status: 1 as const,
    code: '7044610878304',
    product: {
      code: '7044610878304',
      product_name: 'Pepsi Max',
      brands: 'Pepsi',
      categories_tags: ['en:beverages', 'no:brus'],
      ...overrides,
    },
  } satisfies OpenFoodFactsFixture
}

export function buildNotFoundLookup(
  overrides: Partial<BarcodeLookupDto> = {}
): BarcodeLookupDto {
  return {
    ean: '7044610878304',
    found: false,
    itemName: null,
    canonicalCategory: null,
    confidence: null,
    source: 'not_found',
    ...overrides,
  }
}

export function buildGeminiNormalizedResponse(
  overrides: Partial<BarcodeLookupDto> = {}
): BarcodeLookupDto {
  return {
    ean: '7044610878304',
    found: true,
    itemName: 'Pepsi Max 1,5 L',
    canonicalCategory: 'drikke',
    confidence: 0.92,
    source: 'kassal+gemini',
    ...overrides,
  }
}

export function buildOffFallbackNormalizedResponse(
  overrides: Partial<BarcodeLookupDto> = {}
): BarcodeLookupDto {
  return {
    ean: '7044610878304',
    found: true,
    itemName: 'Pepsi Max',
    canonicalCategory: 'drikke',
    confidence: 0.81,
    source: 'open_food_facts+gemini',
    ...overrides,
  }
}
