import type { SupabaseClient } from '@supabase/supabase-js'

type SessionCountResult = number | null

type FrequencyRow = {
  item_name: string
  purchase_count: number
  last_checked_at: string
}

type CopurchaseRow = {
  item_name: string
  purchase_count: number
  paired_with: string | null
  last_checked_at: string
}

type ListRow = {
  id: string
  name: string
}

export type RecommendationItem = {
  itemName: string
  purchaseCount: number
  lastCheckedAt: string
  reason: string
  source: 'co-purchase' | 'frequency'
}

export type RecommendationsResult = {
  activeListId: string | null
  activeListName: string | null
  isColdStart: boolean
  needsListPrompt: boolean
  sessionCount: number
  items: RecommendationItem[]
}

const MIN_RECOMMENDATION_SESSIONS = 10

function normalizeLabel(value: string) {
  return value.trim()
}

export async function createRecommendationsQuery(
  supabase: SupabaseClient,
  activeListId: string | null
): Promise<RecommendationsResult> {
  const [{ data: sessionCountData, error: sessionCountError }, activeListResult] = await Promise.all([
    supabase.rpc('history_session_count'),
    activeListId
      ? supabase.from('lists').select('id, name').eq('id', activeListId).single()
      : Promise.resolve({ data: null as ListRow | null, error: null }),
  ])

  if (sessionCountError) {
    throw sessionCountError
  }

  if (activeListResult.error) {
    throw activeListResult.error
  }

  const sessionCount = Number((sessionCountData as SessionCountResult) ?? 0)
  const activeList = activeListResult.data as ListRow | null

  if (sessionCount < MIN_RECOMMENDATION_SESSIONS) {
    return {
      activeListId: activeList?.id ?? null,
      activeListName: activeList?.name ?? null,
      isColdStart: true,
      needsListPrompt: false,
      sessionCount,
      items: [],
    }
  }

  if (!activeList) {
    return {
      activeListId: null,
      activeListName: null,
      isColdStart: false,
      needsListPrompt: true,
      sessionCount,
      items: [],
    }
  }

  const [{ data: frequencyData, error: frequencyError }, { data: copurchaseData, error: copurchaseError }] =
    await Promise.all([
      supabase.rpc('frequency_recommendations', { p_limit: 8 }),
      supabase.rpc('copurchase_recommendations', { p_list_id: activeList.id, p_limit: 4 }),
    ])

  if (frequencyError) {
    throw frequencyError
  }

  if (copurchaseError) {
    throw copurchaseError
  }

  const seen = new Set<string>()
  const items: RecommendationItem[] = []

  for (const row of (copurchaseData ?? []) as CopurchaseRow[]) {
    const itemName = normalizeLabel(row.item_name)
    const key = itemName.toLowerCase()

    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      itemName,
      purchaseCount: row.purchase_count,
      lastCheckedAt: row.last_checked_at,
      reason: row.paired_with ? `Kjøpes med ${normalizeLabel(row.paired_with)}` : 'Kjøpes sammen',
      source: 'co-purchase',
    })
  }

  for (const row of (frequencyData ?? []) as FrequencyRow[]) {
    const itemName = normalizeLabel(row.item_name)
    const key = itemName.toLowerCase()

    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      itemName,
      purchaseCount: row.purchase_count,
      lastCheckedAt: row.last_checked_at,
      reason: 'Ofte kjøpt',
      source: 'frequency',
    })
  }

  return {
    activeListId: activeList.id,
    activeListName: activeList.name,
    isColdStart: false,
    needsListPrompt: false,
    sessionCount,
    items: items.slice(0, 8),
  }
}
