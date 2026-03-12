import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, url }) => {
  const { user } = await safeGetSession()

  if (!user) {
    throw redirect(303, `/logg-inn?next=${encodeURIComponent(url.pathname)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.household_id) {
    throw redirect(303, '/velkommen')
  }

  return { user, householdId: profile.household_id }
}