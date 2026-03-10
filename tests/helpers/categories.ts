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

export async function createTestCategory(householdId: string, name: string, position: number) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('categories')
    .insert({ household_id: householdId, name, position })
    .select('id, name, position, household_id')
    .single()

  if (error) throw error
  return data
}

export async function seedDefaultCategories(householdId: string) {
  const admin = getAdminClient()
  const { error } = await admin.rpc('seed_default_categories', { p_household_id: householdId })

  if (error) throw error
}

export async function listTestCategories(householdId: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('categories')
    .select('id, name, position, household_id')
    .eq('household_id', householdId)
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function deleteTestCategory(categoryId: string) {
  if (!SERVICE_ROLE_KEY) return
  const admin = getAdminClient()
  await admin.from('categories').delete().eq('id', categoryId)
}

export async function createTestStore(householdId: string, name: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('stores')
    .insert({ household_id: householdId, name })
    .select('id, name')
    .single()

  if (error) throw error

  const { data: categories, error: categoriesError } = await admin
    .from('categories')
    .select('id, position')
    .eq('household_id', householdId)
    .order('position', { ascending: true })

  if (categoriesError) throw categoriesError

  if ((categories ?? []).length > 0) {
    const rows = categories.map((category, index) => ({
      store_id: data.id,
      category_id: category.id,
      position: (index + 1) * 10,
    }))

    const { error: layoutError } = await admin.from('store_layouts').insert(rows)
    if (layoutError) throw layoutError
  }

  return data
}

export async function deleteTestStore(storeId: string) {
  if (!SERVICE_ROLE_KEY) return
  const admin = getAdminClient()
  await admin.from('stores').delete().eq('id', storeId)
}
