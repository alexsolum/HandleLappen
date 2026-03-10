import { createQuery } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

type StoreRow = {
  id: string
  name: string
}

export function storesQueryKey(householdId: string) {
  return ['stores', householdId]
}

export function createStoresQuery(supabase: SupabaseClient, householdId: string) {
  return createQuery(() => ({
    queryKey: storesQueryKey(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      return (data ?? []) as StoreRow[]
    },
  }))
}
