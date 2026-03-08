<script lang="ts">
  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'

  let { data } = $props()

  let email = $state('')
  let password = $state('')
  let confirmPassword = $state('')
  let error = $state<string | null>(null)
  let loading = $state(false)

  async function handleSignUp() {
    if (password !== confirmPassword) {
      error = 'Passordene stemmer ikke overens'
      return
    }

    if (password.length < 6) {
      error = 'Passordet må være minst 6 tegn'
      return
    }

    loading = true
    error = null

    const { error: authError } = await data.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    loading = false
    if (authError) {
      error = 'Kunne ikke opprette konto. Prøv igjen.'
      return
    }

    goto('/velkommen')
  }

  async function handleGoogleSignIn() {
    await data.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-green-700">HandleAppen</h1>
      <p class="text-gray-500 mt-1">Opprett en ny konto</p>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      {#if error}
        <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      {/if}

      <div class="space-y-3">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-post</label>
          <Input id="email" type="email" bind:value={email} placeholder="din@epost.no" autocomplete="email" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Passord</label>
          <Input id="password" type="password" bind:value={password} placeholder="Minst 6 tegn" autocomplete="new-password" />
        </div>
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Bekreft passord</label>
          <Input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="••••••••" autocomplete="new-password" />
        </div>
      </div>

      <Button onclick={handleSignUp} disabled={loading} class="w-full">
        {loading ? 'Oppretter konto…' : 'Opprett konto'}
      </Button>

      <div class="relative">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
        <div class="relative flex justify-center text-xs text-gray-400"><span class="bg-white px-2">eller</span></div>
      </div>

      <Button variant="outline" onclick={handleGoogleSignIn} class="w-full">
        Fortsett med Google
      </Button>
    </div>

    <p class="text-center text-sm text-gray-500 mt-4">
      Har du allerede konto? <a href="/logg-inn" class="text-green-600 hover:underline font-medium">Logg inn</a>
    </p>
  </div>
</div>