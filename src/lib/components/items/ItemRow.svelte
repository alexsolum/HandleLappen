<script lang="ts">
  import { swipeLeft } from '$lib/actions/swipe'
  import { offlineStore } from '$lib/stores/offline.svelte'
  import { onDestroy } from 'svelte'

  interface Props {
    item: { id: string; name: string; quantity: number | null; is_checked: boolean }
    onToggle: () => void
    onDelete: () => void
    onLongPress?: () => void
  }

  let { item, onToggle, onDelete, onLongPress }: Props = $props()
  let isOnline = $derived(offlineStore.isOnline)

  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let cleanupMove: (() => void) | null = null
  let didLongPress = false

  const LONG_PRESS_MS = 500
  const MOVE_CANCEL_PX = 8

  function clearMoveListener() {
    if (cleanupMove) {
      cleanupMove()
      cleanupMove = null
    }
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function startLongPress(event: PointerEvent) {
    cancelLongPress()
    clearMoveListener()
    didLongPress = false

    const startX = event.clientX
    const startY = event.clientY

    function cancelOnMove(moveEvent: PointerEvent) {
      const dx = Math.abs(moveEvent.clientX - startX)
      const dy = Math.abs(moveEvent.clientY - startY)

      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        cancelLongPress()
        clearMoveListener()
      }
    }

    longPressTimer = setTimeout(() => {
      didLongPress = true
      longPressTimer = null
      clearMoveListener()
      onLongPress?.()
    }, LONG_PRESS_MS)

    window.addEventListener('pointermove', cancelOnMove)
    cleanupMove = () => window.removeEventListener('pointermove', cancelOnMove)

    window.addEventListener(
      'pointerup',
      () => {
        cancelLongPress()
        clearMoveListener()
      },
      { once: true }
    )

    window.addEventListener(
      'pointercancel',
      () => {
        cancelLongPress()
        clearMoveListener()
      },
      { once: true }
    )
  }

  function handleClick(event: MouseEvent) {
    if (didLongPress) {
      didLongPress = false
      event.preventDefault()
      event.stopPropagation()
      return
    }

    onToggle()
  }

  onDestroy(() => {
    cancelLongPress()
    clearMoveListener()
  })
</script>

<div class="relative overflow-hidden">
  <!-- Delete badge revealed behind the row on swipe -->
  <div
    class="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500 text-sm font-medium text-white"
    aria-hidden="true"
  >
    Slett
  </div>

  <!-- Row content — translated left on swipe; click calls onToggle -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    use:swipeLeft={{ onDelete: isOnline ? onDelete : () => {} }}
    onpointerdown={startLongPress}
    onclick={handleClick}
    class="relative flex cursor-pointer items-center gap-3 bg-white px-4 py-3"
    style="touch-action: pan-y;"
    role="checkbox"
    aria-checked={item.is_checked}
    data-testid="item-checkbox"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
  >
    <!-- Checkbox indicator -->
    <div
      class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 {item.is_checked
        ? 'border-green-500 bg-green-500'
        : 'border-gray-300'}"
    >
      {#if item.is_checked}
        <svg class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      {/if}
    </div>

    <!-- Item name and quantity -->
    <span class="font-medium {item.is_checked ? 'text-gray-400 line-through' : 'text-gray-900'}">
      {item.name}{item.quantity != null ? ` · ${item.quantity}` : ''}
    </span>
  </div>
</div>
