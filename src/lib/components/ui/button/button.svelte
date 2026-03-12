<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'

  let {
    variant = 'default',
    class: className = '',
    type = 'button',
    onclick,
    children,
    ...rest
  }: HTMLButtonAttributes & { variant?: 'default' | 'outline' } = $props()

  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
  const variants = {
    default: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  }
</script>

<button type={type} class={`${base} ${variants[variant]} ${className}`} onclick={onclick} {...rest}>
  {@render children?.()}
</button>
