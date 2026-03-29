<script lang="ts">
  import { CHAIN_COLORS } from '$lib/utils/stores'

  interface Props {
    storeName: string
    chain: string | null
    onDismiss: () => void
  }

  let { storeName, chain, onDismiss }: Props = $props()

  const DARK_TEXT_CHAINS = new Set(['Coop Extra', 'Joker'])

  const bgColor = $derived(chain && CHAIN_COLORS[chain] ? CHAIN_COLORS[chain] : '#374151')
  const textColor = $derived(chain && DARK_TEXT_CHAINS.has(chain) ? '#000000' : '#ffffff')
</script>

{#if storeName}
  <div
    class="flex items-center justify-between rounded-xl px-4 py-3"
    style="background-color: {bgColor}; color: {textColor};"
    role="status"
    aria-label="Handletur aktiv: {storeName}"
  >
    <span class="font-semibold text-sm">{storeName}</span>
    <button
      type="button"
      aria-label="Avslutt handletur"
      onclick={onDismiss}
      style="color: {textColor};"
      class="ml-3 flex-shrink-0 rounded p-1 opacity-80 hover:opacity-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}
