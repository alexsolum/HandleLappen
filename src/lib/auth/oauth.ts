const DEFAULT_NEXT_PATH = '/'
const INTERNAL_PATH_PATTERN = /^\/(?!\/)/

export function sanitizeOAuthNextPath(next: string | null | undefined, fallback = DEFAULT_NEXT_PATH) {
  if (!next) return fallback

  try {
    const decoded = decodeURIComponent(next)
    return INTERNAL_PATH_PATTERN.test(decoded) ? decoded : fallback
  } catch {
    return fallback
  }
}

export function buildOAuthCallbackUrl(origin: string, next: string | null | undefined, fallback = DEFAULT_NEXT_PATH) {
  const redirectTo = new URL('/auth/callback', origin)
  redirectTo.searchParams.set('next', sanitizeOAuthNextPath(next, fallback))
  return redirectTo
}
