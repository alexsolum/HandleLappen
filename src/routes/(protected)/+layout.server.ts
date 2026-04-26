import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, url }) => {
  // Fire the authoritative auth check and the profile fetch in parallel.
  // RLS on `profiles` re-validates the JWT, so the speculative query is safe even if
  // safeGetSession ultimately rejects — the redirect below still runs first.
  const sessionPromise = safeGetSession()
  const sessionData = await supabase.auth.getSession()
  const candidateId = sessionData.data.session?.user.id

  const profilePromise = candidateId
    ? supabase
        .from('profiles')
        .select('household_id, automatic_store_selection_enabled')
        .eq('id', candidateId)
        .maybeSingle()
    : Promise.resolve({ data: null })

  const [{ user }, { data: profile }] = await Promise.all([sessionPromise, profilePromise])

  if (!user) {
    throw redirect(303, `/logg-inn?next=${encodeURIComponent(url.pathname)}`)
  }

  if (!profile?.household_id) {
    throw redirect(303, '/velkommen')
  }

  return {
    user,
    householdId: profile.household_id,
    automaticStoreSelectionEnabled: profile.automatic_store_selection_enabled,
  }
}
