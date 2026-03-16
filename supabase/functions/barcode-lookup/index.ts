import { createClient } from '@supabase/supabase-js'
import {
  applyGeminiResult,
  buildReducedProviderPayload,
  cacheRowToLookupDto,
  CANONICAL_CATEGORIES,
  createNotFoundLookup,
  fallbackLookupFromProviderPayload,
  isKassalProductUsable,
  normalizeBarcode,
  validateGeminiResponse,
  type BarcodeCacheRow,
  type BarcodeLookupDto,
  type KassalProduct,
  type OpenFoodFactsProduct,
  type ReducedProviderPayload,
} from '../_shared/barcode.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const FOUND_TTL_MS = 30 * 24 * 60 * 60 * 1000
const NOT_FOUND_TTL_MS = 3 * 24 * 60 * 60 * 1000
// Cache entries created before this date may lack brand/image_url — trigger re-fetch
const ACTIVATION_DATE = '2026-03-14T00:00:00Z'

type LookupRequestBody = {
  ean?: unknown
  listId?: unknown
}

type Dependencies = {
  validateAuth: (request: Request) => Promise<{ userId: string }>
  readCache: (ean: string) => Promise<BarcodeLookupDto | null>
  writeCache: (row: BarcodeCacheRow) => Promise<void>
  fetchKassalProduct: (ean: string) => Promise<KassalProduct | null>
  fetchOpenFoodFactsProduct: (ean: string) => Promise<OpenFoodFactsProduct | null>
  enrichWithGemini: (payload: ReducedProviderPayload) => Promise<unknown>
  now: () => Date
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  })
}

function ensureEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function extractBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Unauthorized')
  }

  return authorization.slice('Bearer '.length).trim()
}

function decodeJwtSub(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const data = JSON.parse(json) as Record<string, unknown>
    return typeof data.sub === 'string' && data.sub ? data.sub : null
  } catch {
    return null
  }
}

function extractKassalProduct(payload: unknown): KassalProduct | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>

  // Kassal API v1 returns { data: { products: [...] } }
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    const data = record.data as Record<string, unknown>
    if (Array.isArray(data.products) && data.products[0] && typeof data.products[0] === 'object') {
      return data.products[0] as KassalProduct
    }
  }

  // Kassal API v1 alternate: { data: [...] }
  if (Array.isArray(record.data) && record.data[0] && typeof record.data[0] === 'object') {
    return record.data[0] as KassalProduct
  }

  // Legacy: { product: {...} }
  if (record.product && typeof record.product === 'object') {
    return record.product as KassalProduct
  }

  return record as KassalProduct
}

function extractOpenFoodFactsProduct(payload: unknown): OpenFoodFactsProduct | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>

  if (record.status === 0) {
    return null
  }

  if (record.product && typeof record.product === 'object') {
    return record.product as OpenFoodFactsProduct
  }

  return null
}

function createCacheRow(
  dto: BarcodeLookupDto,
  providerPayload: ReducedProviderPayload,
  now: Date
): BarcodeCacheRow {
  const expiresAt = new Date(now.getTime() + (dto.found ? FOUND_TTL_MS : NOT_FOUND_TTL_MS))

  return {
    ean: dto.ean,
    normalized_name: dto.found ? dto.itemName : null,
    canonical_category: dto.found ? dto.canonicalCategory : null,
    confidence: dto.found ? dto.confidence : null,
    source: dto.source,
    status: dto.found ? 'found' : 'not_found',
    provider_payload: providerPayload.source === 'not_found' ? null : providerPayload,
    provider_fetched_at: now.toISOString(),
    ai_enriched_at: dto.source.includes('+gemini') ? now.toISOString() : null,
    expires_at: expiresAt.toISOString(),
    brand: dto.brand ?? null,
    image_url: dto.imageUrl ?? null,
  }
}

async function parseRequestBody(request: Request) {
  let body: LookupRequestBody

  try {
    body = (await request.json()) as LookupRequestBody
  } catch {
    throw new HttpError(400, 'Invalid JSON body')
  }

  if (typeof body.ean !== 'string') {
    throw new HttpError(400, 'ean must be a string')
  }

  if (body.listId != null && typeof body.listId !== 'string') {
    throw new HttpError(400, 'listId must be a string when provided')
  }

  const normalizedBarcode = normalizeBarcode(body.ean)

  if (!normalizedBarcode) {
    throw new HttpError(400, 'ean must be a valid barcode')
  }

  return {
    ean: normalizedBarcode,
    listId: body.listId ?? null,
  }
}

function buildGeminiPrompt(payload: ReducedProviderPayload) {
  // Strip brand and image URLs from the Gemini payload — Gemini is only used for
  // name normalization and category resolution; sending image URLs adds token cost
  // with zero benefit (see v2.0-roadmap decision)
  const geminiPayload = {
    ean: payload.ean,
    source: payload.source,
    productName: payload.productName,
    categoryHints: payload.categoryHints,
    providers: {
      kassal: payload.providers.kassal
        ? {
            id: payload.providers.kassal.id,
            name: payload.providers.kassal.name,
            category: payload.providers.kassal.category,
          }
        : null,
      openFoodFacts: payload.providers.openFoodFacts
        ? {
            code: payload.providers.openFoodFacts.code,
            productName: payload.providers.openFoodFacts.productName,
            categoriesTags: payload.providers.openFoodFacts.categoriesTags,
          }
        : null,
    },
  }

  return [
    'Normalize this grocery barcode lookup into one safe shopping DTO.',
    'Return JSON only.',
    `Allowed canonical categories: ${CANONICAL_CATEGORIES.join(', ')}`,
    JSON.stringify(geminiPayload),
  ].join('\n')
}

function createRuntimeDependencies(): Dependencies {
  const supabaseUrl = ensureEnv('SUPABASE_URL')
  const serviceRoleKey = ensureEnv('SUPABASE_SERVICE_ROLE_KEY')
  const kassalApiToken = ensureEnv('KASSAL_API_TOKEN')
  const geminiApiKey = ensureEnv('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return {
    now: () => new Date(),
    validateAuth: async (request) => {
      const token = extractBearerToken(request)
      const userId = decodeJwtSub(token)

      if (!userId) {
        throw new HttpError(401, 'Unauthorized')
      }

      return { userId }
    },
    readCache: async (ean) => {
      const nowIso = new Date().toISOString()
      const { data, error } = await admin
        .from('barcode_product_cache')
        .select(
          'ean, normalized_name, canonical_category, confidence, source, status, provider_payload, provider_fetched_at, ai_enriched_at, expires_at, brand, image_url'
        )
        .eq('ean', ean)
        .gt('expires_at', nowIso)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) return null

      const row = data as BarcodeCacheRow

      // Activation Date Safeguard: if this cache entry predates brand/image support
      // and is missing brand or image_url, discard it to trigger a fresh fetch
      if (
        (row.brand === null || row.image_url === null) &&
        row.provider_fetched_at != null &&
        row.provider_fetched_at < ACTIVATION_DATE
      ) {
        return null
      }

      return cacheRowToLookupDto(row)
    },
    writeCache: async (row) => {
      const { error } = await admin.from('barcode_product_cache').upsert(row, {
        onConflict: 'ean',
      })

      if (error) {
        throw error
      }
    },
    fetchKassalProduct: async (ean) => {
      const response = await fetch(`https://kassal.app/api/v1/products/ean/${ean}`, {
        headers: {
          Authorization: `Bearer ${kassalApiToken}`,
          Accept: 'application/json',
        },
      })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error(`Kassal lookup failed with ${response.status}`)
      }

      return extractKassalProduct(await response.json())
    },
    fetchOpenFoodFactsProduct: async (ean) => {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${ean}.json`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'HandleAppen/1.0 (barcode-lookup)',
          },
        }
      )

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error(`Open Food Facts lookup failed with ${response.status}`)
      }

      return extractOpenFoodFactsProduct(await response.json())
    },
    enrichWithGemini: async (payload) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildGeminiPrompt(payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                required: ['itemName', 'canonicalCategory', 'confidence'],
                properties: {
                  itemName: { type: 'STRING' },
                  canonicalCategory: {
                    type: 'STRING',
                    enum: [...CANONICAL_CATEGORIES],
                  },
                  confidence: { type: 'NUMBER' },
                  found: { type: 'BOOLEAN' },
                },
              },
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini enrichment failed with ${response.status}`)
      }

      const data = (await response.json()) as Record<string, unknown>
      const text = (((data.candidates as Array<Record<string, unknown>> | undefined)?.[0]
        ?.content as Record<string, unknown> | undefined)?.parts as Array<Record<string, unknown>> | undefined)?.[0]
        ?.text

      if (typeof text !== 'string') {
        return null
      }

      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    },
  }
}

export async function handleBarcodeLookupRequest(
  request: Request,
  dependencies?: Dependencies
) {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const deps = dependencies ?? createRuntimeDependencies()

  try {
    await deps.validateAuth(request)

    const { ean } = await parseRequestBody(request)
    const cached = await deps.readCache(ean)

    if (cached) {
      return json(200, cached)
    }

    const kassalProduct = await deps.fetchKassalProduct(ean)
    const openFoodFactsProduct = isKassalProductUsable(kassalProduct)
      ? null
      : await deps.fetchOpenFoodFactsProduct(ean)

    const providerPayload = buildReducedProviderPayload({
      ean,
      kassalProduct,
      openFoodFactsProduct,
    })

    let dto = providerPayload.source === 'not_found'
      ? createNotFoundLookup(ean)
      : fallbackLookupFromProviderPayload(providerPayload)

    if (providerPayload.source !== 'not_found') {
      const geminiResult = validateGeminiResponse(
        await deps.enrichWithGemini(providerPayload)
      )

      if (geminiResult) {
        dto = applyGeminiResult(providerPayload, geminiResult)
      }
    }

    await deps.writeCache(createCacheRow(dto, providerPayload, deps.now()))

    return json(200, dto)
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, { error: error.message })
    }

    console.error('barcode-lookup failed', error)
    return json(500, { error: 'Barcode lookup failed' })
  }
}

if (import.meta.main) {
  Deno.serve((request) => handleBarcodeLookupRequest(request))
}
