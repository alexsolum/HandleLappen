import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const PUBLISHABLE_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function getAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin test helpers')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createAuthenticatedTestClient(email: string, password: string) {
  if (!PUBLISHABLE_KEY) {
    throw new Error('PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for remembered-item tests')
  }

  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error

  return client
}

type RememberedSeed = {
  householdId: string
  name: string
  categoryId?: string | null
  useCount?: number
  lastUsedAt?: string
}

export async function seedRememberedItem(seed: RememberedSeed) {
  const admin = getAdminClient()
  const normalizedName = seed.name.trim().toLowerCase().replace(/\s+/g, ' ')
  const { data, error } = await admin
    .from('household_item_memory')
    .upsert(
      {
        household_id: seed.householdId,
        normalized_name: normalizedName,
        display_name: seed.name.trim(),
        last_category_id: seed.categoryId ?? null,
        use_count: seed.useCount ?? 1,
        last_used_at: seed.lastUsedAt ?? new Date().toISOString(),
      },
      { onConflict: 'household_id,normalized_name' }
    )
    .select('id, household_id, normalized_name, display_name, last_category_id, use_count, last_used_at')
    .single()

  if (error) throw error
  return data
}

export async function clearRememberedItems(householdId: string) {
  const admin = getAdminClient()
  await admin.from('household_item_memory').delete().eq('household_id', householdId)
}
