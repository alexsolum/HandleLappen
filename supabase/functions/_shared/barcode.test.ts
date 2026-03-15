import { assertEquals, assertStrictEquals } from 'jsr:@std/assert'
import {
  isJunkBrand,
  getOFFImage,
  buildReducedProviderPayload,
  type OpenFoodFactsProduct,
} from './barcode.ts'

// ---------------------------------------------------------------------------
// isJunkBrand
// ---------------------------------------------------------------------------

Deno.test('isJunkBrand — returns null for null input', () => {
  assertStrictEquals(isJunkBrand(null), null)
})

Deno.test('isJunkBrand — returns null for empty string', () => {
  assertStrictEquals(isJunkBrand(''), null)
})

Deno.test('isJunkBrand — returns null for whitespace-only string', () => {
  assertStrictEquals(isJunkBrand('   '), null)
})

Deno.test('isJunkBrand — returns null for "None" (case-insensitive)', () => {
  assertStrictEquals(isJunkBrand('None'), null)
  assertStrictEquals(isJunkBrand('none'), null)
  assertStrictEquals(isJunkBrand('NONE'), null)
})

Deno.test('isJunkBrand — returns null for "N/A" (case-insensitive)', () => {
  assertStrictEquals(isJunkBrand('N/A'), null)
  assertStrictEquals(isJunkBrand('n/a'), null)
})

Deno.test('isJunkBrand — returns null for "Ukjent" (case-insensitive)', () => {
  assertStrictEquals(isJunkBrand('Ukjent'), null)
  assertStrictEquals(isJunkBrand('ukjent'), null)
})

Deno.test('isJunkBrand — returns null for "unknown" (case-insensitive)', () => {
  assertStrictEquals(isJunkBrand('Unknown'), null)
  assertStrictEquals(isJunkBrand('unknown'), null)
})

Deno.test('isJunkBrand — returns null for "na" (case-insensitive)', () => {
  assertStrictEquals(isJunkBrand('na'), null)
  assertStrictEquals(isJunkBrand('NA'), null)
})

Deno.test('isJunkBrand — returns null for "-"', () => {
  assertStrictEquals(isJunkBrand('-'), null)
})

Deno.test('isJunkBrand — returns trimmed brand for valid value', () => {
  assertStrictEquals(isJunkBrand('  Tine  '), 'Tine')
  assertStrictEquals(isJunkBrand('GILDE'), 'GILDE')
  assertStrictEquals(isJunkBrand('Q-Meieriene'), 'Q-Meieriene')
})

// ---------------------------------------------------------------------------
// getOFFImage
// ---------------------------------------------------------------------------

Deno.test('getOFFImage — returns null when no image fields present', () => {
  assertStrictEquals(getOFFImage({}), null)
})

Deno.test('getOFFImage — returns null for empty/whitespace-only strings', () => {
  const product: OpenFoodFactsProduct = {
    image_front_no_small_url: '  ',
    image_front_small_url: '',
    image_small_url: undefined,
    image_thumb_url: null,
  }
  assertStrictEquals(getOFFImage(product), null)
})

Deno.test('getOFFImage — prioritizes image_front_no_small_url first', () => {
  const product: OpenFoodFactsProduct = {
    image_front_no_small_url: 'https://cdn.off.com/no_small.jpg',
    image_front_small_url: 'https://cdn.off.com/front_small.jpg',
    image_small_url: 'https://cdn.off.com/small.jpg',
    image_thumb_url: 'https://cdn.off.com/thumb.jpg',
  }
  assertStrictEquals(getOFFImage(product), 'https://cdn.off.com/no_small.jpg')
})

Deno.test('getOFFImage — falls back to image_front_small_url when no_small is absent', () => {
  const product: OpenFoodFactsProduct = {
    image_front_no_small_url: null,
    image_front_small_url: 'https://cdn.off.com/front_small.jpg',
    image_small_url: 'https://cdn.off.com/small.jpg',
    image_thumb_url: 'https://cdn.off.com/thumb.jpg',
  }
  assertStrictEquals(getOFFImage(product), 'https://cdn.off.com/front_small.jpg')
})

Deno.test('getOFFImage — falls back to image_small_url when higher-priority fields absent', () => {
  const product: OpenFoodFactsProduct = {
    image_small_url: 'https://cdn.off.com/small.jpg',
    image_thumb_url: 'https://cdn.off.com/thumb.jpg',
  }
  assertStrictEquals(getOFFImage(product), 'https://cdn.off.com/small.jpg')
})

Deno.test('getOFFImage — falls back to image_thumb_url as last resort', () => {
  const product: OpenFoodFactsProduct = {
    image_thumb_url: 'https://cdn.off.com/thumb.jpg',
  }
  assertStrictEquals(getOFFImage(product), 'https://cdn.off.com/thumb.jpg')
})

// ---------------------------------------------------------------------------
// buildReducedProviderPayload — brand and image prioritization
// ---------------------------------------------------------------------------

Deno.test('buildReducedProviderPayload — uses Kassal brand over OFf brand', () => {
  const result = buildReducedProviderPayload({
    ean: '7038010014013',
    kassalProduct: { name: 'Lettmelk', brand: 'Tine', image: 'https://kassal.app/img/tine.jpg' },
    openFoodFactsProduct: {
      product_name: 'Lettmelk',
      brands: 'Q-Meieriene',
      image_front_small_url: 'https://cdn.off.com/front.jpg',
    },
  })

  assertStrictEquals(result.brand, 'Tine')
  assertStrictEquals(result.imageUrl, 'https://kassal.app/img/tine.jpg')
})

Deno.test('buildReducedProviderPayload — falls back to OFf brand when Kassal brand is junk', () => {
  const result = buildReducedProviderPayload({
    ean: '7038010014013',
    kassalProduct: { name: 'Lettmelk', brand: 'Ukjent', image: null },
    openFoodFactsProduct: {
      product_name: 'Lettmelk',
      brands: 'Tine',
      image_front_small_url: 'https://cdn.off.com/front.jpg',
    },
  })

  assertStrictEquals(result.brand, 'Tine')
})

Deno.test('buildReducedProviderPayload — falls back to OFf image when Kassal image is null', () => {
  const result = buildReducedProviderPayload({
    ean: '7038010014013',
    kassalProduct: { name: 'Lettmelk', brand: 'Tine', image: null },
    openFoodFactsProduct: {
      product_name: 'Lettmelk',
      image_front_small_url: 'https://cdn.off.com/front.jpg',
    },
  })

  assertStrictEquals(result.imageUrl, 'https://cdn.off.com/front.jpg')
})

Deno.test('buildReducedProviderPayload — brand and imageUrl are null when both providers have none', () => {
  const result = buildReducedProviderPayload({
    ean: '0000000000000',
    kassalProduct: null,
    openFoodFactsProduct: null,
  })

  assertStrictEquals(result.brand, null)
  assertStrictEquals(result.imageUrl, null)
})

Deno.test('buildReducedProviderPayload — includes image in provider sub-objects', () => {
  const result = buildReducedProviderPayload({
    ean: '7038010014013',
    kassalProduct: { name: 'Lettmelk', brand: 'Tine', image: 'https://kassal.app/img/tine.jpg' },
    openFoodFactsProduct: {
      product_name: 'Lettmelk',
      image_front_no_small_url: 'https://cdn.off.com/no_small.jpg',
    },
  })

  assertEquals(result.providers.kassal?.image, 'https://kassal.app/img/tine.jpg')
  assertEquals(result.providers.openFoodFacts?.image, 'https://cdn.off.com/no_small.jpg')
})

Deno.test('buildReducedProviderPayload — filters junk brand in provider kassal sub-object', () => {
  const result = buildReducedProviderPayload({
    ean: '7038010014013',
    kassalProduct: { name: 'Lettmelk', brand: 'N/A' },
    openFoodFactsProduct: null,
  })

  assertStrictEquals(result.providers.kassal?.brand, null)
  assertStrictEquals(result.brand, null)
})
