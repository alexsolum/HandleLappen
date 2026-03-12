import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession()

  if (!user) {
    throw redirect(303, '/logg-inn')
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .order('created_at', { ascending: true })

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  let inviteCode: string | null = null
  if (myProfile?.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('invite_code')
      .eq('id', myProfile.household_id)
      .single()

    inviteCode = household?.invite_code ?? null
  }

  return {
    members: members ?? [],
    inviteCode,
    currentUserId: user.id,
  }
}