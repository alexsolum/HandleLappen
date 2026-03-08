<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let { class: className = '', ...rest }: HTMLInputAttributes = $props()
</script>

<input
  class={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${className}`}
  {...rest}
/>