import {
  assertEquals,
  assertObjectMatch,
} from '@std/assert'
import { handleBarcodeLookupRequest } from './index.ts'
import { buildGeminiNormalizedResponse, buildKassalHit, buildOpenFoodFactsFallbackHit } from '../../../tests/helpers/barcode.ts'
import type { BarcodeCacheRow } from '../_shared/barcode.ts'

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/functions/v1/barcode-lookup', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function createDependencies(overrides: Partial<Parameters<typeof handleBarcodeLookupRequest>[1]> = {}) {
  const writes: BarcodeCacheRow[] = []
  let kassalCalls = 0
  let offCalls = 0
  let geminiCalls = 0

  return {
    writes,
    counters: {
      get kassal() {
        return kassalCalls
      },
      get off() {
        return offCalls
      },
      get gemini() {
        return geminiCalls
      },
    },
    deps: {
      validateAuth: async () => ({ userId: 'user-1' }),
      readCache: async () => null,
      writeCache: async (row: BarcodeCacheRow) => {
        writes.push(row)
      },
      fetchKassalProduct: async () => {
        kassalCalls += 1
        return buildKassalHit().product
      },
      fetchOpenFoodFactsProduct: async () => {
        offCalls += 1
        return buildOpenFoodFactsFallbackHit().product
      },
      enrichWithGemini: async () => {
        geminiCalls += 1
        return buildGeminiNormalizedResponse()
      },
      now: () => new Date('2026-03-10T12:00:00.000Z'),
      ...overrides,
    },
  }
}

Deno.test('cache hit returns normalized DTO without provider fetches', async () => {
  const dependencyContext = createDependencies({
    readCache: async () => ({
      ean: '7044610878304',
      found: true,
      itemName: 'Pepsi Max 1,5 L',
      canonicalCategory: 'drikke',
      confidence: 0.92,
      source: 'cache',
    }),
  })

  const response = await handleBarcodeLookupRequest(
    createRequest({ ean: '7044610878304' }),
    dependencyContext.deps
  )

  assertEquals(response.status, 200)
  assertObjectMatch(await response.json(), {
    ean: '7044610878304',
    source: 'cache',
  })
  assertEquals(dependencyContext.counters.kassal, 0)
  assertEquals(dependencyContext.counters.off, 0)
  assertEquals(dependencyContext.counters.gemini, 0)
})

Deno.test('Kassal hit path returns Gemini-normalized DTO and caches it', async () => {
  const dependencyContext = createDependencies()

  const response = await handleBarcodeLookupRequest(
    createRequest({ ean: '7044610878304' }),
    dependencyContext.deps
  )

  assertEquals(response.status, 200)
  assertObjectMatch(await response.json(), {
    ean: '7044610878304',
    found: true,
    canonicalCategory: 'drikke',
    source: 'kassal+gemini',
  })
  assertEquals(dependencyContext.counters.kassal, 1)
  assertEquals(dependencyContext.counters.off, 0)
  assertEquals(dependencyContext.counters.gemini, 1)
  assertEquals(dependencyContext.writes[0]?.status, 'found')
})

Deno.test('Kassal miss falls back to Open Food Facts before returning one DTO', async () => {
  const dependencyContext = createDependencies({
    fetchKassalProduct: async () => {
      return null
    },
  })

  const response = await handleBarcodeLookupRequest(
    createRequest({ ean: '7044610878304' }),
    dependencyContext.deps
  )

  assertEquals(response.status, 200)
  assertObjectMatch(await response.json(), {
    found: true,
    source: 'open_food_facts+gemini',
  })
  assertEquals(dependencyContext.counters.off, 1)
  assertEquals(dependencyContext.counters.gemini, 1)
})

Deno.test('provider miss produces one normalized not-found response', async () => {
  const dependencyContext = createDependencies({
    fetchKassalProduct: async () => null,
    fetchOpenFoodFactsProduct: async () => null,
  })

  const response = await handleBarcodeLookupRequest(
    createRequest({ ean: '7044610878304' }),
    dependencyContext.deps
  )

  assertEquals(response.status, 200)
  assertObjectMatch(await response.json(), {
    ean: '7044610878304',
    found: false,
    source: 'not_found',
  })
  assertEquals(dependencyContext.counters.gemini, 0)
  assertEquals(dependencyContext.writes[0]?.status, 'not_found')
})

Deno.test('invalid Gemini category falls back to deterministic provider normalization', async () => {
  const dependencyContext = createDependencies({
    enrichWithGemini: async () => ({
      itemName: 'Pepsi Max 1,5 L',
      canonicalCategory: 'ugyldig',
      confidence: 0.95,
    }),
  })

  const response = await handleBarcodeLookupRequest(
    createRequest({ ean: '7044610878304' }),
    dependencyContext.deps
  )

  assertEquals(response.status, 200)
  assertObjectMatch(await response.json(), {
    found: true,
    itemName: 'Pepsi Max 1,5 L',
    canonicalCategory: 'drikke',
    source: 'kassal',
  })
})
