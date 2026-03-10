import type { Action } from 'svelte/action'

interface SwipeOptions {
  onDelete: () => void
  revealWidth?: number // default 80
  threshold?: number // default 60 (px to commit delete)
}

// Minimum horizontal movement (px) before we commit to treating the gesture
// as a swipe and take pointer capture. Keeping this small (8px) means normal
// taps never trigger capture, so child <a> elements still receive the click
// event and SvelteKit navigation works normally.
const DRAG_INTENT_PX = 8

export const swipeLeft: Action<HTMLElement, SwipeOptions> = (node, options) => {
  const { onDelete, revealWidth = 80, threshold = 60 } = options ?? {}
  let startX = 0
  let currentX = 0
  let dragging = false
  let captured = false
  let pointerId = -1

  function onPointerDown(e: PointerEvent) {
    startX = e.clientX
    currentX = 0
    dragging = true
    captured = false
    pointerId = e.pointerId
    // Do NOT call setPointerCapture here — doing so on every pointerdown
    // causes the synthesised click event to fire on this div rather than on
    // the child <a>, breaking navigation on a simple tap. Capture is deferred
    // until we detect genuine horizontal drag intent (see onPointerMove).
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    const dx = Math.min(0, e.clientX - startX) // left-only

    // Commit to swipe mode once movement exceeds intent threshold.
    if (!captured && Math.abs(dx) >= DRAG_INTENT_PX) {
      node.setPointerCapture(pointerId)
      captured = true
    }

    if (!captured) return // not swiping yet — let normal events pass through

    currentX = Math.max(-revealWidth, dx)
    node.style.transform = `translateX(${currentX}px)`
  }

  function onPointerUp() {
    dragging = false
    captured = false
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
