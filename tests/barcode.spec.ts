import { expect, test } from '@playwright/test'
import {
  buildGeminiNormalizedResponse,
  buildKassalHit,
  buildNotFoundLookup,
  buildOpenFoodFactsFallbackHit,
} from './helpers/barcode'

test.describe('barcode wave 0', () => {
  test('lookup contract returns the normalized DTO shape', async () => {
    const dto = buildGeminiNormalizedResponse()

    expect(dto).toMatchObject({
      ean: '7044610878304',
      found: true,
      itemName: 'Pepsi Max 1,5 L',
      canonicalCategory: 'drikke',
      confidence: expect.any(Number),
      source: expect.any(String),
    })
  })

  test.skip('fallback path uses Open Food Facts when Kassal misses', async () => {
    const kassal = buildKassalHit()
    const fallback = buildOpenFoodFactsFallbackHit()

    expect(kassal.product.ean).toBe('7044610878304')
    expect(fallback.product.code).toBe('7044610878304')
  })

  test.skip('manual EAN path reuses the same lookup contract', async () => {
    const dto = buildGeminiNormalizedResponse({ source: 'manual+gemini' })
    expect(dto.source).toContain('manual')
  })

  test.skip('scan entry and permission-denied path falls back to manual entry', async () => {
    expect(true).toBe(true)
  })

  test.skip('unified not-found state hides provider-specific failures', async () => {
    const dto = buildNotFoundLookup()
    expect(dto).toMatchObject({
      found: false,
      source: 'not_found',
    })
  })

  test.skip('iOS manual fallback keeps the same confirmation flow', async () => {
    expect(true).toBe(true)
  })
})
