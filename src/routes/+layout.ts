import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import type { LayoutLoad } from './$types'
import type { Database } from '$lib/types/database'

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  depends('supabase:auth')

  const supabase = isBrowser()
    ? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        global: { fetch },
        cookies: {
          getAll() {
            const cookies: { name: string; value: string }[] = []
            if (typeof document !== 'undefined') {
              document.cookie.split('; ').forEach((c) => {
                const [name, ...rest] = c.split('=')
                cookies.push({ name, value: rest.join('=') })
              })
            }
            return cookies
          },
          setAll(cookiesToSet) {
            if (typeof document !== 'undefined') {
              cookiesToSet.forEach(({ name, value, options }) => {
                const cookieStr = `${name}=${value}; path=${options?.path || '/'}${
                  options?.maxAge ? `; max-age=${options.maxAge}` : ''
                }${options?.expires ? `; expires=${options.expires.toUTCString()}` : ''}${
                  options?.secure ? '; secure' : ''
                }${options?.sameSite ? `; samesite=${options.sameSite}` : ''}`
                document.cookie = cookieStr
              })
            }
          },
        },
      })
    : createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        global: { fetch },
        cookies: { getAll: () => data.cookies },
      })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return { supabase, session, user: data.user }
}