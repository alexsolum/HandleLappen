import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function getAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin test helpers')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type HistorySeed = {
  listId: string
  itemName: string
  checkedBy: string
  checkedAt: string
  listName?: string | null
  storeId?: string | null
  storeName?: string | null
}

export async function createHistoryEntry(seed: HistorySeed) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('item_history')
    .insert({
      list_id: seed.listId,
      item_name: seed.itemName,
      checked_by: seed.checkedBy,
      checked_at: seed.checkedAt,
      list_name: seed.listName ?? null,
      store_id: seed.storeId ?? null,
      store_name: seed.storeName ?? null,
    })
    .select('id, list_id, item_name, checked_at')
    .single()

  if (error) throw error
  return data
}

type HistorySessionSeed = {
  checkedAt: string
  items: Array<{
    itemName: string
    checkedBy: string
    listName?: string | null
    storeId?: string | null
    storeName?: string | null
  }>
}

export async function createHistorySessions(listId: string, sessions: HistorySessionSeed[]) {
  for (const session of sessions) {
    for (const item of session.items) {
      await createHistoryEntry({
        listId,
        itemName: item.itemName,
        checkedBy: item.checkedBy,
        checkedAt: session.checkedAt,
        listName: item.listName ?? null,
        storeId: item.storeId ?? null,
        storeName: item.storeName ?? null,
      })
    }
  }
}

export async function clearHistoryForList(listId: string) {
  const admin = getAdminClient()
  await admin.from('item_history').delete().eq('list_id', listId)
}
