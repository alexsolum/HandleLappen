<script lang="ts">
  import { transformedProductImage } from '$lib/utils/images'

  interface Props {
    imageUrl?: string | null
    size?: number
    class?: string
  }

  let { imageUrl = null, size = 40, class: className = '' }: Props = $props()

  let imgLoaded = $state(false)
  let imgError = $state(false)

  const thumbnailSrc = $derived(transformedProductImage(imageUrl, size * 2))
  const dimensionStyle = $derived(`width: ${size}px; height: ${size}px;`)
  const iconSize = $derived(Math.max(16, Math.round(size * 0.5)))

  $effect(() => {
    void imageUrl
    imgLoaded = false
    imgError = false
  })
</script>

<div class="relative flex-shrink-0 {className}" style={dimensionStyle}>
  {#if thumbnailSrc && !imgError}
    {#if !imgLoaded}
      <div class="absolute inset-0 animate-pulse rounded-full bg-gray-200"></div>
    {/if}
    <img
      src={thumbnailSrc}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      class="h-full w-full rounded-full object-cover {imgLoaded ? 'opacity-100' : 'opacity-0'}"
      onload={() => { imgLoaded = true }}
      onerror={() => { imgError = true }}
    />
  {:else}
    <div class="flex h-full w-full items-center justify-center rounded-full bg-gray-50">
      <svg
        class="text-gray-400"
        style={`width: ${iconSize}px; height: ${iconSize}px;`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    </div>
  {/if}
</div>
