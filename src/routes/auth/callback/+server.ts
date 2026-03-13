import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { sanitizeOAuthNextPath } from '$lib/auth/oauth'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')
  const next = sanitizeOAuthNextPath(url.searchParams.get('next'))

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      throw redirect(303, next)
    }
  }

  throw redirect(303, '/auth/error?reason=oauth_callback_failed')
}
