import { createQuery } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'
import {
  normalizeRememberedItemQuery,
  searchRememberedItems,
  type RememberedItem,
} from '$lib/queries/remembered-items-core'

export function rememberedItemsQueryKey(listId: string, query: string) {
  return [...rememberedItemsBaseKey(listId), normalizeRememberedItemQuery(query)]
}

export function rememberedItemsBaseKey(listId: string) {
  return ['remembered-items', listId]
}

export { normalizeRememberedItemQuery, searchRememberedItems, type RememberedItem }

export function createRememberedItemsQuery(
  supabase: SupabaseClient<Database>,
  listId: string,
  getQuery: () => string,
  householdId: string
) {
  return createQuery(() => {
    const query = normalizeRememberedItemQuery(getQuery())

    return {
      queryKey: rememberedItemsQueryKey(listId, query),
      enabled: query.length > 0,
      staleTime: 15_000,
      queryFn: async () => searchRememberedItems(supabase, query, householdId),
    }
  })
}
