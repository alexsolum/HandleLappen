import type { Action } from 'svelte/action'

interface SwipeOptions {
  onDelete: () => void
  revealWidth?: number // default 80
  threshold?: number // default 60 (px to commit delete)
}

export const swipeLeft: Action<HTMLElement, SwipeOptions> = (node, options) => {
  const { onDelete, revealWidth = 80, threshold = 60 } = options ?? {}
  let startX = 0
  let currentX = 0
  let dragging = false

  function onPointerDown(e: PointerEvent) {
    startX = e.clientX
    dragging = true
    node.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    const dx = Math.min(0, e.clientX - startX) // left-only
    currentX = Math.max(-revealWidth, dx)
    node.style.transform = `translateX(${currentX}px)`
  }

  function onPointerUp() {
    dragging = false
    if (Math.abs(currentX) >= threshold) {
      onDelete?.()
    }
    // Snap back
    currentX = 0
    node.style.transform = 'translateX(0)'
    node.style.transition = 'transform 0.2s ease'
    setTimeout(() => {
      node.style.transition = ''
    }, 200)
  }

  node.addEventListener('pointerdown', onPointerDown)
  node.addEventListener('pointermove', onPointerMove)
  node.addEventListener('pointerup', onPointerUp)
  node.addEventListener('pointercancel', onPointerUp)

  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointermove', onPointerMove)
      node.removeEventListener('pointerup', onPointerUp)
      node.removeEventListener('pointercancel', onPointerUp)
    },
  }
}
