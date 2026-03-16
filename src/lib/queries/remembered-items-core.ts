import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'

type RememberedItemRpcRow =
  Database['public']['Functions']['search_household_item_memory']['Returns'][number]

export type RememberedItem = {
  itemName: string
  normalizedName: string
  lastCategoryId: string | null
  useCount: number
  lastUsedAt: string
}

export function normalizeRememberedItemQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function searchRememberedItems(
  supabase: SupabaseClient<Database>,
  query: string,
  householdId: string
): Promise<RememberedItem[]> {
  const normalizedQuery = normalizeRememberedItemQuery(query)
  if (normalizedQuery.length === 0) {
    return []
  }

  const { data, error } = await supabase.rpc('search_household_item_memory', {
    p_household_id: householdId,
    p_search_term: normalizedQuery,
  })

  if (error) {
    throw error
  }

  return ((data ?? []) as RememberedItemRpcRow[]).map((row) => ({
    itemName: row.display_name,
    normalizedName: row.display_name.toLowerCase(),
    lastCategoryId: row.last_category_id,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
  }))
}
