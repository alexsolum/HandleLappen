import { browser } from '$app/environment'

// Svelte transitions and FLIP animations must opt into reduced-motion at runtime.
export const motionPreference = $state({
  reduced: false,
})

if (browser) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.reduced = query.matches

  const updatePreference = (event: MediaQueryListEvent) => {
    motionPreference.reduced = event.matches
  }

  query.addEventListener('change', updatePreference)
}

export function motionDuration(ms: number): number {
  return motionPreference.reduced ? 0 : ms
}
