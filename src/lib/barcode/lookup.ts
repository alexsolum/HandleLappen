export type CanonicalCategory =
  | 'frukt_og_gront'
  | 'urter_og_ferdigkuttede_gronnsaker'
  | 'brod_og_bakervarer'
  | 'frokostblanding_og_havregryn'
  | 'meieriprodukter'
  | 'ost'
  | 'egg'
  | 'ferskt_kjott'
  | 'kylling_og_kalkun'
  | 'fisk_og_sjomat'
  | 'ferdigretter_og_delikatesse'
  | 'frysevarer'
  | 'pasta_ris_og_kornprodukter'
  | 'bakevarer_og_bakeingredienser'
  | 'hermetikk_og_glassvarer'
  | 'sauser_og_matoljer'
  | 'krydder'
  | 'snacks'
  | 'sjokolade_og_godteri'
  | 'drikkevarer'
  | 'kaffe_og_te'
  | 'ol_og_cider'
  | 'husholdningsartikler'
  | 'personlig_hygiene'
  | 'dyremat'

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
  urter_og_ferdigkuttede_gronnsaker: ['Urter og ferdigkuttede grønnsaker'],
  brod_og_bakervarer: ['Brød og bakervarer', 'Brød og bakevarer', 'Brod og bakervarer', 'Brod og bakevarer'],
  frokostblanding_og_havregryn: ['Frokostblanding og havregryn'],
  meieriprodukter: ['Meieriprodukter', 'Meieri og egg'],
  ost: ['Ost'],
  egg: ['Egg'],
  ferskt_kjott: ['Ferskt kjøtt', 'Ferskt kjott'],
  kylling_og_kalkun: ['Kylling og kalkun'],
  fisk_og_sjomat: ['Fisk og sjømat', 'Fisk og sjomat', 'Kjøtt og fisk', 'Kjott og fisk'],
  ferdigretter_og_delikatesse: ['Ferdigretter og delikatesse', 'Pålegg og kjøtt', 'Palegg og kjott'],
  frysevarer: ['Frysevarer', 'Kjøl og frys', 'Kjol og frys'],
  pasta_ris_og_kornprodukter: ['Pasta, ris og kornprodukter', 'Pasta, ris og korn', 'Pasta ris og korn'],
  bakevarer_og_bakeingredienser: ['Bakevarer og bakeingredienser'],
  hermetikk_og_glassvarer: ['Hermetikk og glassvarer', 'Hermetikk og glass'],
  sauser_og_matoljer: ['Sauser og matoljer'],
  krydder: ['Krydder'],
  snacks: ['Snacks', 'Snacks og godteri'],
  sjokolade_og_godteri: ['Sjokolade og godteri'],
  drikkevarer: ['Drikkevarer', 'Drikke'],
  kaffe_og_te: ['Kaffe og te'],
  ol_og_cider: ['Øl og cider', 'Ol og cider'],
  husholdningsartikler: ['Husholdningsartikler', 'Rengjøring', 'Rengjoring'],
  personlig_hygiene: ['Personlig hygiene', 'Helse og hygiene'],
  dyremat: ['Dyremat'],
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
