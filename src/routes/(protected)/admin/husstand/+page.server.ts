import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession()
  if (!user) throw error(401, 'Ikke logget inn')

  // Get current profile to find householdId
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    throw error(404, 'Fant ikke husstand')
  }

  const householdId = profile.household_id

  // Fetch all members in this household
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('household_id', householdId)

  if (membersError) throw error(500, 'Kunne ikke hente medlemmer')

  // Fetch household invite code
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('invite_code')
    .eq('id', householdId)
    .single()

  if (householdError) throw error(500, 'Kunne ikke hente husstandsinformasjon')

  return {
    members,
    inviteCode: household.invite_code,
    currentUserId: user.id
  }
}
