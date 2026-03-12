export type CanonicalCategory =
  | 'frukt_og_gront'
  | 'brod_og_bakevarer'
  | 'palegg_og_kjott'
  | 'meieri_og_egg'
  | 'kjott_og_fisk'
  | 'hermetikk_og_glass'
  | 'pasta_ris_og_korn'
  | 'snacks_og_godteri'
  | 'drikke'
  | 'rengjoring'
  | 'helse_og_hygiene'
  | 'kjol_og_frys'

export type BarcodeLookupDto = {
  ean: string
  found: boolean
  itemName: string | null
  canonicalCategory: CanonicalCategory | null
  confidence: number | null
  source: string
}

export type BarcodeCategoryOption = {
  id: string
  name: string
}

export type BarcodeSheetState = 'found' | 'not_found'

export type BarcodeSheetModel = {
  state: BarcodeSheetState
  ean: string
  itemName: string
  quantity: number
  categoryId: string | null
  canonicalCategory: CanonicalCategory | null
  confidence: number | null
  source: string
}

const CANONICAL_CATEGORY_NAMES: Record<CanonicalCategory, string[]> = {
  frukt_og_gront: ['Frukt og grønt'],
  brod_og_bakevarer: ['Brød og bakevarer', 'Brod og bakevarer'],
  palegg_og_kjott: ['Pålegg og kjøtt', 'Palegg og kjott'],
  meieri_og_egg: ['Meieri og egg'],
  kjott_og_fisk: ['Kjøtt og fisk', 'Kjott og fisk'],
  hermetikk_og_glass: ['Hermetikk og glass'],
  pasta_ris_og_korn: ['Pasta, ris og korn', 'Pasta ris og korn'],
  snacks_og_godteri: ['Snacks og godteri'],
  drikke: ['Drikke'],
  rengjoring: ['Rengjøring', 'Rengjoring'],
  helse_og_hygiene: ['Helse og hygiene'],
  kjol_og_frys: ['Kjøl og frys', 'Kjol og frys'],
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

export function isBarcodeLookupDto(value: unknown): value is BarcodeLookupDto {
  if (!value || typeof value !== 'object') return false

  const row = value as Record<string, unknown>

  return (
    typeof row.ean === 'string' &&
    typeof row.found === 'boolean' &&
    typeof row.source === 'string' &&
    (typeof row.itemName === 'string' || row.itemName == null) &&
    (typeof row.canonicalCategory === 'string' || row.canonicalCategory == null) &&
    (typeof row.confidence === 'number' || row.confidence == null)
  )
}

export function resolveCanonicalCategoryId(
  categories: BarcodeCategoryOption[],
  canonicalCategory: CanonicalCategory | null
) {
  if (!canonicalCategory) return null

  const allowedNames = CANONICAL_CATEGORY_NAMES[canonicalCategory].map(normalizeLabel)

  return (
    categories.find((category) => allowedNames.includes(normalizeLabel(category.name)))?.id ?? null
  )
}

export function mapBarcodeLookupResult(
  dto: BarcodeLookupDto,
  categories: BarcodeCategoryOption[]
): BarcodeSheetModel {
  return {
    state: dto.found ? 'found' : 'not_found',
    ean: dto.ean,
    itemName: dto.itemName ?? '',
    quantity: 1,
    categoryId: resolveCanonicalCategoryId(categories, dto.canonicalCategory),
    canonicalCategory: dto.canonicalCategory,
    confidence: dto.confidence,
    source: dto.source,
  }
}
