<script lang="ts">
  import { enhance } from '$app/forms'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'

  let { form } = $props()

  let creatingHousehold = $state(false)
  let joiningHousehold = $state(false)
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-green-700">HandleAppen</h1>
      <p class="text-gray-500 mt-1">Kom i gang med din husstand</p>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-1">Opprett husstand</h2>
      <p class="text-sm text-gray-500 mb-4">Gi husstanden et navn, f.eks. "Familie Hansen"</p>

      {#if form?.createError}
        <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{form.createError}</p>
      {/if}

      <form
        method="POST"
        action="?/createHousehold"
        use:enhance={() => {
          creatingHousehold = true
          return async ({ update }) => {
            creatingHousehold = false
            await update()
          }
        }}
        class="space-y-3"
      >
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Husstandsnavn</label>
          <Input id="name" name="name" type="text" value={form?.name ?? ''} placeholder="Familie Hansen" required minlength={2} maxlength={80} />
        </div>
        <Button type="submit" disabled={creatingHousehold} class="w-full">
          {creatingHousehold ? 'Oppretter…' : 'Opprett husstand'}
        </Button>
      </form>
    </div>

    <div class="relative">
      <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
      <div class="relative flex justify-center text-sm text-gray-400"><span class="bg-gray-50 px-3">eller</span></div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-1">Bli med i husstand</h2>
      <p class="text-sm text-gray-500 mb-4">Skriv inn invitasjonskoden du har fått</p>

      {#if form?.joinError}
        <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{form.joinError}</p>
      {/if}

      <form
        method="POST"
        action="?/joinHousehold"
        use:enhance={() => {
          joiningHousehold = true
          return async ({ update }) => {
            joiningHousehold = false
            await update()
          }
        }}
        class="space-y-3"
      >
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700 mb-1">Invitasjonskode</label>
          <Input id="code" name="code" type="text" placeholder="KIWI-4821" class="uppercase tracking-widest" required />
        </div>
        <Button type="submit" variant="outline" disabled={joiningHousehold} class="w-full">
          {joiningHousehold ? 'Kobler til…' : 'Bli med'}
        </Button>
      </form>
    </div>
  </div>
</div>
