<script lang="ts">
  import { swipeLeft } from '$lib/actions/swipe'
  import { offlineStore } from '$lib/stores/offline.svelte'
  import { onDestroy } from 'svelte'

  interface Props {
    item: { id: string; name: string; quantity: number | null; is_checked: boolean }
    onToggle: () => void
    onDelete: () => void
    onIncrement: () => void
    onDecrement: () => void
    onLongPress?: () => void
  }

  let { item, onToggle, onDelete, onIncrement, onDecrement, onLongPress }: Props = $props()
  let isOnline = $derived(offlineStore.isOnline)
  const displayQuantity = $derived(item.quantity ?? 1)

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

  function swallowPointer(event: PointerEvent) {
    event.stopPropagation()
  }

  function swallowClick(event: MouseEvent) {
    event.stopPropagation()
  }

  function handleIncrement(event: MouseEvent) {
    event.stopPropagation()
    onIncrement()
  }

  function handleDecrement(event: MouseEvent) {
    event.stopPropagation()
    onDecrement()
  }
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
    <div class="flex min-w-0 flex-1 items-center gap-3">
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

      <!-- Item name -->
      <span class="min-w-0 flex-1 truncate font-medium {item.is_checked ? 'text-gray-400 line-through' : 'text-gray-900'}">
        {item.name}
      </span>
    </div>

    <div
      class="flex flex-shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1"
      data-testid="item-stepper"
      onpointerdown={swallowPointer}
      onclick={swallowClick}
    >
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-300"
        aria-label={`Reduser antall for ${item.name}`}
        data-testid="item-decrement"
        onclick={handleDecrement}
        disabled={!isOnline}
      >
        -
      </button>
      <span class="min-w-7 text-center text-sm font-semibold text-gray-900" data-testid="item-quantity">
        {displayQuantity}
      </span>
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-300"
        aria-label={`Øk antall for ${item.name}`}
        data-testid="item-increment"
        onclick={handleIncrement}
        disabled={!isOnline}
      >
        +
      </button>
    </div>
  </div>
</div>
