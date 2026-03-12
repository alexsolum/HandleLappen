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

    const householdId = crypto.randomUUID()
    const { error: householdError } = await supabase.from('households').insert({
      id: householdId,
      name,
    })

    if (householdError) {
      console.error('createHousehold: households insert failed', {
        message: householdError.message,
        details: householdError.details,
        hint: householdError.hint,
        code: householdError.code,
      })
      return fail(500, { createError: 'Kunne ikke opprette husstand. Prøv igjen.', name })
    }

    const { error: seedError } = await supabase.rpc('seed_default_categories', {
      p_household_id: householdId,
    })

    if (seedError) {
      console.error('createHousehold: seed_default_categories failed', {
        message: seedError.message,
        details: seedError.details,
        hint: seedError.hint,
        code: seedError.code,
      })
    }

    const profilePayload = {
      id: user.id,
      household_id: householdId,
      display_name: user.user_metadata?.full_name ?? user.email ?? 'Ukjent',
    }

    const { error: profileInsertError } = await supabase.from('profiles').insert(profilePayload)

    if (profileInsertError) {
      if (profileInsertError.code === '23505') {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            household_id: householdId,
            display_name: profilePayload.display_name,
          })
          .eq('id', user.id)

        if (profileUpdateError) {
          console.error('createHousehold: profiles update failed after duplicate insert', {
            message: profileUpdateError.message,
            details: profileUpdateError.details,
            hint: profileUpdateError.hint,
            code: profileUpdateError.code,
          })
          return fail(500, { createError: 'Kunne ikke knytte profil til husstand. Prøv igjen.', name })
        }
      } else {
        console.error('createHousehold: profiles insert failed', {
          message: profileInsertError.message,
          details: profileInsertError.details,
          hint: profileInsertError.hint,
          code: profileInsertError.code,
        })
        return fail(500, { createError: 'Kunne ikke knytte profil til husstand. Prøv igjen.', name })
      }
    }

    throw redirect(303, '/')
  },

  joinHousehold: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession()
    if (!user) {
      throw redirect(303, '/logg-inn')
    }

    const formData = await request.formData()
    const code = String(formData.get('code') ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')

    if (!code) {
      return fail(400, { joinError: 'Invitasjonskode er påkrevd' })
    }

    const { data: household, error } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', code)
      .single()

    if (error || !household) {
      if (error) {
        console.error('joinHousehold: household lookup failed', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          inviteCode: code,
        })
      }
      return fail(404, { joinError: 'Fant ingen husstand med den koden. Sjekk koden og prøv igjen.' })
    }

    const joinProfilePayload = {
      id: user.id,
      household_id: household.id,
      display_name: user.user_metadata?.full_name ?? user.email ?? 'Ukjent',
    }

    const { error: joinProfileInsertError } = await supabase.from('profiles').insert(joinProfilePayload)

    if (joinProfileInsertError) {
      if (joinProfileInsertError.code === '23505') {
        const { error: joinProfileUpdateError } = await supabase
          .from('profiles')
          .update({
            household_id: household.id,
            display_name: joinProfilePayload.display_name,
          })
          .eq('id', user.id)

        if (joinProfileUpdateError) {
          console.error('joinHousehold: profiles update failed after duplicate insert', {
            message: joinProfileUpdateError.message,
            details: joinProfileUpdateError.details,
            hint: joinProfileUpdateError.hint,
            code: joinProfileUpdateError.code,
          })
          return fail(500, { joinError: 'Kunne ikke bli med i husstand. Prøv igjen.' })
        }
      } else {
        console.error('joinHousehold: profiles insert failed', {
          message: joinProfileInsertError.message,
          details: joinProfileInsertError.details,
          hint: joinProfileInsertError.hint,
          code: joinProfileInsertError.code,
        })
        return fail(500, { joinError: 'Kunne ikke bli med i husstand. Prøv igjen.' })
      }
    }

    throw redirect(303, '/')
  },
}
