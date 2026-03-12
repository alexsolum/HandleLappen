// @ts-nocheck
/// <reference lib="deno.ns" />

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  mapBarcodeLookupResult,
  resolveCanonicalCategoryId,
  type BarcodeLookupDto,
} from '../barcode/lookup.ts'

Deno.test('resolveCanonicalCategoryId maps canonical categories to seeded household names', () => {
  const categories = [
    { id: 'cat-1', name: 'Frukt og grønt' },
    { id: 'cat-2', name: 'Drikke' },
  ]

  assertEquals(resolveCanonicalCategoryId(categories, 'drikke'), 'cat-2')
  assertEquals(resolveCanonicalCategoryId(categories, 'frukt_og_gront'), 'cat-1')
  assertEquals(resolveCanonicalCategoryId(categories, 'meieri_og_egg'), null)
})

Deno.test('mapBarcodeLookupResult returns a found sheet DTO with mapped category metadata', () => {
  const dto: BarcodeLookupDto = {
    ean: '7044610878304',
    found: true,
    itemName: 'Pepsi Max 1,5 L',
    canonicalCategory: 'drikke',
    confidence: 0.92,
    source: 'kassal+gemini',
  }

  const result = mapBarcodeLookupResult(dto, [{ id: 'cat-2', name: 'Drikke' }])

  assertEquals(result, {
    state: 'found',
    ean: '7044610878304',
    itemName: 'Pepsi Max 1,5 L',
    quantity: 1,
    categoryId: 'cat-2',
    canonicalCategory: 'drikke',
    confidence: 0.92,
    source: 'kassal+gemini',
  })
})

Deno.test('mapBarcodeLookupResult returns a single not-found DTO ready for manual recovery', () => {
  const dto: BarcodeLookupDto = {
    ean: '12345678',
    found: false,
    itemName: null,
    canonicalCategory: null,
    confidence: null,
    source: 'not_found',
  }

  const result = mapBarcodeLookupResult(dto, [{ id: 'cat-2', name: 'Drikke' }])

  assertEquals(result, {
    state: 'not_found',
    ean: '12345678',
    itemName: '',
    quantity: 1,
    categoryId: null,
    canonicalCategory: null,
    confidence: null,
    source: 'not_found',
  })
})
