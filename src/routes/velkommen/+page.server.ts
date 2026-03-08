import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession()
  if (!user) {
    throw redirect(303, '/logg-inn')
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile?.household_id) {
    throw redirect(303, '/')
  }

  return {}
}

export const actions: Actions = {
  createHousehold: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession()
    if (!user) {
      throw redirect(303, '/logg-inn')
    }

    const formData = await request.formData()
    const name = String(formData.get('name') ?? '').trim()

    if (!name || name.length < 2) {
      return fail(400, { createError: 'Husstandsnavn må være minst 2 tegn', name })
    }

    if (name.length > 80) {
      return fail(400, { createError: 'Husstandsnavn er for langt (maks 80 tegn)', name })
    }

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name })
      .select('id')
      .single()

    if (householdError || !household) {
      return fail(500, { createError: 'Kunne ikke opprette husstand. Prøv igjen.', name })
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      household_id: household.id,
      display_name: user.user_metadata?.full_name ?? user.email ?? 'Ukjent',
    })

    if (profileError) {
      return fail(500, { createError: 'Kunne ikke knytte profil til husstand. Prøv igjen.', name })
    }

    throw redirect(303, '/')
  },

  joinHousehold: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession()
    if (!user) {
      throw redirect(303, '/logg-inn')
    }

    const formData = await request.formData()
    const code = String(formData.get('code') ?? '').trim().toUpperCase()

    if (!code) {
      return fail(400, { joinError: 'Invitasjonskode er påkrevd' })
    }

    const { data: household, error } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', code)
      .single()

    if (error || !household) {
      return fail(404, { joinError: 'Fant ingen husstand med den koden. Sjekk koden og prøv igjen.' })
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      household_id: household.id,
      display_name: user.user_metadata?.full_name ?? user.email ?? 'Ukjent',
    })

    if (profileError) {
      return fail(500, { joinError: 'Kunne ikke bli med i husstand. Prøv igjen.' })
    }

    throw redirect(303, '/')
  },
}