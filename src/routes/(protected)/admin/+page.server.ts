import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut()
    throw redirect(303, '/logg-inn')
  }
}
