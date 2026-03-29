import { expect, test } from '@playwright/test'
import { createHouseholdUser, deleteTestUser, loginUser } from './helpers/auth'
import {
  clearHomeLocation,
  createAuthenticatedLocationClient,
  seedHomeLocation,
} from './helpers/location'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'

async function attachMemberToHousehold(userId: string, householdId: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for privacy tests')
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.from('profiles').update({ household_id: householdId }).eq('id', userId)
  if (error) throw error
}

test.describe('Home location privacy', () => {
  test('another household member cannot read user_home_locations through direct table access', async () => {
    const password = 'password123'
    const owner = await createHouseholdUser(`home-owner-${Date.now()}@test.example`, password)
    const peer = await createHouseholdUser(`home-peer-${Date.now()}@test.example`, password)

    try {
      await attachMemberToHousehold(peer.user.id, owner.household.id)
      await seedHomeLocation({
        userId: owner.user.id,
        lat: 59.9139,
        lng: 10.7522,
      })

      const peerClient = await createAuthenticatedLocationClient(peer.user.email!, password)
      const { data, error } = await peerClient
        .from('user_home_locations')
        .select('user_id, lat_4dp, lng_4dp')
        .eq('user_id', owner.user.id)

      expect(error).toBeNull()
      expect(data).toEqual([])
    } finally {
      await clearHomeLocation(owner.user.id).catch(() => undefined)
      await deleteTestUser(owner.user.id)
      await deleteTestUser(peer.user.id)
    }
  })

  test('browser-visible household page does not expose another member home coordinates', async ({
    page,
  }) => {
    const password = 'password123'
    const owner = await createHouseholdUser(`home-browser-owner-${Date.now()}@test.example`, password)
    const peer = await createHouseholdUser(`home-browser-peer-${Date.now()}@test.example`, password)

    try {
      await attachMemberToHousehold(peer.user.id, owner.household.id)
      await seedHomeLocation({
        userId: owner.user.id,
        lat: 59.9139,
        lng: 10.7522,
      })

      await loginUser(page, peer.user.email!, password)
      await page.goto('/admin/husstand', { waitUntil: 'networkidle' })

      await expect(page.getByText(owner.user.email!, { exact: false })).toBeVisible()
      await expect(page.getByText('59.9139')).toHaveCount(0)
      await expect(page.getByText('10.7522')).toHaveCount(0)
      await expect(page.getByText(/hjemmeposisjon/i)).toHaveCount(0)
    } finally {
      await clearHomeLocation(owner.user.id).catch(() => undefined)
      await deleteTestUser(owner.user.id)
      await deleteTestUser(peer.user.id)
    }
  })
})
