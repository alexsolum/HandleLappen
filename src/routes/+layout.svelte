<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'

  let { data, children } = $props()

  onMount(() => {
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

{@render children()}