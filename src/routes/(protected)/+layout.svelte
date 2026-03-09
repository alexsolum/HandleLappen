<script lang="ts">
  import { goto } from '$app/navigation'

  let { data, children } = $props()

  let signingOut = $state(false)
  let error = $state<string | null>(null)

  async function handleSignOut() {
    signingOut = true
    error = null

    const { error: signOutError } = await data.supabase.auth.signOut()

    signingOut = false

    if (signOutError) {
      error = 'Kunne ikke logge ut. Prøv igjen.'
      return
    }

    await goto('/logg-inn')
  }
</script>

<div class="min-h-screen bg-gray-50">
  <header class="border-b border-gray-200 bg-white px-4 py-3">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4">
      <a href="/" class="text-lg font-semibold text-green-700">HandleAppen</a>
      <button
        type="button"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? 'Logger ut…' : 'Logg ut'}
      </button>
    </div>
    {#if error}
      <p class="mx-auto mt-2 max-w-5xl text-sm text-red-600">{error}</p>
    {/if}
  </header>

  <main>
    {@render children()}
  </main>
</div>
