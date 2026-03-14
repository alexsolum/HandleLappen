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

export async function createTestUser(email: string, password: string) {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

export async function createHouseholdUser(email: string, password: string) {
  const adminClient = getAdminClient()
  const user = await createTestUser(email, password)

  const { data: household, error: householdError } = await adminClient
    .from('households')
    .insert({ name: 'Testfamilien' })
    .select('id, invite_code')
    .single()

  if (householdError) throw householdError

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: user.id,
    household_id: household.id,
    display_name: email,
  })

  if (profileError) throw profileError

  return { user, household }
}

export async function deleteTestUser(userId: string) {
  if (!SERVICE_ROLE_KEY) return
  const adminClient = getAdminClient()
  await adminClient.auth.admin.deleteUser(userId)
}

export async function loginUser(page: any, email: string, password: string) {
  await page.goto('/logg-inn', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/', { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
}
