<script lang="ts">
  import '../app.css'
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'

  let { data, children } = $props()

  onMount(() => {
    if ('serviceWorker' in navigator) {
      void import('virtual:pwa-register').then(({ registerSW }) => {
        const updateSW = registerSW({
          immediate: true,
          onRegistered(registration: ServiceWorkerRegistration | undefined) {
            registration?.update().catch(() => {})
          },
        })

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          void updateSW(true)
        })
      })
    }

    const {
      data: { subscription },
    } = data.supabase.auth.onAuthStateChange((event) => {
      if (event !== 'INITIAL_SESSION') {
        invalidate('supabase:auth')
      }
    })

    return () => subscription.unsubscribe()
  })
</script>

<svelte:head>
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#16a34a" />
</svelte:head>

{@render children()}
