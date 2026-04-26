import { PUBLIC_SUPABASE_URL } from '$env/static/public'

/**
 * Returns a URL suitable for a small product thumbnail.
 *
 * If the source is a Supabase Storage URL we route it through the render-image
 * transform endpoint to fetch a phone-sized (and WebP-encoded) variant. iOS
 * Safari < 16 has flaky AVIF decoding, so we explicitly stick to WebP/origin.
 *
 * External URLs (e.g. Open Food Facts barcode CDNs) are returned unchanged —
 * we don't proxy through a third party here. Add a proxy in front later if
 * needed.
 */
export function transformedProductImage(
  url: string | null | undefined,
  size: number,
): string | null {
  if (!url) return null

  const supabaseOrigin = (() => {
    try {
      return new URL(PUBLIC_SUPABASE_URL).origin
    } catch {
      return ''
    }
  })()

  if (supabaseOrigin && url.startsWith(supabaseOrigin) && url.includes('/storage/v1/object/')) {
    const transformed = url.replace('/storage/v1/object/', '/storage/v1/render/image/')
    const sep = transformed.includes('?') ? '&' : '?'
    // `format=origin` keeps Supabase's default negotiation (WebP for clients
    // that announce it). Avoiding `format=avif` to keep iOS Safari fast.
    return `${transformed}${sep}width=${size}&height=${size}&resize=cover&quality=70&format=origin`
  }

  return url
}
