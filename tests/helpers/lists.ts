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

export async function createTestList(householdId: string, name = 'Testliste') {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('lists')
    .insert({ household_id: householdId, name })
    .select('id, name, household_id, created_at')
    .single()
  if (error) throw error
  return data
}

export async function createTestItem(
  listId: string,
  name = 'Testitem',
  quantity?: number,
  categoryId?: string | null
) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('list_items')
    .insert({ list_id: listId, name, quantity: quantity ?? null, category_id: categoryId ?? null })
    .select('id, list_id, name, quantity, is_checked, category_id, created_at')
    .single()
  if (error) throw error
  return data
}

export async function deleteTestList(listId: string) {
  if (!SERVICE_ROLE_KEY) return
  const admin = getAdminClient()
  await admin.from('lists').delete().eq('id', listId)
}
